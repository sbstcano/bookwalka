const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn, exec, execFile } = require('child_process');
const https = require('https');
const http = require('http');
const { extractArchive } = require('./ollama-runtime');

let mainWindow;
let ollamaProcess = null;
let backendProcess = null;
let currentDownloadRequest = null;
let isStopping = false;

// Configuration and Isolated paths
const userDataPath = app.getPath('userData');
const binDir = path.join(userDataPath, 'bin');
const ollamaRuntimeDir = path.join(userDataPath, 'ollama_runtime');
const modelsDir = path.join(userDataPath, 'ollama_models');
const hfCacheDir = path.join(userDataPath, 'hf_cache');

// Ensure directories exist
if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
if (!fs.existsSync(ollamaRuntimeDir)) fs.mkdirSync(ollamaRuntimeDir, { recursive: true });
if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
if (!fs.existsSync(hfCacheDir)) fs.mkdirSync(hfCacheDir, { recursive: true });

const platform = os.platform();
const ollamaBinaryName = platform === 'win32' ? 'ollama.exe' : 'ollama';
const legacyOllamaPath = path.join(binDir, ollamaBinaryName);
const ollamaPath = platform === 'linux'
  ? path.join(ollamaRuntimeDir, 'bin', ollamaBinaryName)
  : path.join(ollamaRuntimeDir, ollamaBinaryName);

// Stable Ollama version release URLs
const OLLAMA_VERSION = 'v0.31.2';
const REQUIRED_OLLAMA_VERSION = OLLAMA_VERSION.slice(1);
const BACKEND_STARTUP_TIMEOUT_MS = 10 * 60 * 1000;
let ollamaDownloadUrl = '';
let ollamaArchiveExtension = '';
if (platform === 'linux') {
  ollamaDownloadUrl = `https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-linux-amd64.tar.zst`;
  ollamaArchiveExtension = 'tar.zst';
} else if (platform === 'darwin') {
  ollamaDownloadUrl = `https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-darwin.tgz`;
  ollamaArchiveExtension = 'tgz';
} else if (platform === 'win32') {
  ollamaDownloadUrl = `https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-windows-amd64.zip`;
  ollamaArchiveExtension = 'zip';
}

function parseVersion(output) {
  const match = String(output || '').match(/(?:version(?: is)?\s+|v)(\d+\.\d+\.\d+)/i);
  return match ? match[1] : null;
}

function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function readOllamaVersion(executablePath) {
  return new Promise((resolve) => {
    execFile(executablePath, ['--version'], { timeout: 5000 }, (error, stdout, stderr) => {
      // Older Ollama versions can print their version to stderr along with a
      // warning when no server is running, so inspect both output streams.
      resolve(parseVersion(`${stdout}\n${stderr}`));
    });
  });
}

async function inspectOllamaInstallation() {
  const candidates = [
    { path: ollamaPath, source: 'managed' },
    { path: legacyOllamaPath, source: 'legacy' }
  ].filter((candidate, index, all) => (
    candidate.path
    && fs.existsSync(candidate.path)
    && all.findIndex((item) => item.path === candidate.path) === index
  ));

  if (candidates.length === 0) {
    return { exists: false, path: null, source: null, version: null, needsUpdate: true };
  }

  const installations = [];
  for (const candidate of candidates) {
    installations.push({
      ...candidate,
      version: await readOllamaVersion(candidate.path)
    });
  }

  const selected = installations.find((installation) => (
    installation.version
    && compareVersions(installation.version, REQUIRED_OLLAMA_VERSION) >= 0
  )) || installations[0];

  return {
    exists: true,
    path: selected.path,
    source: selected.source,
    version: selected.version,
    needsUpdate: !selected.version || compareVersions(selected.version, REQUIRED_OLLAMA_VERSION) < 0
  };
}

function sendLog(source, text) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', {
      timestamp: new Date().toLocaleTimeString(),
      source,
      text: text.toString().trim()
    });
  }
}

function sendStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', status);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 950,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: "Bookwalka Desktop",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', async () => {
  await cleanupProcesses();
  app.quit();
});

// Follow redirects for downloads
function downloadWithRedirect(url, destPath, progressCallback) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let request;
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };

    file.on('finish', () => finish(resolve));
    file.on('error', (err) => finish(reject, err));

    function get(currentUrl) {
      request = https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume();
          return get(response.headers.location);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          return finish(reject, new Error(`Server returned HTTP ${response.statusCode}`));
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (progressCallback && totalSize) {
            progressCallback(downloaded, totalSize);
          }
        });

        response.pipe(file);
      });

      request.on('error', (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        finish(reject, err);
      });
    }

    currentDownloadRequest = {
      abort: () => {
        if (request) request.destroy();
        file.close();
        fs.unlink(destPath, () => {});
        finish(reject, new Error('Download cancelled by user'));
      }
    };

    get(url);
  });
}

async function extractOllamaArchive(archivePath) {
  fs.rmSync(ollamaRuntimeDir, { recursive: true, force: true });
  fs.mkdirSync(ollamaRuntimeDir, { recursive: true });
  await extractArchive(archivePath, ollamaRuntimeDir, ollamaArchiveExtension);

  if (!fs.existsSync(ollamaPath)) {
    throw new Error(`Ollama executable was not found after extraction: ${ollamaPath}`);
  }

  if (platform !== 'win32') fs.chmodSync(ollamaPath, 0o755);
  const installedVersion = await readOllamaVersion(ollamaPath);
  if (!installedVersion || compareVersions(installedVersion, REQUIRED_OLLAMA_VERSION) < 0) {
    throw new Error(
      `Expected Ollama ${REQUIRED_OLLAMA_VERSION}, found ${installedVersion || 'unknown'}`
    );
  }
}

// IPC Handlers
ipcMain.handle('check-setup', async () => {
  const ollama = await inspectOllamaInstallation();
  return {
    ollamaExists: ollama.exists,
    ollamaVersion: ollama.version,
    ollamaSource: ollama.source,
    ollamaNeedsUpdate: ollama.needsUpdate,
    requiredOllamaVersion: REQUIRED_OLLAMA_VERSION,
    paths: {
      userData: userDataPath,
      binDir,
      modelsDir,
      hfCacheDir
    }
  };
});

ipcMain.on('download-ollama', async () => {
  if (!ollamaDownloadUrl) {
    sendLog('System', `Error: Platform ${platform} is not supported directly for automatic Ollama download.`);
    sendStatus({ ollamaStatus: 'error', ollamaMessage: 'Unsupported platform' });
    return;
  }

  sendLog('System', `Downloading Ollama (${OLLAMA_VERSION}) for ${platform}...`);
  sendStatus({ ollamaStatus: 'downloading', downloadPercent: 0 });

  const tempDest = path.join(userDataPath, `ollama-download.${ollamaArchiveExtension}`);

  try {
    await downloadWithRedirect(ollamaDownloadUrl, tempDest, (downloaded, total) => {
      const pct = Math.round((downloaded / total) * 100);
      const downloadedMB = (downloaded / (1024 * 1024)).toFixed(1);
      const totalMB = (total / (1024 * 1024)).toFixed(1);
      sendStatus({
        ollamaStatus: 'downloading',
        downloadPercent: pct,
        downloadDetails: `${downloadedMB} MB / ${totalMB} MB (${pct}%)`
      });
    });

    currentDownloadRequest = null;
    sendLog('System', `Extracting Ollama ${OLLAMA_VERSION}...`);
    sendStatus({ ollamaStatus: 'extracting', ollamaMessage: 'Extracting archive...' });
    await extractOllamaArchive(tempDest);
    fs.unlinkSync(tempDest);

    sendLog('System', `Ollama ${REQUIRED_OLLAMA_VERSION} installed successfully. Existing models were preserved.`);
    sendStatus({ ollamaStatus: 'installed' });
  } catch (err) {
    currentDownloadRequest = null;
    try {
      if (fs.existsSync(tempDest)) fs.unlinkSync(tempDest);
    } catch (_) {}
    sendLog('System', `Ollama installation failed: ${err.message}`);
    sendStatus({ ollamaStatus: 'error', ollamaMessage: err.message });
  }
});

