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
