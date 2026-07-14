import type { ViewportInfo } from '../shared/types';
import { mapCssToPixels } from './coordinate-mapper';

console.log("Bookwalka: Content script injected successfully! (URL: " + window.location.href + ")");

function showInvalidatedContextToast() {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = 'rgba(239, 68, 68, 0.95)';
  toast.style.color = '#ffffff';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '600';
  toast.style.zIndex = '2147483647';
  toast.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
  toast.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  toast.style.textAlign = 'center';
  toast.style.pointerEvents = 'auto';
  toast.innerText = 'Bookwalka: Extension was reloaded. Please refresh the page to continue.';
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 5000);
}

let isExtensionEnabled = true;

// Query initial status on load
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['extensionEnabled'], (result) => {
    if (result.extensionEnabled !== undefined) {
      isExtensionEnabled = !!result.extensionEnabled;
    }
    updateFloatingActionButtonVisibility();
  });

  // Listen for real-time changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.extensionEnabled) {
      isExtensionEnabled = !!changes.extensionEnabled.newValue;
      updateFloatingActionButtonVisibility();
      if (!isExtensionEnabled) {
        removeSelectionOverlay();
      }
    }
  });
}

let selectionOverlayHost: HTMLDivElement | null = null;
let popupHost: HTMLDivElement | null = null;
let popupDragCleanup: (() => void) | null = null;
let startX = 0;
let startY = 0;
let isDragging = false;
let overlayElement: HTMLDivElement | null = null;
let selectionBox: HTMLDivElement | null = null;

function removeSelectionOverlay() {
  if (selectionOverlayHost) {
    selectionOverlayHost.remove();
    selectionOverlayHost = null;
    overlayElement = null;
    selectionBox = null;
    document.removeEventListener('keydown', handleKeyDown);
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    document.removeEventListener('keydown', handleKeyDown);
    return;
  }
  if (e.key === 'Escape') {
    removeSelectionOverlay();
    chrome.runtime.sendMessage({ type: 'CANCEL_SELECTION' });
  }
}

