const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { buildSync } = require('esbuild');
const compiled = new Map();
function load(window, file) {
  if (file === 'src/viewer/main.tsx') {
    if (!compiled.has(file)) compiled.set(file, buildSync({
      stdin: { contents: "export { act } from 'react'; export { mountViewer } from './src/viewer/app/mount';", resolveDir: root, loader: 'ts' },
      bundle: true, write: false, format: 'iife', globalName: '__testModule',
      define: { 'process.env.NODE_ENV': '"development"' }, target: 'chrome120'
    }).outputFiles[0].text);
    window.eval(compiled.get(file) + '\nwindow.__testModule = __testModule;');
    const { act, mountViewer } = window.__testModule;
    window.IS_REACT_ACT_ENVIRONMENT = true;
    window.__viewerAct = act;
    const dispatch = window.dispatchEvent.bind(window);
    window.dispatchEvent = event => { let result; act(() => { result = dispatch(event); }); return result; };
    const click = window.HTMLElement.prototype.click;
    window.HTMLElement.prototype.click = function () { act(() => click.call(this)); };
    act(() => { window.__viewerRoot = mountViewer(); });
    return;
  }
  if (file.endsWith('.ts')) {
    if (!compiled.has(file)) compiled.set(file, buildSync({
      entryPoints: [path.join(root, file)], bundle: true, write: false,
      format: 'iife', globalName: '__testModule', target: 'chrome120'
    }).outputFiles[0].text);
    window.eval(compiled.get(file) + '\nwindow.__testModule = __testModule;');
    if (file.endsWith('/drive.ts')) window.DriveMarkdown = window.__testModule;
    if (file.endsWith('/createMarkdownRenderer.ts')) window.createMarkdownRenderer = window.__testModule.createMarkdownRenderer;
    return;
  }
  window.eval(fs.readFileSync(path.join(root, file), 'utf8'));
}
function viewer() {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'src/viewer/index.html'), 'utf8'), {
    url: 'https://extension.test/src/viewer/index.html', runScripts: 'outside-only'
  });
  const w = dom.window;
  const close = w.close.bind(w);
  w.close = () => {
    if (w.__viewerRoot) w.__viewerAct(() => w.__viewerRoot.unmount());
    close();
  };
  const calls = [];
  w.mermaid = { initialize: config => calls.push(config), run: async () => {} };
  for (const file of ['vendor/dompurify/purify.min.js', 'vendor/marked/marked.min.js', 'src/viewer/rendering/createMarkdownRenderer.ts']) load(w, file);
  return { dom, w, calls, content: w.document.getElementById('content') };
}
module.exports = { load, viewer };
function drive() {
  const dom = new JSDOM('<title>example.md - Google Drive</title><body></body>', {
    url: 'https://drive.google.com/file/d/fileA/view', runScripts: 'outside-only'
  });
  const w = dom.window;
  const timers = new Map(); let nextTimer = 0; let runtimeListener;
  w.setTimeout = callback => { timers.set(++nextTimer, callback); return nextTimer; };
  w.clearTimeout = id => timers.delete(id);
  const alerts = []; w.alert = text => alerts.push(text);
  w.chrome = { runtime: {
    getURL: file => `chrome-extension://test-extension/${file}`,
    onMessage: { addListener: callback => { runtimeListener = callback; } }
  } };
  w.fetch = async () => ({ ok: true, text: async () => '# File A' });
  load(w, 'src/content/drive.ts'); load(w, 'dist/content.js');
  const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const tick = async () => {
    const pending = [...timers.values()]; timers.clear();
    pending.forEach(callback => callback()); await settle();
  };
  const send = (data, overrides = {}) => {
    const frame = w.document.getElementById('drive-md-viewer-frame');
    w.dispatchEvent(new w.MessageEvent('message', {
      data, origin: 'chrome-extension://test-extension', source: frame?.contentWindow, ...overrides
    }));
  };
  const manual = () => runtimeListener({ action: 'RENDER_NOW' }, {}, () => {});
  return { dom, w, timers, tick, settle, send, manual, alerts, frame: () => w.document.getElementById('drive-md-viewer-frame') };
}
module.exports.drive = drive;
