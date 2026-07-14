import { useEffect, useState } from 'react';
import './App.css';

interface HealthStatus {
  status: 'loading' | 'online' | 'offline';
  device?: string;
  detector_loaded?: boolean;
  ocr_loaded?: boolean;
}

const FAQ_ITEMS = [
  {
    question: 'Does it work with BookWalker JP?',
    answer: 'Yes — it was built for that!',
  },
];

function App() {
  const [health, setHealth] = useState<HealthStatus>({ status: 'loading' });
  const [targetLang, setTargetLang] = useState('en');
  const [backendUrl, setBackendUrl] = useState('http://127.0.0.1:8765');
  const [translationModel, setTranslationModel] = useState('deepseek-v4-pro');
  const [backendApiKey, setBackendApiKey] = useState('');
  const [langSaved, setLangSaved] = useState(false);
  const [backendSaved, setBackendSaved] = useState(false);
  const [modelSaved, setModelSaved] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [showImagePreview, setShowImagePreview] = useState(false);

  useEffect(() => {
    let initialUrl = 'http://127.0.0.1:8765';
    let initialApiKey = '';

    // Detect Safari iOS and add class to HTML tag for conditional CSS styling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1);
    if (isIOS) {
      document.documentElement.classList.add('ios-safari');
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['targetLanguage', 'extensionEnabled', 'backendUrl', 'translationModel', 'backendApiKey', 'showImagePreview'], (result: Record<string, any>) => {
        if (result.targetLanguage) {
          setTargetLang(result.targetLanguage);
        }
        if (result.extensionEnabled !== undefined) {
          setEnabled(result.extensionEnabled);
        }
        if (result.showImagePreview !== undefined) {
          setShowImagePreview(result.showImagePreview);
        }
        if (result.backendUrl) {
          setBackendUrl(result.backendUrl);
          initialUrl = result.backendUrl;
        }
        if (result.translationModel) {
          setTranslationModel(result.translationModel);
        }
        if (result.backendApiKey) {
          setBackendApiKey(result.backendApiKey);
          initialApiKey = result.backendApiKey;
        }
        fetchHealth(initialUrl, initialApiKey);
      });
    } else {
      fetchHealth(initialUrl, initialApiKey);
    }
  }, []);

  const handleToggleEnabled = (newValue: boolean) => {
    setEnabled(newValue);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ extensionEnabled: newValue });
    }
  };

  const handleTogglePreview = (newValue: boolean) => {
    setShowImagePreview(newValue);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ showImagePreview: newValue });
    }
  };

  const fetchHealth = (urlOverride?: string, apiKeyOverride?: string) => {
    setHealth({ status: 'loading' });
    const targetUrl = (urlOverride || backendUrl).replace(/\/+$/, '');
    const activeKey = apiKeyOverride !== undefined ? apiKeyOverride : backendApiKey;
    
    const headers: Record<string, string> = {};
    if (activeKey) {
      headers['X-API-Key'] = activeKey;
    }

    fetch(`${targetUrl}/v1/health`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then((data) => {
        setHealth({
          status: 'online',
          device: data.device || 'unknown',
          detector_loaded: data.detector_loaded,
          ocr_loaded: data.ocr_loaded,
        });
      })
      .catch(() => {
        setHealth({ status: 'offline' });
      });
  };

  const handleLangChange = (newLang: string) => {
    setTargetLang(newLang);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ targetLanguage: newLang }, () => {
        setLangSaved(true);
        setTimeout(() => setLangSaved(false), 1500);
      });
    } else {
      setLangSaved(true);
      setTimeout(() => setLangSaved(false), 1500);
    }
  };

  const handleBackendUrlChange = (newUrl: string) => {
    const cleanedUrl = newUrl.trim().replace(/\/+$/, '');
    setBackendUrl(newUrl);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ backendUrl: cleanedUrl }, () => {
        setBackendSaved(true);
        setTimeout(() => setBackendSaved(false), 1500);
        fetchHealth(cleanedUrl);
      });
    } else {
      setBackendSaved(true);
      setTimeout(() => setBackendSaved(false), 1500);
      fetchHealth(cleanedUrl);
    }
  };

  const handleBackendApiKeyChange = (newKey: string) => {
    const cleanedKey = newKey.trim();
    setBackendApiKey(newKey);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ backendApiKey: cleanedKey }, () => {
        setApiKeySaved(true);
        setTimeout(() => setApiKeySaved(false), 1500);
        fetchHealth(backendUrl, cleanedKey);
      });
    } else {
      setApiKeySaved(true);
      setTimeout(() => setApiKeySaved(false), 1500);
      fetchHealth(backendUrl, cleanedKey);
    }
  };

  const handleModelChange = (newModel: string) => {
    setTranslationModel(newModel);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ translationModel: newModel }, () => {
        setModelSaved(true);
        setTimeout(() => setModelSaved(false), 1500);
      });
    } else {
      setModelSaved(true);
      setTimeout(() => setModelSaved(false), 1500);
    }
  };



  return (
    <div className="container">
      <header className="app-header">
        <h1 className="app-title">Bookwalka</h1>
        <div className={`health-badge ${health.status}`}>
          <span className="dot"></span>
          <span className="label">
            {health.status === 'loading' && 'Connecting...'}
            {health.status === 'online' && `Backend (${health.device})`}
            {health.status === 'offline' && 'Backend Offline'}
          </span>
        </div>
      </header>

      <main className="app-main">
        <div className="toggle-container">
          <div className="toggle-row">
            <span>{enabled ? 'Enabled' : 'Disabled'}</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={enabled} 
                onChange={(e) => handleToggleEnabled(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="toggle-row" style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
            <span style={{ fontSize: '13px', opacity: 0.85 }}>Show Image Preview</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={showImagePreview} 
                onChange={(e) => handleTogglePreview(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        <div className="shortcut-tip" style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#a1a1aa',
          textAlign: 'left',
          marginTop: '16px',
          marginBottom: '8px'
        }}>
          💡 <strong style={{ color: '#e4e4e7' }}>How to translate:</strong>
          <div style={{ marginTop: '6px', paddingLeft: '4px' }}>
            • <strong>Desktop:</strong> Press key <kbd style={{ background: '#27272a', padding: '2px 5px', borderRadius: '4px', border: '1px solid #3f3f46', color: '#f4f4f5', fontFamily: 'monospace', fontSize: '11px' }}>T</kbd> on the page.<br />
            • <strong>Mobile:</strong> Tap the blue floating button <strong style={{ color: '#00c2ff' }}>文</strong>.
          </div>
        </div>

        {health.status === 'offline' && (
          <div className="error-banner">
            Backend at <code>{backendUrl}</code> is unreachable. 
            Please start the FastAPI server and click Refresh.
            <button className="text-link" onClick={() => fetchHealth()}>Refresh</button>
          </div>
        )}



        <section className="settings-section">
          <div className="input-group">
            <label htmlFor="target-lang">Output Language</label>
            <div className="input-row">
              <select
                id="target-lang"
                value={targetLang}
                onChange={(e) => handleLangChange(e.target.value)}
                className="lang-select"
              >
                <option value="en">English</option>
                <option value="fr">French (Français)</option>
                <option value="es">Spanish (Español)</option>
                <option value="de">German (Deutsch)</option>
                <option value="it">Italian (Italiano)</option>
              </select>
              <span className="save-status-indicator">
                {langSaved && 'Saved!'}
              </span>
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '12px' }}>
            <label htmlFor="backend-url">Backend URL</label>
            <div className="input-row">
              <input
                id="backend-url"
                type="text"
                value={backendUrl}
                onChange={(e) => handleBackendUrlChange(e.target.value)}
                placeholder="http://127.0.0.1:8765"
                className="text-input"
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '6px 8px',
                  fontSize: '13px'
                }}
              />
              <span className="save-status-indicator">
                {backendSaved && 'Saved!'}
              </span>
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '12px' }}>
            <label htmlFor="backend-api-key">Backend API Key</label>
            <div className="input-row">
              <input
                id="backend-api-key"
                type="password"
                value={backendApiKey}
                onChange={(e) => handleBackendApiKeyChange(e.target.value)}
                placeholder="Optional (set if VPS auth is enabled)"
                className="text-input"
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '6px 8px',
                  fontSize: '13px'
                }}
              />
              <span className="save-status-indicator">
                {apiKeySaved && 'Saved!'}
              </span>
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '12px' }}>
            <label htmlFor="translation-model">Translation Model</label>
            <div className="input-row">
              <select
                id="translation-model"
                value={translationModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="lang-select"
              >
                <option value="deepseek-v4-pro">DeepSeek v4 Pro</option>
                <option value="deepseek-v4-flash">DeepSeek v4 Flash</option>
                <option value="deepseek-chat">DeepSeek Chat (V3/R1)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              </select>
              <span className="save-status-indicator">
                {modelSaved && 'Saved!'}
              </span>
            </div>
          </div>
        </section>

        <section className="faq-section">
          <div className="faq-list">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

    </div>
  );
}

export default App;
