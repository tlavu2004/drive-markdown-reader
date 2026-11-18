const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { drive } = require('./helpers.cjs');
// Minimal fixture retaining the alternating marker/pre structure supplied from real Drive.
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/drive-markdown-source.html'), 'utf8');
const expected = '# Reader example\n\n```mermaid\nflowchart TD\n  A[Start] --> B["<b>Done</b>"]\n```\n\nParagraph with two  spaces.\n';
function showSource(app, html = fixture) {
  app.w.history.replaceState({}, '', '/drive/u/2/my-drive');
  app.w.document.title = 'My Drive';
  app.w.document.body.innerHTML = '<pre>Unrelated page text</pre>' + html;
}
test('native source outside dialogs preserves all lines, blank lines and Mermaid fences', () => {
  const app = drive();
  try {
    showSource(app);
    assert.equal(app.w.DriveMarkdown.getFileIdFromUrl(), null);
    assert.equal(app.w.DriveMarkdown.scrapePreviewText(), expected);
  } finally { app.dom.window.close(); }
});
test('native source fallback sends the whole document through the built content script', async () => {
  const app = drive();
  try {
    showSource(app); await app.settle();
    app.w.fetch = async () => { throw new Error('Folder preview must not fetch an unknown file'); };
    app.manual(); await app.settle();
    let message;
    assert.ok(app.frame());
    app.frame().contentWindow.postMessage = data => { message = data; };
    app.send({ action: 'VIEWER_READY' });
    assert.equal(message.action, 'RENDER');
    assert.equal(message.content, expected);
  } finally { app.dom.window.close(); }
});
test('hidden/stale native sources do not replace the visible source', () => {
  const app = drive();
  try {
    showSource(app, `<div hidden>${fixture}</div><div style="display:none">${fixture}</div>` + fixture);
    assert.equal(app.w.DriveMarkdown.scrapePreviewText(), expected);
  } finally { app.dom.window.close(); }
});
test('incomplete or ambiguous native sources are rejected without falling back to the first line', () => {
  const app = drive();
  try {
    for (const html of [
      fixture.replace('data-line-number="1"', 'data-line-number="2"'),
      fixture.replace('data-line-number="5"', 'data-line-number="6"'),
      fixture.replace('<code class="hljs"># Reader example</code>', ''),
      fixture + fixture
    ]) {
      showSource(app, `<div role="dialog">${html}</div>`);
      assert.equal(app.w.DriveMarkdown.scrapePreviewText(), null);
    }
  } finally { app.dom.window.close(); }
});
test('highlight spans are decoded as text and the captured gutter remains excluded', () => {
  const app = drive();
  try {
    showSource(app, fixture.replace('# Reader example', '<span class="hljs-section"># Reader example</span>'));
    assert.equal(app.w.DriveMarkdown.scrapePreviewText(), expected);
  } finally { app.dom.window.close(); }
});