ipcMain.handle('purge-data', async () => {
  sendLog('System', 'Purging all downloaded local resources...');
  await cleanupProcesses();
  
  try {
    if (fs.existsSync(binDir)) {
      sendLog('System', 'Deleting bin/ folder...');
      fs.rmSync(binDir, { recursive: true, force: true });
    }
    if (fs.existsSync(ollamaRuntimeDir)) {
      sendLog('System', 'Deleting ollama_runtime/ folder...');
      fs.rmSync(ollamaRuntimeDir, { recursive: true, force: true });
    }
    if (fs.existsSync(modelsDir)) {
      sendLog('System', 'Deleting ollama_models/ folder...');
      fs.rmSync(modelsDir, { recursive: true, force: true });
    }
    if (fs.existsSync(hfCacheDir)) {
      sendLog('System', 'Deleting hf_cache/ folder...');
      fs.rmSync(hfCacheDir, { recursive: true, force: true });
    }
    
    // Recreate the directories empty
    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(ollamaRuntimeDir, { recursive: true });
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(hfCacheDir, { recursive: true });
    
    sendLog('System', 'Data purge completed successfully.');
    return true;
  } catch (err) {
    sendLog('System', `Failed to purge data: ${err.message}`);
    return false;
  }
});

// Helper to poll local endpoints
function pollEndpoint(url, timeoutMs = 20000, intervalMs = 1000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(timer);
        resolve(false);
        return;
      }

      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          clearInterval(timer);
          resolve(true);
        }
      });

      req.on('error', () => {
        // Quietly ignore and wait for next interval
      });

      req.setTimeout(500, () => {
        req.destroy();
      });
    }, intervalMs);
  });
}

// Start Ollama process
async function startOllama(configEnv, executablePath) {
  if (ollamaProcess) {
    sendLog('Ollama', 'Ollama is already running.');
    return true;
  }

  sendLog('Ollama', 'Starting Ollama service...');
  sendStatus({ ollamaStatus: 'starting' });

  ollamaProcess = spawn(executablePath, ['serve'], {
    env: configEnv,
    cwd: path.dirname(executablePath)
  });

  ollamaProcess.stdout.on('data', (data) => sendLog('Ollama', data));
  ollamaProcess.stderr.on('data', (data) => sendLog('Ollama', data));

  ollamaProcess.on('close', (code) => {
    sendLog('Ollama', `Ollama service terminated with code ${code}`);
    ollamaProcess = null;
    if (!isStopping) {
      sendStatus({ ollamaStatus: 'offline' });
    }
  });

  // Wait for Ollama port (11434) to open
  const online = await pollEndpoint('http://127.0.0.1:11434/api/tags', 15000);
  if (online) {
    sendLog('Ollama', 'Ollama service is online and listening.');
    sendStatus({ ollamaStatus: 'online' });
    return true;
  } else {
    sendLog('Ollama', 'Error: Ollama service failed to respond in time.');
    sendStatus({ ollamaStatus: 'error', ollamaMessage: 'Start Timeout' });
    return false;
  }
}

