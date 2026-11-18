const { test } = require('node:test');
const assert = require('node:assert/strict');
const { drive, viewer, load } = require('./helpers.cjs');
test('download rejects HTTP errors, login redirects, HTML and binary responses', async () => {
  const app = drive();
  try {
    const responses = [
      { ok: false, status: 403 },
      { ok: true, url: 'https://accounts.google.com/login' },
      { ok: true, headers: { get: () => 'text/html' } },
      { ok: true, text: async () => '<!doctype html><html>Login</html>' },
      { ok: true, text: async () => 'binary\0data' }
    ];
    for (const response of responses) {
      app.w.fetch = async () => response;
      await assert.rejects(app.w.DriveMarkdown.fetchMarkdown('fileA', new app.w.AbortController().signal));
    }
    app.w.fetch = async () => ({ ok: true, headers: { get: () => 'text/plain; charset=utf-8' }, text: async () => '' });
    assert.equal(await app.w.DriveMarkdown.fetchMarkdown('fileA'), '');
  } finally { app.dom.window.close(); }
});
test('fallback reads only active preview text, including short documents', () => {
  const app = drive();
  try {
    app.w.document.body.innerHTML = '<pre>unrelated page content</pre><div role="dialog" hidden><pre>hidden</pre></div>';
    assert.equal(app.w.DriveMarkdown.scrapePreviewText(), null);
    app.w.document.body.insertAdjacentHTML('beforeend', '<div role="dialog"><pre># Hi</pre></div>');
    assert.equal(app.w.DriveMarkdown.scrapePreviewText(), '# Hi');
  } finally { app.dom.window.close(); }
});
test('ready before download completion delivers errors without retry loops', async () => {
  const app = drive();
  try {
    let finish;
    app.w.fetch = () => new Promise(resolve => { finish = resolve; });
    await app.tick();
    let message;
    app.frame().contentWindow.postMessage = data => { message = data; };
    app.send({ action: 'VIEWER_READY' });
    finish({ ok: false, status: 403 }); await app.settle();
    assert.equal(message.action, 'RENDER_ERROR'); assert.match(message.content, /403/);
    assert.equal(app.timers.size, 0);
    app.send({ action: 'CLOSE_VIEWER' }); await app.settle(); await app.tick();
    assert.equal(app.frame(), null);
  } finally { app.dom.window.close(); }
});
test('close while loading aborts request and an empty file is sent to viewer', async () => {
  const app = drive();
  try {
    let finish; let signal;
    app.w.fetch = (_url, options) => { signal = options.signal; return new Promise(resolve => { finish = resolve; }); };
    await app.tick(); app.send({ action: 'CLOSE_VIEWER' });
    assert.equal(signal.aborted, true);
    finish({ ok: true, text: async () => '# Late' }); await app.settle();
    assert.equal(app.frame(), null);
    app.w.fetch = async () => ({ ok: true, text: async () => '' });
    app.manual(); await app.settle();
    let message; app.frame().contentWindow.postMessage = data => { message = data; };
    app.send({ action: 'VIEWER_READY' });
    assert.equal(message.action, 'RENDER'); assert.equal(message.content, '');
  } finally { app.dom.window.close(); }
});
test('viewer presents download errors as text', () => {
  const { dom, w, content } = viewer();
  try {
    load(w, 'src/viewer/viewer.ts');
    w.dispatchEvent(new w.MessageEvent('message', {
      source: w.parent, origin: 'https://drive.google.com',
      data: { action: 'RENDER_ERROR', content: '<img onerror=alert(1)>' }
    }));
    assert.equal(content.querySelector('img'), null);
    assert.match(content.textContent, /Unable to load Markdown/);
  } finally { dom.window.close(); }
});
