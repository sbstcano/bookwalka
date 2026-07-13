# Bookwalka

Chromium Extension and local backend server to translate manga text on any web page from Japanese to multiple languages.

## Architecture

* **Extension (Chromium Manifest V3)**:
  * Rectangular selection tool in the active tab.
  * Tab screenshot capture via `chrome.tabs.captureVisibleTab()`.
  * Precise cropping and conversion of the selection to a PNG image.
  * Local API requests to the backend.
  * Premium translation popup rendering on the page.
* **Backend (FastAPI)**:
  * Japanese text extraction (OCR) via a persistent instance of `manga-ocr`.
  * Context-aware Japanese-to-Language translation via providers (Mock, Gemini, OpenAI).
  * Strict response schema validation.

---

## Installation & Setup

### 1. Python Backend

#### Prerequisites
* Python 3.11+

#### Dependencies Installation
1. Create a virtual environment and install the dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   ```

#### Configuration (.env)
Copy the example file and edit it:
```bash
cp backend/.env.example backend/.env
```

Available variables are documented in `backend/.env.example`.

##### Using DeepSeek (Cloud Model)
To use DeepSeek (e.g., `deepseek-v4-pro` or `deepseek-v4-flash`), configure:
```ini
MANGA_TRANSLATION_PROVIDER=deepseek
MANGA_TRANSLATION_MODEL=deepseek-v4-pro # Or deepseek-v4-flash
MANGA_DEEPSEEK_API_KEY=your_deepseek_api_key
```

##### Securing your VPS (Token Authentication)
If you deploy this backend server to a public VPS, secure it by setting an API key:
```ini
MANGA_BACKEND_API_KEY=your_secure_secret_key
```
*(When set, endpoints like `/v1/health` and `/v1/translate-selection` will require the `X-API-Key` header matching this secret).*

##### Using Local LLMs (LM Studio / Ollama)
Since LM Studio and Ollama offer APIs compatible with the OpenAI protocol, you can use them as a provider by configuring:
```ini
MANGA_TRANSLATION_PROVIDER=openai
MANGA_OPENAI_API_BASE=http://localhost:11434/v1 # Replace with your local server port (e.g. 11434 for Ollama)
MANGA_TRANSLATION_MODEL=your-local-model-name
```
*(No `MANGA_OPENAI_API_KEY` is required for local endpoints).*

#### Starting the Server
Run the FastAPI application:
```bash
source venv/bin/activate
cd backend
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload
```
The server will be available at `http://127.0.0.1:8765`.

---

### 2. Chrome Extension

#### Prerequisites
* Node.js v18+ and npm

#### Installation & Compilation
1. Install the packages:
   ```bash
   cd extension
   npm install
   ```
2. Build the project (generates the `dist/` directory containing the manifest and compiled scripts):
   ```bash
   npm run build
   ```

#### Loading in Chromium / Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click on **Load unpacked** in the top left corner.
4. Select the generated `extension/dist` directory.

---

### 3. Safari Web Extension (iOS / iPadOS)

For platforms like iOS Safari where BookWalker uses a cross-origin sandboxed iframe which blocks webpages from reading page pixels (tainted canvas security error), a native Safari Web Extension is generated to perform screenshots via privileged browser APIs.

#### Compilation & Converting
1. Compile the extension and convert it to a native iOS project:
   ```bash
   cd extension
   npm run build
   xcrun safari-web-extension-converter dist --ios-only --copy-resources --no-open --no-prompt --app-name Bookwalka --bundle-identifier com.sbstcano.BookwalkaApp --project-location ../safari-extension --force
   ```

#### Building in Xcode
1. Open Xcode on your Mac.
2. Open the generated project `safari-extension/Bookwalka/Bookwalka.xcodeproj`.
3. Select your iOS Device in the top destination bar.
4. Select the **Bookwalka** project in the left pane, go to **Targets** -> **Bookwalka** -> **Signing & Capabilities** and set your **Team** (personal or company profile).
5. Do the same for **Bookwalka Extension** target.
6. Clean the build folder (`Cmd + Shift + K`) and run the project (`Cmd + R`) to deploy the app to your device.
7. On your iPhone/iPad, go to **Settings** -> **Safari** -> **Extensions** and enable **Bookwalka**. Ensure permissions are set to "Always Allow on Every Website".

---

## Usage

### Desktop (Chrome / Chromium)
1. Open any web page containing Japanese text (e.g., BookWalker JP, MangaDex, or any raw manga site).
2. Click the extension icon to open the configuration panel.
3. Saisissez votre adresse de VPS (HTTPS) et éventuellement la clé d'API.
4. Click **Translate Area** (or simply press the **T** key on your keyboard).
5. Draw a selection box over a speech bubble or any Japanese text.
6. A premium popup will instantly appear next to the selection showing the original Japanese text (via OCR) and the translation.
7. You can press the **Escape** key at any time to cancel selection mode.

### Mobile (iOS Safari)
1. Open BookWalker JP or any manga reader page in Safari.
2. Tap the puzzle icon 🧩 in the address bar, select **Bookwalka**, and enter your **Backend URL** (must be `https://` for VPS deployment to bypass Mixed Content restrictions) and **Backend API Key** in the settings.
3. Once the status indicator shows **Backend Online**, you will see a blue floating action button with the character **`文`** in the bottom-right corner of the viewport (or inside the reader iframe).
4. Tap this floating button to enter selection mode, then touch-drag to draw a selection over a Japanese speech bubble.
5. The translation popup will appear instantly. You can drag the button **`文`** to reposition it anywhere on the page.

---

## FAQ

**Does it work with BookWalker JP?**

Yes — it was built for that!

---

## Testing

### Extension Unit Tests (Vitest)
```bash
cd extension
npm run test
```

### Backend Unit Tests (Pytest)
```bash
source venv/bin/activate
cd backend
pytest
```

---

## Standalone Desktop Packaging

To compile and package the standalone Desktop Companion App:

### 1. Compile the Python Backend Standalone Binary

Before packaging the Electron companion, package the Python FastAPI backend into a standalone executable. Electron Builder is configured to look for it at `../backend/dist/bookwalka-backend`.

#### On Linux
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate your virtual environment and run the build script:
   ```bash
   source ../venv/bin/activate
   ./build_backend.sh
   ```

#### On Windows
1. Open PowerShell / Command Prompt and navigate to the backend directory:
   ```cmd
   cd backend
   ```
2. Activate your virtual environment and run the batch file:
   ```cmd
   ..\venv\Scripts\activate
   pip install pyinstaller
   build_backend.bat
   ```

#### On macOS
1. Open your terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate your virtual environment and run the build script:
   ```bash
   source ../venv/bin/activate
   ./build_backend.sh
   ```

---

### 2. Package the Electron Desktop Application

Once the backend is built and exists in `backend/dist/bookwalka-backend`, package the Electron app.

1. Navigate to the desktop-app folder:
   ```bash
   cd desktop-app
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Build the distributable package:
   ```bash
   npm run dist
   ```

#### Output Formats:
* **On Linux**: Produces an **`AppImage`** under `desktop-app/dist/`.
* **On Windows**: Produces a **`setup.exe`** (NSIS installer) under `desktop-app/dist/`.
* **On macOS**: Produces a **`.dmg`** bundle (with an installer) under `desktop-app/dist/`.
