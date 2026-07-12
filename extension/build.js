import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runBuild() {
  console.log('Building React Popup UI...');
  await build({
    configFile: false,
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'index.html'),
        },
      },
    },
  });

  console.log('Building Content Script...');
  await build({
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/content/content-script.ts'),
        name: 'ContentScript',
        formats: ['iife'],
        fileName: () => 'content-script.js',
      },
    },
  });

  console.log('Building Service Worker...');
  await build({
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/background/service-worker.ts'),
        name: 'ServiceWorker',
        formats: ['iife'],
        fileName: () => 'service-worker.js',
      },
    },
  });

  // Copy manifest.json from public/ to dist/ if not copied automatically
  const manifestSrc = resolve(__dirname, 'public/manifest.json');
  const manifestDst = resolve(__dirname, 'dist/manifest.json');
  if (fs.existsSync(manifestSrc)) {
    console.log('Copying manifest.json to dist...');
    fs.copyFileSync(manifestSrc, manifestDst);
  }
}

runBuild().catch(err => {
  console.error(err);
  process.exit(1);
});
