// DOM elements
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnDownloadOllama = document.getElementById('btn-download-ollama');
const btnClearLogs = document.getElementById('btn-clear-logs');
const chkAutoscroll = document.getElementById('chk-autoscroll');
const consoleOutput = document.getElementById('console-output');
const btnPurgeData = document.getElementById('btn-purge-data');

const selectModel = document.getElementById('select-model');
const selectDevice = document.getElementById('select-device');
const inputBackendPort = document.getElementById('input-backend-port');
const inputOllamaPort = document.getElementById('input-ollama-port');

const setupOllamaStatus = document.getElementById('setup-ollama-status');
const pathUserdata = document.getElementById('path-userdata');
const pathModels = document.getElementById('path-models');
const pathHf = document.getElementById('path-hf');

// Status cards
const statusOllama = document.getElementById('status-ollama');
const statusModel = document.getElementById('status-model');
const statusBackend = document.getElementById('status-backend');

// Helper to update a status card's UI state
function updateStatusCard(cardEl, state, text, progress = null) {
  const dot = cardEl.querySelector('.status-dot');
  const value = cardEl.querySelector('.status-value');
  const progressContainer = cardEl.querySelector('.progress-container');
  const progressBar = cardEl.querySelector('.progress-bar');
  const progressDetails = cardEl.querySelector('.progress-details');

  // Reset classes
  dot.className = 'status-dot';
  
  if (state === 'online' || state === 'ready') {
    dot.classList.add('dot-online');
  } else if (state === 'starting' || state === 'checking' || state === 'extracting') {
    dot.classList.add('dot-starting');
  } else if (state === 'downloading') {
    dot.classList.add('dot-downloading');
  } else {
    dot.classList.add('dot-offline');
  }

  value.textContent = text;

  // Progress bar management
  if (progressContainer) {
    if (progress !== null) {
      progressContainer.style.display = 'flex';
      progressBar.style.width = `${progress.percent}%`;
      progressDetails.textContent = progress.details || `${progress.percent}%`;
    } else {
      progressContainer.style.display = 'none';
    }
  }
}

// Append log to console
function appendLog(source, text) {
  const line = document.createElement('div');
  line.className = 'log-line';
  
  if (source === 'System') {
    line.classList.add('system-line');
  } else if (source === 'Ollama') {
    line.classList.add('ollama-line');
  } else if (source === 'Backend') {
    line.classList.add('backend-line');
  }
  
  line.textContent = `[${new Date().toLocaleTimeString()}] [${source}] ${text}`;
  consoleOutput.appendChild(line);
  
  if (chkAutoscroll.checked) {
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }
}

// Check local environment status
async function checkSetup() {
  const setup = await window.api.checkSetup();
  
  pathUserdata.textContent = setup.paths.userData;
  pathModels.textContent = setup.paths.modelsDir;
  pathHf.textContent = setup.paths.hfCacheDir;

  btnDownloadOllama.disabled = false;

  if (setup.ollamaExists && setup.ollamaNeedsUpdate) {
    const installedVersion = setup.ollamaVersion || 'unknown';
    setupOllamaStatus.textContent = `Outdated (v${installedVersion})`;
    setupOllamaStatus.className = 'setup-badge status-missing';
    btnDownloadOllama.textContent = `Update Ollama to v${setup.requiredOllamaVersion}`;
    btnDownloadOllama.style.display = 'block';
    btnStart.disabled = true;
    appendLog(
      'System',
      `Ollama v${installedVersion} is incompatible with TranslateGemma. Update to v${setup.requiredOllamaVersion}; existing models will be preserved.`
    );
  } else if (setup.ollamaExists) {
    setupOllamaStatus.textContent = `Installed (v${setup.ollamaVersion})`;
    setupOllamaStatus.className = 'setup-badge status-installed';
    btnDownloadOllama.style.display = 'none';
    btnStart.disabled = false;
  } else {
    setupOllamaStatus.textContent = 'Missing';
    setupOllamaStatus.className = 'setup-badge status-missing';
    btnDownloadOllama.textContent = `Download Ollama v${setup.requiredOllamaVersion}`;
    btnDownloadOllama.style.display = 'block';
    btnStart.disabled = true;
    appendLog('System', 'Ollama binary not found inside isolated path. Please click "Download & Extract Ollama Binary" to configure the environment.');
  }
}

// Initialize setup check
checkSetup();

