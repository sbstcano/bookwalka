// Background service worker for BookWalker JP Manga Translator

chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message.type === 'CAPTURE_TAB') {
    // Capture the visible area of the current tab
    chrome.tabs.captureVisibleTab(
      sender.tab?.windowId || chrome.windows.WINDOW_ID_CURRENT,
      { format: 'png' },
      (dataUrl?: string) => {
        if (chrome.runtime.lastError) {
          console.error('Error capturing tab:', chrome.runtime.lastError);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl });
        }
      }
    );
    return true; // Indicates async response
  }

  if (message.type === 'REQUEST_START_SELECTION') {
    chrome.storage.local.get(['extensionEnabled'], (result) => {
      const enabled = result.extensionEnabled !== false;
      if (enabled && sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'START_SELECTION_TOP' });
      }
    });
    return;
  }
});
