import { build } from 'vite';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const watch = process.argv.includes('--watch') ? {} : null;
// HTML pages use ES modules; Chrome content scripts require a standalone classic script.
await build({ root, build: { watch, emptyOutDir: !watch } });
await build({
  root, configFile: false, publicDir: false,
  build: {
    outDir: 'dist', emptyOutDir: false, target: 'chrome120', sourcemap: true, watch,
    lib: { entry: fileURLToPath(new URL('../src/content/index.ts', import.meta.url)), name: 'DriveMarkdownReader', formats: ['iife'], fileName: () => 'content.js' }
  }
});
