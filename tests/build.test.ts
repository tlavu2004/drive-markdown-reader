import { bundleText, element, type TestWindow } from './helpers.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { buildSync } from 'esbuild';
const root = path.resolve(import.meta.dirname, '..', 'dist');
const manifest: { action: { default_popup: string }; content_scripts: { js: string[] }[] } = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
async function waitFor(check: () => void) {
  const deadline = Date.now() + 2000;
  while (true) {
    try { check(); return; } catch (error) {
      if (Date.now() >= deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }
}
function page(reference: string) {
  const html = path.join(root, reference);
  const dom = new JSDOM(fs.readFileSync(html, 'utf8'), {
    url: `https://extension.test/${reference}`, runScripts: 'outside-only'
  });
  const start = () => {
    const script = dom.window.document.querySelector('script[type="module"]');
    const source = script?.getAttribute('src');
    assert.ok(source, 'Expected the built module entry');
    const entry = path.resolve(path.dirname(html), source);
    const code = bundleText(buildSync({ entryPoints: [entry], bundle: true, write: false, format: 'iife', target: 'chrome120' }));
    dom.window.eval(code);
  };
  return { dom, w: dom.window as unknown as TestWindow, start };
}
test('built popup injects the exact classic content bundle declared by manifest', async () => {
  const { dom, w, start } = page(manifest.action.default_popup);
  try {
    let sends = 0;
    let files: string[] | undefined;
    w.setTimeout = callback => { if (typeof callback === 'function') queueMicrotask(() => callback()); return 1; };
    w.chrome = {
      tabs: {
        query: async () => [{ id: 7, url: 'https://drive.google.com/drive/my-drive' }],
        sendMessage: async () => { if (++sends === 1) throw new Error('No listener'); return { success: true }; }
      },
      scripting: { executeScript: async (options: { files: string[] }) => { files = Array.from(options.files); } }
    };
    start(); element(w.document, 'btn-render').click(); await settle();
    const entry = manifest.content_scripts[0];
    assert.ok(entry, 'Expected the Drive content script in the manifest');
    assert.deepEqual(files, entry.js);
    assert.equal(sends, 2);
    assert.equal(element(w.document, 'status').textContent, 'Render triggered!');
  } finally { w.dispatchEvent(new w.Event('pagehide')); dom.window.close(); }
});
test('built viewer loads its shared chunks and renders sanitized Markdown and controls', async () => {
  const { dom, w, start } = page('src/viewer/index.html');
  try {
    // Keep Mermaid mocked for SVG layout, but load the actual packaged parser and sanitizer.
    for (const script of w.document.querySelectorAll('script:not([type="module"])[src]')) {
      const src = script.getAttribute('src');
      assert.ok(src, 'Expected the built vendor script URL');
      if (!src.includes('/mermaid/')) w.eval(fs.readFileSync(path.resolve(root, 'src/viewer', src), 'utf8'));
    }
    const themes: string[] = [];
    w.mermaid = { initialize: config => { themes.push(config.theme); }, run: async () => {} };
    start();
    w.dispatchEvent(new w.PageTransitionEvent('pagehide', { persisted: true }));
    w.dispatchEvent(new w.MessageEvent('message', {
      source: w.parent, origin: 'https://drive.google.com',
      data: { action: 'RENDER', content: '# Built viewer\n\n<img src=x onerror=alert(1)>\n\n```mermaid\ngraph TD; A-->B\n```' }
    }));
    await waitFor(() => assert.equal(w.document.querySelector('#content h1')?.textContent, 'Built viewer'));
    assert.equal(w.document.querySelector('[onerror]'), null);
    element(w.document, 'drive-md-darkmode').click(); await settle();
    await waitFor(() => assert.deepEqual(themes, ['dark', 'default']));
    element(w.document, 'drive-md-zoom-in').click();
    await waitFor(() => assert.equal(element(w.document, 'drive-md-zoom-reset').textContent, '110%'));
  } finally { w.dispatchEvent(new w.Event('pagehide')); dom.window.close(); }
});
