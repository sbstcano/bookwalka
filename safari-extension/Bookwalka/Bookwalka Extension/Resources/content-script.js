(function(){function e(e,t,n){let{innerWidthCss:r,innerHeightCss:i,cropCss:a}=e;if(r<=0||i<=0)throw Error(`Invalid viewport CSS dimensions`);if(t<=0||n<=0)throw Error(`Invalid screenshot dimensions`);let o=t/r,s=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.maxTouchPoints>1,c=n/o,l=s?(c-i)/2:0;return{x:Math.round(a.left*o),y:Math.round((a.top+l)*o),width:Math.round(a.width*o),height:Math.round(a.height*o)}}console.log(`Bookwalka: Content script injected successfully! (URL: `+window.location.href+`)`);function t(){let e=document.createElement(`div`);e.style.position=`fixed`,e.style.bottom=`20px`,e.style.left=`50%`,e.style.transform=`translateX(-50%)`,e.style.background=`rgba(239, 68, 68, 0.95)`,e.style.color=`#ffffff`,e.style.padding=`12px 24px`,e.style.borderRadius=`8px`,e.style.fontFamily=`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,e.style.fontSize=`14px`,e.style.fontWeight=`600`,e.style.zIndex=`2147483647`,e.style.boxShadow=`0 4px 20px rgba(0, 0, 0, 0.4)`,e.style.border=`1px solid rgba(255, 255, 255, 0.2)`,e.style.textAlign=`center`,e.style.pointerEvents=`auto`,e.innerText=`Bookwalka: Extension was reloaded. Please refresh the page to continue.`,document.body.appendChild(e),setTimeout(()=>{e.style.transition=`opacity 0.5s ease`,e.style.opacity=`0`,setTimeout(()=>e.remove(),500)},5e3)}var n=!0;typeof chrome<`u`&&chrome.storage&&chrome.storage.local&&(chrome.storage.local.get([`extensionEnabled`],e=>{e.extensionEnabled!==void 0&&(n=!!e.extensionEnabled),k()}),chrome.storage.onChanged.addListener((e,t)=>{t===`local`&&e.extensionEnabled&&(n=!!e.extensionEnabled.newValue,k(),n||d())}));var r=null,i=null,a=null,o=0,s=0,c=!1,l=null,u=null;function d(){r&&(r.remove(),r=null,l=null,u=null,document.removeEventListener(`keydown`,f))}function f(e){if(typeof chrome>`u`||!chrome.runtime||!chrome.runtime.id){document.removeEventListener(`keydown`,f);return}e.key===`Escape`&&(d(),chrome.runtime.sendMessage({type:`CANCEL_SELECTION`}))}function p(){if(typeof chrome>`u`||!chrome.runtime){t();return}if(!n)return;if(window!==window.top){chrome.runtime.sendMessage({type:`REQUEST_START_SELECTION`});return}d(),r=document.createElement(`div`),r.id=`bookwalker-translator-selection-host`,document.body.appendChild(r);let e=r.attachShadow({mode:`open`}),i=document.createElement(`style`);i.textContent=`
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
  `,e.appendChild(i),l=document.createElement(`div`),l.className=`overlay`,e.appendChild(l),document.addEventListener(`keydown`,f),l.addEventListener(`pointerdown`,e=>{e.button!==0&&e.pointerType===`mouse`||(c=!0,o=e.clientX,s=e.clientY,u=document.createElement(`div`),u.className=`selection-box`,u.style.left=`${o}px`,u.style.top=`${s}px`,l.appendChild(u))}),l.addEventListener(`pointermove`,e=>{if(!c||!u)return;let t=e.clientX,n=e.clientY,r=Math.min(o,t),i=Math.min(s,n),a=Math.abs(o-t),l=Math.abs(s-n);u.style.left=`${r}px`,u.style.top=`${i}px`,u.style.width=`${a}px`,u.style.height=`${l}px`}),l.addEventListener(`pointerup`,e=>{if(!c)return;c=!1;let n=e.clientX,r=e.clientY,i=Math.min(o,n),a=Math.min(s,r),l=Math.abs(o-n),u=Math.abs(s-r);if(d(),l>10&&u>10){let e={innerWidthCss:window.innerWidth,innerHeightCss:window.innerHeight,cropCss:{left:i,top:a,width:l,height:u}};if(typeof chrome>`u`||!chrome.runtime||!chrome.runtime.id){t();return}chrome.runtime.sendMessage({type:`CAPTURE_TAB`},t=>{if(!t||t.error){w({left:i,top:a,width:l,height:u},{error:t?.error||`Failed to capture screenshot.`});return}m(e,t.dataUrl)})}})}function m(t,n){let{cropCss:r}=t,i=w(r,{loading:!0}),a=new Image;a.onload=()=>{try{let n=e(t,a.width,a.height),r=document.createElement(`canvas`);r.width=n.width,r.height=n.height;let o=r.getContext(`2d`);if(!o)throw Error(`Failed to get canvas 2D context.`);o.drawImage(a,n.x,n.y,n.width,n.height,0,0,n.width,n.height),r.toBlob(e=>{if(!e){D(i,{error:`Failed to generate image blob.`});return}chrome.storage.local.get([`showImagePreview`],t=>{let n=t?t.showImagePreview===!0:!1,r=n?URL.createObjectURL(e):void 0;n&&D(i,{loading:!0,imageSrc:r}),h(e,i,r)})},`image/jpeg`,.95)}catch(e){D(i,{error:e.message||`Error during cropping.`})}},a.onerror=()=>{D(i,{error:`Failed to load screenshot.`})},a.src=n}function h(e,t,n){let r=new FormData;if(r.append(`file`,e,`crop.jpg`),typeof chrome>`u`||!chrome.runtime||!chrome.runtime.id){D(t,{error:`Extension context invalidated. Please refresh the page.`,imageSrc:n});return}chrome.storage.local.get([`targetLanguage`,`backendUrl`,`translationModel`,`backendApiKey`],e=>{let i=e.targetLanguage||`en`,a=(e.backendUrl||`http://127.0.0.1:8765`).replace(/\/+$/,``),o=e.translationModel||`deepseek-v4-pro`,s=e.backendApiKey||``,c=`${a}/v1/translate-selection?target_lang=${encodeURIComponent(i)}&model=${encodeURIComponent(o)}`,l={};s&&(l[`X-API-Key`]=s),fetch(c,{method:`POST`,body:r,headers:l}).then(async e=>{if(!e.ok){let t=await e.text();throw Error(`Server error ${e.status}: ${t}`)}return e.json()}).then(e=>{D(t,{japanese:e.japanese||`No text detected`,translation:e.translation||`Translation failed`,imageSrc:n})}).catch(e=>{D(t,{error:e.message||`Failed to connect to backend at ${a}.`,imageSrc:n})})})}var g=340,_=16,v=10;function y(e){let t=window.innerWidth,n=window.innerHeight,r=n-_*2;e.style.maxHeight=`${r}px`;let i=e.getBoundingClientRect(),a=parseFloat(e.style.left)||i.left,o=parseFloat(e.style.top)||i.top;a+i.width>t-_&&(a=t-i.width-_),a<_&&(a=_),i.height>=r?o=_:(o+i.height>n-_&&(o=n-i.height-_),o<_&&(o=_)),e.style.left=`${a}px`,e.style.top=`${o}px`}function b(e){let t=e.dataset.selectionLeft,n=e.dataset.selectionTop,r=e.dataset.selectionWidth,i=e.dataset.selectionHeight;return t===void 0||n===void 0||r===void 0||i===void 0?null:{left:Number(t),top:Number(n),width:Number(r),height:Number(i)}}function x(e){requestAnimationFrame(()=>{let t=b(e),n=window.innerHeight,r=parseFloat(e.style.top)||0,i=e.getBoundingClientRect();if(r+i.height>n-_&&t){let n=t.top-i.height-v;n>=_&&(r=n,e.style.top=`${r}px`)}y(e)})}function S(){a?.(),a=null,i&&=(i.remove(),null)}function C(e,t){a?.();let n=!1,r=0,i=0,o=0,s=0;t.addEventListener(`mousedown`,a=>{a.target.closest(`.close-btn`)||a.button===0&&(n=!0,t.classList.add(`dragging`),r=a.clientX,i=a.clientY,o=parseFloat(e.style.left)||0,s=parseFloat(e.style.top)||0,a.preventDefault())});let c=t=>{n&&(e.style.left=`${o+t.clientX-r}px`,e.style.top=`${s+t.clientY-i}px`)},l=()=>{n&&(n=!1,t.classList.remove(`dragging`),y(e))};document.addEventListener(`mousemove`,c),document.addEventListener(`mouseup`,l),a=()=>{document.removeEventListener(`mousemove`,c),document.removeEventListener(`mouseup`,l)}}function w(e,t){S(),i=document.createElement(`div`),i.id=`bookwalker-translator-popup-host`,document.body.appendChild(i);let n=i.attachShadow({mode:`open`}),r=document.createElement(`style`);r.textContent=`
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
  `,n.appendChild(r);let a=document.createElement(`div`);a.className=`popup`,a.dataset.selectionLeft=String(e.left),a.dataset.selectionTop=String(e.top),a.dataset.selectionWidth=String(e.width),a.dataset.selectionHeight=String(e.height);let o=window.innerWidth,s=e.left,c=e.top+e.height+v;return s+g>o-_&&(s=o-g-_),s<_&&(s=_),c<_&&(c=_),a.style.left=`${s}px`,a.style.top=`${c}px`,n.appendChild(a),E(a,t),a}function T(e){e.dataset.initialized!==`true`&&(e.innerHTML=`
    <div class="header">
      <div class="title-container" style="display: flex; align-items: center; gap: 8px;">
        <img src="${chrome.runtime.getURL(`bell.png`)}" alt="Bookwalka" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; pointer-events: none;" />
        <span class="title">Translating for you...</span>
      </div>
      <button class="close-btn" id="close-bw-popup">&times;</button>
    </div>
    <div class="body" id="popup-body"></div>
  `,e.querySelector(`#close-bw-popup`)?.addEventListener(`click`,()=>{S()}),C(e,e.querySelector(`.header`)),e.dataset.initialized=`true`)}function E(e,t){T(e);let n=e.querySelector(`#popup-body`);t.loading?n.innerHTML=`
      <div class="loading-container">
        ${t.imageSrc?`
          <div style="margin-bottom: 12px; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); padding: 6px; border-radius: 6px; display: flex; justify-content: center;">
            <img src="${t.imageSrc}" style="max-width: 100%; max-height: 80px; object-fit: contain; border-radius: 4px; opacity: 0.5;" />
          </div>
        `:``}
        <div class="spinner"></div>
        <div class="loading-text">OCR & Translating...</div>
      </div>
    `:t.error?n.innerHTML=`
      <div class="error-container">
        ${t.imageSrc?`
          <div style="margin-bottom: 12px; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); padding: 6px; border-radius: 6px; display: flex; justify-content: center;">
            <img src="${t.imageSrc}" style="max-width: 100%; max-height: 80px; object-fit: contain; border-radius: 4px; opacity: 0.5;" />
          </div>
        `:``}
        <strong>Error:</strong> ${t.error}
      </div>
    `:n.innerHTML=`
      <div class="content-box">
        ${t.imageSrc?`
          <div class="text-block" style="margin-bottom: 12px;">
            <div class="label" style="opacity: 0.6; font-size: 11px; margin-bottom: 4px;">Captured Image Crop</div>
            <div style="background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); padding: 6px; border-radius: 6px; display: flex; justify-content: center;">
              <img src="${t.imageSrc}" style="max-width: 100%; max-height: 80px; object-fit: contain; border-radius: 4px;" />
            </div>
          </div>
        `:``}
        <div class="text-block">
          <div class="label">Japanese (OCR)</div>
          <div class="text-val ja">${t.japanese||``}</div>
        </div>
        <div class="text-block">
          <div class="label">Translation</div>
          <div class="text-val translation">${t.translation||``}</div>
        </div>
      </div>
    `,x(e)}function D(e,t){E(e,t)}chrome.runtime.onMessage.addListener((e,t,n)=>{console.log(`Bookwalka: Content script received message`,e);try{if(e.type===`START_SELECTION`||e.type===`START_SELECTION_TOP`){if(typeof chrome>`u`||!chrome.runtime){console.error(`Bookwalka: chrome or chrome.runtime is undefined!`),n({status:`error`});return}let e=()=>{console.log(`Bookwalka: Starting area selection...`),p(),n({status:`started`})};return chrome.storage&&chrome.storage.local?chrome.storage.local.get([`extensionEnabled`],t=>{if(!(!t||t.extensionEnabled!==!1)){console.log(`Bookwalka: Extension is disabled in settings.`),n({status:`disabled`});return}e()}):(console.log(`Bookwalka: chrome.storage.local not available, defaulting to enabled.`),e()),!0}}catch(e){console.error(`Bookwalka: Error in message listener`,e)}}),document.addEventListener(`keydown`,e=>{let t=document.activeElement;if(!(t&&(t.tagName===`INPUT`||t.tagName===`TEXTAREA`||t.isContentEditable))&&e.key.toLowerCase()===`t`){if(console.log(`Bookwalka: Key 'T' pressed.`),typeof chrome>`u`||!chrome.runtime){console.warn(`Bookwalka: extension runtime is not available.`);return}let e=()=>{window===window.top?p():chrome.runtime.sendMessage({type:`REQUEST_START_SELECTION`})};chrome.storage&&chrome.storage.local?chrome.storage.local.get([`extensionEnabled`],t=>{(!t||t.extensionEnabled!==!1)&&e()}):e()}});function O(){if(document.getElementById(`bookwalka-fab-container`))return;let e=document.createElement(`div`);e.id=`bookwalka-fab-container`;let t=e.attachShadow({mode:`open`}),n=document.createElement(`style`);n.textContent=`
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
  `,t.appendChild(n);let r=document.createElement(`div`);r.className=`fab`,r.textContent=`文`,t.appendChild(r);let i=!1,a=0,o=0,s=0,c=0,l=!1;r.addEventListener(`pointerdown`,e=>{i=!0,l=!1,a=e.clientX,o=e.clientY;let t=r.getBoundingClientRect();s=window.innerWidth-t.right,c=window.innerHeight-t.bottom,r.setPointerCapture(e.pointerId)}),r.addEventListener(`pointermove`,e=>{if(!i)return;let t=e.clientX-a,n=e.clientY-o;(Math.abs(t)>5||Math.abs(n)>5)&&(l=!0);let u=s-t,d=c-n;r.style.right=`${Math.max(10,Math.min(window.innerWidth-60,u))}px`,r.style.bottom=`${Math.max(10,Math.min(window.innerHeight-60,d))}px`}),r.addEventListener(`pointerup`,e=>{i&&(i=!1,r.releasePointerCapture(e.pointerId),l||(console.log(`Bookwalka: FAB tapped.`),p()))}),document.body.appendChild(e)}function k(){if(!document.body)return;let e=document.getElementById(`bookwalka-fab-container`);n?e?e.style.display=`block`:O():e&&(e.style.display=`none`)}document.body?k():document.addEventListener(`DOMContentLoaded`,k)})();