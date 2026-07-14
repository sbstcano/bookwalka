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

  if (message.type === 'POPUP_START_SELECTION') {
    console.log("Bookwalka Background: Received POPUP_START_SELECTION request.");
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Bookwalka Background: Tab query error:", chrome.runtime.lastError.message);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      const activeTab = tabs[0];
      if (activeTab?.id) {
        console.log("Bookwalka Background: Sending START_SELECTION to active tab ID:", activeTab.id);
        chrome.tabs.sendMessage(activeTab.id, { type: 'START_SELECTION' }, (tabResponse) => {
          if (chrome.runtime.lastError) {
            console.error("Bookwalka Background: Send message to tab failed:", chrome.runtime.lastError.message);
            sendResponse({ error: 'Failed to contact tab: ' + chrome.runtime.lastError.message });
          } else {
            console.log("Bookwalka Background: Tab responded successfully.");
            sendResponse({ status: 'ok', tabResponse });
          }
        });
      } else {
        console.warn("Bookwalka Background: No active tab found.");
        sendResponse({ error: 'No active tab found by background script.' });
      }
    });
    return true; // async response
  }
});