// Pull model from Ollama API
function pullModel(modelName) {
  return new Promise((resolve, reject) => {
    sendLog('Ollama', `Checking model ${modelName}...`);
    sendStatus({ modelStatus: 'checking' });

    // 1. Check if model exists
    http.get('http://127.0.0.1:11434/api/tags', (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          const models = data.models || [];
          const exists = models.some(m => m.name.startsWith(modelName) || modelName.startsWith(m.name));

          if (exists) {
            sendLog('Ollama', `Model ${modelName} is already downloaded.`);
            sendStatus({ modelStatus: 'ready' });
            resolve();
            return;
          }

          // 2. Trigger pull via API
          sendLog('Ollama', `Model ${modelName} not found. Downloading model weights... (This can take some time)`);
          sendStatus({ modelStatus: 'downloading', modelPercent: 0 });

          const postData = JSON.stringify({ name: modelName });
          const req = http.request({
            hostname: '127.0.0.1',
            port: 11434,
            path: '/api/pull',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          }, (response) => {
            let buffer = '';
            
            response.on('data', (chunk) => {
              buffer += chunk.toString();
              const lines = buffer.split('\n');
              buffer = lines.pop(); // keep last incomplete line

              for (const line of lines) {
                if (!line.trim()) continue;
                try {
                  const statusObj = JSON.parse(line);
                  if (statusObj.status === 'success') {
                    sendStatus({ modelStatus: 'ready' });
                    sendLog('Ollama', `Model ${modelName} downloaded and loaded successfully.`);
                    resolve();
                  } else if (statusObj.completed && statusObj.total) {
                    const pct = Math.round((statusObj.completed / statusObj.total) * 100);
                    const compMB = (statusObj.completed / (1024 * 1024)).toFixed(1);
                    const totMB = (statusObj.total / (1024 * 1024)).toFixed(1);
                    sendStatus({
                      modelStatus: 'downloading',
                      modelPercent: pct,
                      modelDetails: `${compMB} MB / ${totMB} MB (${pct}%)`
                    });
                  } else if (statusObj.status) {
                    sendLog('Ollama', `Model pull status: ${statusObj.status}`);
                  }
                } catch (e) {
                  // Ignore JSON parse errors for incomplete lines
                }
              }
            });

            response.on('end', () => {
              // Ensure ready status is sent if it completed successfully
              sendStatus({ modelStatus: 'ready' });
              resolve();
            });
          });

          req.on('error', (err) => {
            sendLog('Ollama', `Error requesting model pull: ${err.message}`);
            sendStatus({ modelStatus: 'error', modelMessage: err.message });
            reject(err);
          });

          req.write(postData);
          req.end();

        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Start Python Backend Process
async function startBackend(config, configEnv) {
  if (backendProcess) {
    sendLog('Backend', 'Backend is already running.');
    return true;
  }

  sendLog('Backend', 'Starting Python translation backend...');
  sendStatus({ backendStatus: 'starting' });

  const port = config.backendPort || '8765';

  if (app.isPackaged) {
    // In production: run compiled backend
    const backendExecutableName = platform === 'win32' ? 'bookwalka-backend.exe' : 'bookwalka-backend';
    const backendBinaryPath = path.join(process.resourcesPath, 'bin', backendExecutableName);

    sendLog('Backend', `Spawning packaged binary at ${backendBinaryPath}`);
    backendProcess = spawn(backendBinaryPath, [], {
      env: { ...configEnv, PORT: port },
      cwd: path.dirname(backendBinaryPath)
    });
  } else {
    // In development: spawn python in venv from the workspace
    // Let's resolve the root of the workspace (relative to this file)
    const projectRoot = path.resolve(__dirname, '..');
    const venvPythonPath = platform === 'win32' 
      ? path.join(projectRoot, 'venv', 'Scripts', 'python.exe')
      : path.join(projectRoot, 'venv', 'bin', 'python');
      
    sendLog('Backend', `Spawning Python development server using ${venvPythonPath}`);
    backendProcess = spawn(venvPythonPath, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', port], {
      env: { ...configEnv, PORT: port },
      cwd: path.join(projectRoot, 'backend')
    });
  }

  backendProcess.stdout.on('data', (data) => sendLog('Backend', data));
  backendProcess.stderr.on('data', (data) => sendLog('Backend', data));

  backendProcess.on('close', (code) => {
    sendLog('Backend', `Backend process terminated with code ${code}`);
    backendProcess = null;
    if (!isStopping) {
      sendStatus({ backendStatus: 'offline' });
    }
  });

  // Poll python server health
  // The first start downloads the Manga OCR model (~400 MB), so keep polling
  // the actual versioned health endpoint while initialization finishes.
  const backendOnline = await pollEndpoint(
    `http://127.0.0.1:${port}/v1/health`,
    BACKEND_STARTUP_TIMEOUT_MS
  );
  if (backendOnline) {
    sendLog('Backend', `FastAPI backend is online at http://127.0.0.1:${port}`);
    sendStatus({ backendStatus: 'online' });
    return true;
  } else {
    sendLog('Backend', 'Error: FastAPI backend failed to respond in time.');
    sendStatus({ backendStatus: 'error', backendMessage: 'Start Timeout' });
    return false;
  }
}

// Start everything orchestrator
ipcMain.on('start-server', async (event, config) => {
  isStopping = false;

  const modelName = config.modelName || 'translategemma:12b';
  const device = config.device || 'cpu';

  // Construct environment variables
  const configEnv = {
    ...process.env,
    HF_HOME: hfCacheDir,
    OLLAMA_MODELS: modelsDir,
    OLLAMA_HOST: '127.0.0.1:11434',
    MANGA_TRANSLATION_PROVIDER: 'openai',
    MANGA_OPENAI_API_BASE: 'http://127.0.0.1:11434/v1',
    MANGA_TRANSLATION_MODEL: modelName,
    MANGA_DEVICE: device
  };

  try {
    // 1. Verify Ollama binary and model compatibility
    const ollama = await inspectOllamaInstallation();
    if (!ollama.exists) {
      sendLog('System', 'Ollama binary not found locally. Please download it first.');
      sendStatus({ ollamaStatus: 'offline', backendStatus: 'offline' });
      return;
    }
    if (ollama.needsUpdate) {
      const installedVersion = ollama.version || 'unknown';
      sendLog(
        'System',
        `Ollama ${installedVersion} is too old for ${modelName}. Please update to ${REQUIRED_OLLAMA_VERSION}.`
      );
      sendStatus({
        ollamaStatus: 'error',
        ollamaMessage: `Update required (${installedVersion} → ${REQUIRED_OLLAMA_VERSION})`
      });
      return;
    }

    // 2. Start Ollama
    const ollamaOk = await startOllama(configEnv, ollama.path);
    if (!ollamaOk) return;

    // 3. Pull model
    await pullModel(modelName);

    // 4. Start Python Backend
    const backendOk = await startBackend(config, configEnv);
    if (!backendOk) return;

    sendLog('System', 'All services started successfully! You can now use the Bookwalka browser extension.');

  } catch (err) {
    sendLog('System', `Startup orchestrator failed: ${err.message}`);
  }
});

// Stop services
async function cleanupProcesses() {
  isStopping = true;
  sendLog('System', 'Shutting down services...');

  if (backendProcess) {
    sendLog('Backend', 'Stopping backend process...');
    sendStatus({ backendStatus: 'stopping' });
    
    if (platform === 'win32') {
      exec(`taskkill /pid ${backendProcess.pid} /f /t`);
    } else {
      backendProcess.kill('SIGTERM');
    }
    backendProcess = null;
  }

  if (ollamaProcess) {
    sendLog('Ollama', 'Stopping Ollama service...');
    sendStatus({ ollamaStatus: 'stopping' });

    if (platform === 'win32') {
      exec(`taskkill /pid ${ollamaProcess.pid} /f /t`);
    } else {
      ollamaProcess.kill('SIGTERM');
    }
    ollamaProcess = null;
  }

  sendStatus({
    ollamaStatus: 'offline',
    backendStatus: 'offline',
    modelStatus: 'offline'
  });
  sendLog('System', 'All processes terminated.');
}

ipcMain.on('stop-server', async () => {
  if (currentDownloadRequest) {
    currentDownloadRequest.abort();
    currentDownloadRequest = null;
  }
  await cleanupProcesses();
});