// Button Event Listeners
btnStart.addEventListener('click', () => {
  const config = {
    modelName: selectModel.value,
    device: selectDevice.value,
    backendPort: inputBackendPort.value
  };

  btnStart.disabled = true;
  btnStop.disabled = false;
  
  selectModel.disabled = true;
  selectDevice.disabled = true;
  inputBackendPort.disabled = true;

  updateStatusCard(statusOllama, 'starting', 'Starting...');
  updateStatusCard(statusModel, 'starting', 'Pending...');
  updateStatusCard(statusBackend, 'starting', 'Pending...');

  window.api.startServer(config);
});

btnStop.addEventListener('click', () => {
  btnStop.disabled = true;
  window.api.stopServer();
});

btnDownloadOllama.addEventListener('click', () => {
  btnDownloadOllama.disabled = true;
  window.api.downloadOllama();
});

btnPurgeData.addEventListener('click', async () => {
  const confirmed = confirm("Are you sure you want to delete all downloaded models, caches, and the Ollama executable? This will stop any running servers and cannot be undone.");
  if (confirmed) {
    btnPurgeData.disabled = true;
    const success = await window.api.purgeData();
    btnPurgeData.disabled = false;
    
    if (success) {
      alert("All downloaded isolated data (Ollama binary, model weights, and OCR cache) has been successfully deleted.");
    } else {
      alert("Failed to delete some files. Make sure the servers are completely stopped and try again.");
    }
    checkSetup();
  }
});

btnClearLogs.addEventListener('click', () => {
  consoleOutput.innerHTML = '';
});

// IPC listeners from main process
window.api.onLog((data) => {
  appendLog(data.source, data.text);
});

window.api.onStatus((status) => {
  // Handle Ollama status changes
  if (status.ollamaStatus) {
    if (status.ollamaStatus === 'downloading') {
      updateStatusCard(statusOllama, 'downloading', 'Downloading...', {
        percent: status.downloadPercent,
        details: status.downloadDetails
      });
    } else if (status.ollamaStatus === 'extracting') {
      updateStatusCard(statusOllama, 'extracting', 'Extracting...');
    } else if (status.ollamaStatus === 'installed') {
      updateStatusCard(statusOllama, 'ready', 'Installed');
      checkSetup();
    } else if (status.ollamaStatus === 'starting') {
      updateStatusCard(statusOllama, 'starting', 'Starting...');
    } else if (status.ollamaStatus === 'online') {
      updateStatusCard(statusOllama, 'online', 'Online');
    } else if (status.ollamaStatus === 'offline') {
      updateStatusCard(statusOllama, 'offline', 'Offline');
      resetControls();
    } else if (status.ollamaStatus === 'error') {
      updateStatusCard(statusOllama, 'error', status.ollamaMessage || 'Error');
      btnDownloadOllama.disabled = false;
      resetControls();
      checkSetup();
    }
  }

  // Handle Model status changes
  if (status.modelStatus) {
    if (status.modelStatus === 'checking') {
      updateStatusCard(statusModel, 'checking', 'Checking tags...');
    } else if (status.modelStatus === 'downloading') {
      updateStatusCard(statusModel, 'downloading', 'Downloading...', {
        percent: status.modelPercent,
        details: status.modelDetails
      });
    } else if (status.modelStatus === 'ready') {
      updateStatusCard(statusModel, 'ready', 'Ready');
    } else if (status.modelStatus === 'offline') {
      updateStatusCard(statusModel, 'offline', 'Offline');
    } else if (status.modelStatus === 'error') {
      updateStatusCard(statusModel, 'error', status.modelMessage || 'Error');
    }
  }

  // Handle Backend status changes
  if (status.backendStatus) {
    if (status.backendStatus === 'starting') {
      updateStatusCard(statusBackend, 'starting', 'Starting...');
    } else if (status.backendStatus === 'online') {
      updateStatusCard(statusBackend, 'online', 'Online');
    } else if (status.backendStatus === 'offline') {
      updateStatusCard(statusBackend, 'offline', 'Offline');
      resetControls();
    } else if (status.backendStatus === 'error') {
      updateStatusCard(statusBackend, 'error', status.backendMessage || 'Error');
      resetControls();
    }
  }
});

function resetControls() {
  btnStart.disabled = false;
  btnStop.disabled = true;
  
  selectModel.disabled = false;
  selectDevice.disabled = false;
  inputBackendPort.disabled = false;
}