function startSelection() {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    showInvalidatedContextToast();
    return;
  }
  if (!isExtensionEnabled) {
    return;
  }
  if (window !== window.top) {
    chrome.runtime.sendMessage({ type: 'REQUEST_START_SELECTION' });
    return;
  }
  removeSelectionOverlay();

  // Create host div for Shadow DOM
  selectionOverlayHost = document.createElement('div');
  selectionOverlayHost.id = 'bookwalker-translator-selection-host';
  document.body.appendChild(selectionOverlayHost);

  const shadow = selectionOverlayHost.attachShadow({ mode: 'open' });

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      z-index: 2147483647;
      cursor: crosshair;
      user-select: none;
      touch-action: none;
    }
    .selection-box {
      position: absolute;
      border: 2px dashed #00c2ff;
      background: rgba(0, 194, 255, 0.15);
      pointer-events: none;
      box-sizing: border-box;
      box-shadow: 0 0 0 9999vw rgba(0, 0, 0, 0.4);
    }
  `;
  shadow.appendChild(style);

  // Overlay container
  overlayElement = document.createElement('div');
  overlayElement.className = 'overlay';
  shadow.appendChild(overlayElement);

  document.addEventListener('keydown', handleKeyDown);

  overlayElement.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // Only left click for mice
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    overlayElement!.appendChild(selectionBox);
  });

  overlayElement.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging || !selectionBox) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(startX - currentX);
    const height = Math.abs(startY - currentY);

    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
  });

  overlayElement.addEventListener('pointerup', (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(startX - currentX);
    const height = Math.abs(startY - currentY);

    removeSelectionOverlay();

    if (width > 10 && height > 10) {
      const viewportInfo: ViewportInfo = {
        innerWidthCss: window.innerWidth,
        innerHeightCss: window.innerHeight,
        cropCss: { left, top, width, height }
      };

      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        showInvalidatedContextToast();
        return;
      }

      // Request service worker to capture tab
      chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' }, (response: any) => {
        if (!response || response.error) {
          showPopup(
            { left, top, width, height },
            { error: response?.error || 'Failed to capture screenshot.' }
          );
          return;
        }
        cropAndTranslate(viewportInfo, response.dataUrl);
      });
    }
  });
}

function cropAndTranslate(viewportInfo: ViewportInfo, dataUrl: string) {
  const { cropCss } = viewportInfo;

  // Show loading immediately
  const popupElement = showPopup(cropCss, { loading: true });

  const img = new Image();
  img.onload = () => {
    try {
      const pixelCoords = mapCssToPixels(viewportInfo, img.width, img.height);

      const canvas = document.createElement('canvas');
      canvas.width = pixelCoords.width;
      canvas.height = pixelCoords.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas 2D context.');
      }

      ctx.drawImage(
        img,
        pixelCoords.x,
        pixelCoords.y,
        pixelCoords.width,
        pixelCoords.height,
        0,
        0,
        pixelCoords.width,
        pixelCoords.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          updatePopup(popupElement, { error: 'Failed to generate image blob.' });
          return;
        }

        // Check if image preview is enabled in settings (default to false)
        chrome.storage.local.get(['showImagePreview'], (result) => {
          const showPreview = result ? result.showImagePreview === true : false;
          const imageSrc = showPreview ? URL.createObjectURL(blob) : undefined;

          if (showPreview) {
            updatePopup(popupElement, { loading: true, imageSrc });
          }

          sendImageToBackend(blob, popupElement, imageSrc);
        });
      }, 'image/jpeg', 0.95);
    } catch (err: any) {
      updatePopup(popupElement, { error: err.message || 'Error during cropping.' });
    }
  };

  img.onerror = () => {
    updatePopup(popupElement, { error: 'Failed to load screenshot.' });
  };

  img.src = dataUrl;
}

function sendImageToBackend(imageBlob: Blob, popupElement: HTMLDivElement, imageSrc?: string) {
  const formData = new FormData();
  formData.append('file', imageBlob, 'crop.jpg');

  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    updatePopup(popupElement, { error: 'Extension context invalidated. Please refresh the page.', imageSrc });
    return;
  }

  chrome.storage.local.get(['targetLanguage', 'backendUrl', 'translationModel', 'backendApiKey'], (result: Record<string, any>) => {
    const targetLang = result.targetLanguage || 'en';
    const rawBackendUrl = result.backendUrl || 'http://127.0.0.1:8765';
    const backendUrl = rawBackendUrl.replace(/\/+$/, '');
    const model = result.translationModel || 'deepseek-v4-pro';
    const apiKey = result.backendApiKey || '';

    const url = `${backendUrl}/v1/translate-selection?target_lang=${encodeURIComponent(targetLang)}&model=${encodeURIComponent(model)}`;

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    fetch(url, {
      method: 'POST',
      body: formData,
      headers: headers
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Server error ${res.status}: ${errText}`);
        }
        return res.json();
      })
      .then((data) => {
        updatePopup(popupElement, {
          japanese: data.japanese || 'No text detected',
          translation: data.translation || 'Translation failed',
          imageSrc
        });
      })
      .catch((err) => {
        updatePopup(popupElement, { error: err.message || `Failed to connect to backend at ${backendUrl}.`, imageSrc });
      });
  });
}

interface PopupState {
  loading?: boolean;
  error?: string;
  japanese?: string;
  translation?: string;
  imageSrc?: string;
}

interface SelectionBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

const POPUP_WIDTH = 340;
const POPUP_MARGIN = 16;
const POPUP_GAP = 10;

