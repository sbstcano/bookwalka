# Bookwalka Chrome Extension

This is the client-side component of the Bookwalka translation tool. It is built using React, TypeScript, and Vite.

## Structure

* `src/main.tsx` & `src/App.tsx`: The main extension popup interface for configuration and testing.
* `src/content/content-script.ts`: Injected script that listens for the `T` key shortcut, displays a transparent drawing canvas overlay, captures mouse drag coordinates, and displays translations in a premium shadow-DOM popup.
* `src/content/coordinate-mapper.ts`: Utility to translate CSS-based selection coordinates into exact physical pixel coordinates on the tab screenshot.
* `src/background/service-worker.ts`: Chrome extension background worker that executes the `captureVisibleTab` API and coordinates messaging between frames.
* `public/manifest.json`: Manifest V3 configuration declaring background service workers, content scripts, permissions, and web-accessible resources.

## Commands

### Install dependencies
```bash
npm install
```

### Build for production
```bash
npm run build
```
This compiles and bundles all entry points into the `dist/` directory, which can then be imported directly as an unpacked extension in Chrome (`chrome://extensions/`).

### Run unit tests
```bash
npm run test
```
Runs Vitest for testing frontend components and coordinate mapping calculations.
