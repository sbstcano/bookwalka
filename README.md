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

## Usage

1. Open any web page containing Japanese text (e.g., BookWalker JP, MangaDex, or any raw manga site).
2. Click the extension icon to open the configuration panel.
3. Verify that the status indicator says **Backend Online**.
4. Click **Translate Area** (or simply press the **T** key on your keyboard).
5. Draw a selection box over a speech bubble or any Japanese text.
6. A premium popup will instantly appear next to the selection showing the original Japanese text (via OCR) and the translation.
7. You can press the **Escape** key at any time to cancel selection mode.

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
