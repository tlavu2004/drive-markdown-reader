const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function load(window, file) { window.eval(fs.readFileSync(path.join(root, file), 'utf8')); }
function viewer() {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'src/viewer.html'), 'utf8'), {
    url: 'https://extension.test/src/viewer.html', runScripts: 'outside-only'
  });
  const w = dom.window;
  const calls = [];
  w.mermaid = { initialize: config => calls.push(config), run: async () => {} };
  for (const file of ['src/lib/purify.min.js', 'src/lib/marked.min.js', 'src/render.js']) load(w, file);
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
  load(w, 'src/drive.js'); load(w, 'src/content.js');
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
