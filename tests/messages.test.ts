import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewer, load, element } from './helpers.ts';
test('viewer accepts only typed render messages from Drive parent', async () => {
  const { dom, w } = viewer();
  try {
    load(w, 'src/viewer/main.tsx');
    const content = element(w.document, 'content');
    const send = (data: unknown, origin = 'https://drive.google.com', source = w.parent) =>
      w.dispatchEvent(new w.MessageEvent('message', { data, origin, source }));
    send(null); send({ action: 'RENDER', content: {} });
    send({ action: 'RENDER', content: 'wrong origin' }, 'https://evil.test');
    const otherFrame = w.document.body.appendChild(w.document.createElement('iframe'));
    assert.ok(otherFrame.contentWindow);
    send({ action: 'RENDER', content: 'wrong source' }, undefined, otherFrame.contentWindow);
    assert.equal(content.textContent.trim(), 'Loading Markdown…');
    send({ action: 'RENDER', content: '# Valid' });
    for (let i = 0; i < 10; i++) await Promise.resolve();
    assert.equal(content.querySelector('h1')?.textContent, 'Valid');
  } finally { dom.window.close(); }
});
import { drive } from './helpers.ts';
test('content script rejects unrelated senders and malformed messages', async () => {
  const app = drive();
  try {
    await app.tick();
    const frame = app.frame(); assert.ok(frame);
    app.send(null);
    app.send({ action: 'CLOSE_VIEWER' }, { source: app.w });
    app.send({ action: 'CLOSE_VIEWER' }, { origin: 'https://evil.test' });
    app.send({ action: 'NAVIGATE', direction: 2 });
    assert.equal(app.frame(), frame); assert.equal(app.alerts.length, 0);
    app.send({ action: 'CLOSE_VIEWER' });
    assert.equal(app.frame(), null);
  } finally { app.dom.window.close(); }
});
