const { test } = require('node:test');
const assert = require('node:assert/strict');
const { viewer, load } = require('./helpers.cjs');
const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function send(w, action, content) {
  w.dispatchEvent(new w.MessageEvent('message', { source: w.parent, origin: 'https://drive.google.com', data: { action, content } }));
}
test('StrictMode cleans message listeners and body classes on unmount and subscribes once on remount', async () => {
  const { dom, w } = viewer();
  try {
    const listeners = new Set();
    const add = w.addEventListener.bind(w), remove = w.removeEventListener.bind(w);
    w.addEventListener = (type, listener, options) => { if (type === 'message') listeners.add(listener); add(type, listener, options); };
    w.removeEventListener = (type, listener, options) => { if (type === 'message') listeners.delete(listener); remove(type, listener, options); };
    load(w, 'src/viewer/main.tsx');
    assert.equal(listeners.size, 1);
    w.document.getElementById('drive-md-mermaid-toggle').click();
    w.__viewerAct(() => w.__viewerRoot.unmount());
    assert.equal(listeners.size, 0);
    assert.equal(w.document.body.classList.contains('dark-mode'), false);
    assert.equal(w.document.body.classList.contains('show-mermaid-source'), false);
    send(w, 'RENDER', '# ignored');
    assert.equal(w.document.querySelector('h1'), null);
    w.__viewerAct(() => { w.__viewerRoot = w.__testModule.mountViewer(); });
    assert.equal(listeners.size, 1);
    send(w, 'RENDER', '# Remounted'); await settle();
    assert.equal(w.document.querySelector('#content h1').textContent, 'Remounted');
    assert.equal(w.document.getElementById('drive-md-mermaid-toggle').textContent, '📝 Code');
  } finally { dom.window.close(); }
});
test('late Mermaid completion cannot overwrite a React error state or an unmounted viewer', async () => {
  const { dom, w } = viewer();
  try {
    let finish;
    w.mermaid.run = async () => { await new Promise(resolve => { finish = resolve; }); };
    load(w, 'src/viewer/main.tsx');
    send(w, 'RENDER', '```mermaid\ngraph TD; A-->B\n```'); await settle();
    assert.equal(typeof finish, 'function');
    send(w, 'RENDER_ERROR', '<img src=x onerror=alert(1)>');
    finish(); await settle();
    assert.equal(w.document.querySelector('#content img'), null);
    assert.match(w.document.getElementById('content').textContent, /Unable to load Markdown/);
    send(w, 'RENDER', '# Recovery'); await settle();
    assert.equal(w.document.querySelector('#content h1').textContent, 'Recovery');
    w.__viewerAct(() => w.__viewerRoot.unmount());
    assert.equal(w.document.getElementById('content'), null);
  } finally { dom.window.close(); }
});
test('React preferences persist and navigation/close messages keep their original protocol', () => {
  const { dom, w } = viewer();
  try {
    w.localStorage.setItem('drive-md-dark-mode', 'false');
    w.localStorage.setItem('drive-md-zoom', '1.4');
    const sent = [];
    w.parent.postMessage = (message, origin) => sent.push({ ...message, origin });
    load(w, 'src/viewer/main.tsx');
    assert.equal(w.document.getElementById('drive-md-darkmode').textContent, '☀️ Light');
    assert.equal(w.document.getElementById('drive-md-zoom-reset').textContent, '140%');
    w.document.getElementById('drive-md-darkmode').click();
    w.document.getElementById('drive-md-zoom-reset').click();
    assert.equal(w.localStorage.getItem('drive-md-dark-mode'), 'true');
    assert.equal(w.localStorage.getItem('drive-md-zoom'), '1');
    for (const id of ['drive-md-nav-prev', 'drive-md-nav-next', 'drive-md-close']) w.document.getElementById(id).click();
    assert.deepEqual(sent.slice(-3), [
      { action: 'NAVIGATE', direction: -1, origin: 'https://drive.google.com' },
      { action: 'NAVIGATE', direction: 1, origin: 'https://drive.google.com' },
      { action: 'CLOSE_VIEWER', origin: 'https://drive.google.com' }
    ]);
  } finally { dom.window.close(); }
});
test('React zoom normalizes invalid saved values and stays within the existing bounds', () => {
  const { dom, w } = viewer();
  try {
    w.localStorage.setItem('drive-md-zoom', 'NaN');
    load(w, 'src/viewer/main.tsx');
    const label = () => w.document.getElementById('drive-md-zoom-reset').textContent;
    assert.equal(label(), '100%');
    w.__viewerAct(() => { for (let i = 0; i < 30; i++) w.document.getElementById('drive-md-zoom-in').click(); });
    assert.equal(label(), '250%');
    w.__viewerAct(() => { for (let i = 0; i < 30; i++) w.document.getElementById('drive-md-zoom-out').click(); });
    assert.equal(label(), '50%');
  } finally { dom.window.close(); }
});
test('remount during a pending diagram cancels queued work and serializes the new instance', async () => {
  const { dom, w } = viewer();
  try {
    let finish; let running = 0; let maxRunning = 0; let runs = 0;
    w.mermaid.run = async () => {
      maxRunning = Math.max(maxRunning, ++running);
      if (++runs === 1) await new Promise(resolve => { finish = resolve; });
      running--;
    };
    load(w, 'src/viewer/main.tsx');
    send(w, 'RENDER', '```mermaid\ngraph TD; Old-->A\n```'); await settle();
    assert.equal(typeof finish, 'function');
    send(w, 'RENDER_ERROR', 'Temporary failure');
    send(w, 'RENDER', '```mermaid\ngraph TD; New-->B\n```'); await settle();
    assert.equal(runs, 1);
    finish(); await settle();
    assert.equal(maxRunning, 1); assert.equal(runs, 2);
    assert.match(w.document.querySelector('.mermaid-source').textContent, /New-->B/);
    w.__viewerAct(() => w.__viewerRoot.unmount());
    assert.equal(w.document.getElementById('content'), null);
  } finally { dom.window.close(); }
});
