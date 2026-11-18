import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const viewerLibraries = [
  'vendor/dompurify/purify.min.js',
  'vendor/marked/marked.min.js',
  'vendor/mermaid/mermaid.min.js'
];

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [{
    name: 'extension-assets',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        if (!context.filename.endsWith('/viewer/index.html') && !context.filename.endsWith('\\viewer\\index.html')) return;
        return viewerLibraries.map(src => ({ tag: 'script', attrs: { src: `../../${src}` }, injectTo: 'head-prepend' as const }));
      }
    },
    buildStart() {
      for (const file of ['manifest.json', 'src/viewer/app/viewer.css', ...viewerLibraries]) this.addWatchFile(resolve(root, file));
    },
    generateBundle() {
      for (const directory of ['vendor', 'licenses']) {
        for (const entry of readdirSync(resolve(root, directory), { recursive: true, withFileTypes: true })) {
          if (!entry.isFile()) continue;
          const absolute = resolve(entry.parentPath, entry.name);
          this.addWatchFile(absolute);
          const fileName = relative(root, absolute).replaceAll('\\', '/');
          this.emitFile({ type: 'asset', fileName, source: readFileSync(absolute) });
        }
      }
      this.emitFile({ type: 'asset', fileName: 'manifest.json', source: readFileSync(resolve(root, 'manifest.json')) });
      // Keep the existing content-script CSS behavior during the tooling migration.
      this.emitFile({ type: 'asset', fileName: 'content.css', source: readFileSync(resolve(root, 'src/viewer/app/viewer.css')) });
    }
  }],
  build: {
    target: 'chrome120',
    modulePreload: { polyfill: false },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: resolve(root, 'src/popup/index.html'),
        viewer: resolve(root, 'src/viewer/index.html')
      }
    }
  }
});
