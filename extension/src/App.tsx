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
  const [langSaved, setLangSaved] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check backend health
    fetchHealth();

    // Load stored settings
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['targetLanguage', 'extensionEnabled'], (result: Record<string, any>) => {
        if (result.targetLanguage) {
          setTargetLang(result.targetLanguage);
        }
        if (result.extensionEnabled !== undefined) {
          setEnabled(result.extensionEnabled);
        }
      });
    }
  }, []);

  const handleToggleEnabled = (newValue: boolean) => {
    setEnabled(newValue);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ extensionEnabled: newValue });
    }
  };

  const fetchHealth = () => {
    setHealth({ status: 'loading' });
    fetch('http://127.0.0.1:8765/v1/health')
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

  const handleStartSelection = () => {
    setErrorMsg(null);
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'START_SELECTION' }, () => {
            if (chrome.runtime.lastError) {
              setErrorMsg('Unable to start selection. Please reload the tab and try again.');
            } else {
              // Close popup once selection starts
              window.close();
            }
          });
        }
      });
    } else {
      setErrorMsg('Extension mode is not available in a standard browser tab.');
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
        </div>

        <button 
          className="action-btn" 
          onClick={handleStartSelection}
          disabled={!enabled || health.status === 'offline'}
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3H9V5H5V9H3V3Z" fill="currentColor"/>
            <path d="M15 3H21V9H19V5H15V3Z" fill="currentColor"/>
            <path d="M3 15H5V19H9V21H3V15Z" fill="currentColor"/>
            <path d="M19 15H21V21H15V19H19V15Z" fill="currentColor"/>
            <path d="M7 11V7H11V11H7Z" fill="currentColor" opacity="0.3"/>
            <path d="M13 11V7H17V11H13Z" fill="currentColor" opacity="0.3"/>
            <path d="M7 17V13H11V17H7Z" fill="currentColor" opacity="0.3"/>
            <path d="M13 17V13H17V17H13Z" fill="currentColor" opacity="0.3"/>
          </svg>
          Translate Area
        </button>

        {health.status === 'offline' && (
          <div className="error-banner">
            Local backend at <code>127.0.0.1:8765</code> is unreachable. 
            Please start the FastAPI server and click Refresh.
            <button className="text-link" onClick={fetchHealth}>Refresh</button>
          </div>
        )}

        {errorMsg && (
          <div className="error-banner">
            {errorMsg}
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