function clampPopupToViewport(popup: HTMLDivElement) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxHeight = viewportHeight - POPUP_MARGIN * 2;

  popup.style.maxHeight = `${maxHeight}px`;

  const rect = popup.getBoundingClientRect();
  let left = parseFloat(popup.style.left) || rect.left;
  let top = parseFloat(popup.style.top) || rect.top;

  if (left + rect.width > viewportWidth - POPUP_MARGIN) {
    left = viewportWidth - rect.width - POPUP_MARGIN;
  }
  if (left < POPUP_MARGIN) {
    left = POPUP_MARGIN;
  }

  if (rect.height >= maxHeight) {
    top = POPUP_MARGIN;
  } else {
    if (top + rect.height > viewportHeight - POPUP_MARGIN) {
      top = viewportHeight - rect.height - POPUP_MARGIN;
    }
    if (top < POPUP_MARGIN) {
      top = POPUP_MARGIN;
    }
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function getSelectionBoundsFromPopup(popup: HTMLDivElement): SelectionBounds | null {
  const left = popup.dataset.selectionLeft;
  const top = popup.dataset.selectionTop;
  const width = popup.dataset.selectionWidth;
  const height = popup.dataset.selectionHeight;
  if (left === undefined || top === undefined || width === undefined || height === undefined) {
    return null;
  }
  return {
    left: Number(left),
    top: Number(top),
    width: Number(width),
    height: Number(height),
  };
}

function repositionPopupAfterRender(popup: HTMLDivElement) {
  requestAnimationFrame(() => {
    const selection = getSelectionBoundsFromPopup(popup);
    const viewportHeight = window.innerHeight;
    let top = parseFloat(popup.style.top) || 0;
    const rect = popup.getBoundingClientRect();

    if (top + rect.height > viewportHeight - POPUP_MARGIN && selection) {
      const aboveY = selection.top - rect.height - POPUP_GAP;
      if (aboveY >= POPUP_MARGIN) {
        top = aboveY;
        popup.style.top = `${top}px`;
      }
    }

    clampPopupToViewport(popup);
  });
}

function removePopup() {
  popupDragCleanup?.();
  popupDragCleanup = null;
  if (popupHost) {
    popupHost.remove();
    popupHost = null;
  }
}

function setupPopupDrag(popup: HTMLDivElement, header: HTMLElement) {
  popupDragCleanup?.();

  let isDraggingPopup = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let popupStartX = 0;
  let popupStartY = 0;

  header.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.close-btn')) return;
    if (e.button !== 0) return;

    isDraggingPopup = true;
    header.classList.add('dragging');
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    popupStartX = parseFloat(popup.style.left) || 0;
    popupStartY = parseFloat(popup.style.top) || 0;
    e.preventDefault();
  });

  const onMouseMove = (e: MouseEvent) => {
    if (!isDraggingPopup) return;
    popup.style.left = `${popupStartX + e.clientX - dragStartX}px`;
    popup.style.top = `${popupStartY + e.clientY - dragStartY}px`;
  };

  const onMouseUp = () => {
    if (!isDraggingPopup) return;
    isDraggingPopup = false;
    header.classList.remove('dragging');
    clampPopupToViewport(popup);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  popupDragCleanup = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}

