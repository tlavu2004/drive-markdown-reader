const { test } = require('node:test');
const assert = require('node:assert/strict');
const { drive } = require('./helpers.cjs');
test('closing survives DOM updates but manual reopen and another file still work', async () => {
  const app = drive();
  try {
    await app.tick(); assert.ok(app.frame());
    app.send({ action: 'CLOSE_VIEWER' });
    app.w.document.body.appendChild(app.w.document.createElement('div'));
    await app.settle(); await app.tick();
    assert.equal(app.frame(), null);
    app.manual(); await app.settle(); assert.ok(app.frame());
    app.send({ action: 'CLOSE_VIEWER' });
    app.w.history.pushState({}, '', '/file/d/fileB/view');
    app.w.document.title = 'second.md - Google Drive';
    await app.settle(); await app.tick(); assert.ok(app.frame());
    assert.ok(app.timers.size <= 1);
  } finally { app.dom.window.close(); }
});
test('late fetch result cannot replace a newer manually opened file', async () => {
  const app = drive();
  try {
    let finishA; let signalA; let calls = 0;
    app.w.fetch = async (_url, options) => {
      if (++calls === 1) {
        signalA = options.signal;
        return { ok: true, text: () => new Promise(resolve => { finishA = resolve; }) };
      }
      return { ok: true, text: async () => '# New content' };
    };
    await app.tick(); assert.ok(app.frame());
    app.manual(); await app.settle();
    assert.equal(signalA.aborted, true);
    const frame = app.frame(); assert.ok(frame);
    finishA('# Stale content'); await app.settle();
    assert.equal(app.frame(), frame);
    let message;
    frame.contentWindow.postMessage = data => { message = data; };
    app.send({ action: 'VIEWER_READY' });
    assert.equal(message.content, '# New content');
  } finally { app.dom.window.close(); }
});
test('navigating away aborts loading and late response cannot reopen viewer', async () => {
  const app = drive();
  try {
    let finish; let signal;
    app.w.fetch = (_url, options) => { signal = options.signal; return new Promise(resolve => { finish = resolve; }); };
    await app.tick();
    app.w.history.pushState({}, '', '/drive/my-drive');
    app.w.document.title = 'My Drive'; await app.settle();
    assert.equal(signal.aborted, true);
    finish({ ok: true, text: async () => '# Too late' });
    await app.settle(); await app.tick();
    assert.equal(app.frame(), null);
  } finally { app.dom.window.close(); }
});
test('extracted Drive navigation preserves Previous and Next file behavior', async () => {
  const app = drive();
  try {
    app.w.document.body.insertAdjacentHTML('beforeend', '<div><div data-id="fileA"></div><div data-id="fileB"></div></div>');
    app.w.fetch = async url => ({ ok: true, text: async () => new URL(url).searchParams.get('id') });
    await app.tick();
    app.send({ action: 'NAVIGATE', direction: 1 }); await app.settle();
    let message;
    app.frame().contentWindow.postMessage = data => { message = data; };
    app.send({ action: 'VIEWER_READY' }); assert.equal(message.content, 'fileB');
    app.send({ action: 'NAVIGATE', direction: -1 }); await app.settle();
    app.frame().contentWindow.postMessage = data => { message = data; };
    app.send({ action: 'VIEWER_READY' }); assert.equal(message.content, 'fileA');
  } finally { app.dom.window.close(); }
});