function showPopup(selection: SelectionBounds, initialState: PopupState): HTMLDivElement {
  removePopup();

  popupHost = document.createElement('div');
  popupHost.id = 'bookwalker-translator-popup-host';
  document.body.appendChild(popupHost);

  const shadow = popupHost.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .popup {
      position: fixed;
      z-index: 2147483647;
      background: rgba(24, 24, 28, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #e4e4e7;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 16px;
      width: 340px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
      max-height: calc(100vh - 32px);
      overflow: hidden;
      animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 8px;
      cursor: grab;
      flex-shrink: 0;
      user-select: none;
      touch-action: none;
    }
    .header.dragging {
      cursor: grabbing;
    }
    .body {
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }
    .title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #00c2ff;
      font-weight: 800;
    }
    .close-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .close-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }
    .content-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .text-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .label {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.45);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .text-val {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.03);
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
      user-select: text;
    }
    .text-val.ja {
      font-family: "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif;
      color: #ffffff;
    }
    .text-val.translation {
      color: #a3e635;
      font-weight: 500;
    }
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 0;
      gap: 12px;
    }
    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid rgba(255, 255, 255, 0.08);
      border-top-color: #00c2ff;
      border-radius: 50%;
      animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .loading-text {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
    }
    .error-container {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
    }
  `;
  shadow.appendChild(style);

  const popup = document.createElement('div');
  popup.className = 'popup';
  popup.dataset.selectionLeft = String(selection.left);
  popup.dataset.selectionTop = String(selection.top);
  popup.dataset.selectionWidth = String(selection.width);
  popup.dataset.selectionHeight = String(selection.height);

  const viewportWidth = window.innerWidth;
  let posX = selection.left;
  let posY = selection.top + selection.height + POPUP_GAP;

  if (posX + POPUP_WIDTH > viewportWidth - POPUP_MARGIN) {
    posX = viewportWidth - POPUP_WIDTH - POPUP_MARGIN;
  }
  if (posX < POPUP_MARGIN) {
    posX = POPUP_MARGIN;
  }
  if (posY < POPUP_MARGIN) {
    posY = POPUP_MARGIN;
  }

  popup.style.left = `${posX}px`;
  popup.style.top = `${posY}px`;
  shadow.appendChild(popup);

  renderPopupContent(popup, initialState);

  return popup;
}

function ensurePopupStructure(popup: HTMLDivElement) {
  if (popup.dataset.initialized === 'true') return;

  const bellIconUrl = chrome.runtime.getURL('bell.png');
  popup.innerHTML = `
    <div class="header">
      <div class="title-container" style="display: flex; align-items: center; gap: 8px;">
        <img src="${bellIconUrl}" alt="Bookwalka" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; pointer-events: none;" />
        <span class="title">Translating for you...</span>
      </div>
      <button class="close-btn" id="close-bw-popup">&times;</button>
    </div>
    <div class="body" id="popup-body"></div>
  `;

  popup.querySelector('#close-bw-popup')?.addEventListener('click', () => {
    removePopup();
  });

  const header = popup.querySelector('.header') as HTMLElement;
  setupPopupDrag(popup, header);
  popup.dataset.initialized = 'true';
}

function renderPopupContent(popup: HTMLDivElement, state: PopupState) {
  ensurePopupStructure(popup);

  const body = popup.querySelector('#popup-body') as HTMLDivElement;

  if (state.loading) {
    body.innerHTML = `
      <div class="loading-container">
        ${state.imageSrc ? `
          <div style="margin-bottom: 12px; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); padding: 6px; border-radius: 6px; display: flex; justify-content: center;">
            <img src="${state.imageSrc}" style="max-width: 100%; max-height: 80px; object-fit: contain; border-radius: 4px; opacity: 0.5;" />
          </div>
        ` : ''}
        <div class="spinner"></div>
        <div class="loading-text">OCR & Translating...</div>
      </div>
    `;
  } else if (state.error) {
    body.innerHTML = `
      <div class="error-container">
        ${state.imageSrc ? `
          <div style="margin-bottom: 12px; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); padding: 6px; border-radius: 6px; display: flex; justify-content: center;">
            <img src="${state.imageSrc}" style="max-width: 100%; max-height: 80px; object-fit: contain; border-radius: 4px; opacity: 0.5;" />
          </div>
        ` : ''}
        <strong>Error:</strong> ${state.error}
      </div>
    `;
  } else {
    body.innerHTML = `
      <div class="content-box">
        ${state.imageSrc ? `
          <div class="text-block" style="margin-bottom: 12px;">
            <div class="label" style="opacity: 0.6; font-size: 11px; margin-bottom: 4px;">Captured Image Crop</div>
            <div style="background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); padding: 6px; border-radius: 6px; display: flex; justify-content: center;">
              <img src="${state.imageSrc}" style="max-width: 100%; max-height: 80px; object-fit: contain; border-radius: 4px;" />
            </div>
          </div>
        ` : ''}
        <div class="text-block">
          <div class="label">Japanese (OCR)</div>
          <div class="text-val ja">${state.japanese || ''}</div>
        </div>
        <div class="text-block">
          <div class="label">Translation</div>
          <div class="text-val translation">${state.translation || ''}</div>
        </div>
      </div>
    `;
  }

  repositionPopupAfterRender(popup);
}

function updatePopup(popup: HTMLDivElement, state: PopupState) {
  renderPopupContent(popup, state);
}

// Listen for message from the extension popup or the service worker
chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  console.log("Bookwalka: Content script received message", message);
  try {
    if (message.type === 'START_SELECTION' || message.type === 'START_SELECTION_TOP') {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        console.error("Bookwalka: chrome or chrome.runtime is undefined!");
        sendResponse({ status: 'error' });
        return;
      }
      
      const proceed = () => {
        console.log("Bookwalka: Starting area selection...");
        startSelection();
        sendResponse({ status: 'started' });
      };

      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['extensionEnabled'], (result) => {
          const enabled = result ? result.extensionEnabled !== false : true;
          if (!enabled) {
            console.log("Bookwalka: Extension is disabled in settings.");
            sendResponse({ status: 'disabled' });
            return;
          }
          proceed();
        });
      } else {
        console.log("Bookwalka: chrome.storage.local not available, defaulting to enabled.");
        proceed();
      }
      return true; // Keep channel open
    }
  } catch (err) {
    console.error("Bookwalka: Error in message listener", err);
  }
});

// Shortcut key: pressing "t" or "T" on the page starts selection
document.addEventListener('keydown', (e: KeyboardEvent) => {
  const activeEl = document.activeElement;
  const isTyping = activeEl && (
    activeEl.tagName === 'INPUT' ||
    activeEl.tagName === 'TEXTAREA' ||
    (activeEl as HTMLElement).isContentEditable
  );
  if (isTyping) return;

  if (e.key.toLowerCase() === 't') {
    console.log("Bookwalka: Key 'T' pressed.");
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.warn('Bookwalka: extension runtime is not available.');
      return;
    }

    const trigger = () => {
      if (window === window.top) {
        startSelection();
      } else {
        chrome.runtime.sendMessage({ type: 'REQUEST_START_SELECTION' });
      }
    };

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['extensionEnabled'], (result) => {
        const enabled = result ? result.extensionEnabled !== false : true;
        if (!enabled) return;
        trigger();
      });
    } else {
      trigger();
    }
  }
});

function createFloatingActionButton() {
  if (document.getElementById('bookwalka-fab-container')) return;

  const container = document.createElement('div');
  container.id = 'bookwalka-fab-container';
  
  const shadow = container.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #00c2ff 0%, #0072ff 100%);
      box-shadow: 0 4px 16px rgba(0, 114, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      user-select: none;
      z-index: 2147483646;
      transition: transform 0.2s, box-shadow 0.2s;
      touch-action: none;
    }
    .fab:active {
      transform: scale(0.9);
      box-shadow: 0 2px 8px rgba(0, 114, 255, 0.4);
    }
  `;
  shadow.appendChild(style);

  const fab = document.createElement('div');
  fab.className = 'fab';
  fab.textContent = '文';
  shadow.appendChild(fab);

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let fabX = 0;
  let fabY = 0;
  let hasMoved = false;

  fab.addEventListener('pointerdown', (e: PointerEvent) => {
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    const rect = fab.getBoundingClientRect();
    fabX = window.innerWidth - rect.right;
    fabY = window.innerHeight - rect.bottom;
    fab.setPointerCapture(e.pointerId);
  });

  fab.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved = true;
    }
    const newRight = fabX - dx;
    const newBottom = fabY - dy;
    fab.style.right = `${Math.max(10, Math.min(window.innerWidth - 60, newRight))}px`;
    fab.style.bottom = `${Math.max(10, Math.min(window.innerHeight - 60, newBottom))}px`;
  });

  fab.addEventListener('pointerup', (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    fab.releasePointerCapture(e.pointerId);
    if (!hasMoved) {
      console.log("Bookwalka: FAB tapped.");
      startSelection();
    }
  });

  document.body.appendChild(container);
}

function updateFloatingActionButtonVisibility() {
  if (!document.body) return;
  const container = document.getElementById('bookwalka-fab-container');
  if (isExtensionEnabled) {
    if (!container) {
      createFloatingActionButton();
    } else {
      container.style.display = 'block';
    }
  } else {
    if (container) {
      container.style.display = 'none';
    }
  }
}

// Initialize FAB on load
if (document.body) {
  updateFloatingActionButtonVisibility();
} else {
  document.addEventListener('DOMContentLoaded', updateFloatingActionButtonVisibility);
}
