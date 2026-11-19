import type { ContentMessage } from '../src/shared/messages.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { drive } from './helpers.ts';
// Minimal fixture retaining the alternating marker/pre structure supplied from real Drive.
const fixture = fs.readFileSync(path.join(import.meta.dirname, 'fixtures/drive-markdown-source.html'), 'utf8');
const expected = '# Reader example\n\n```mermaid\nflowchart TD\n  A[Start] --> B["<b>Done</b>"]\n```\n\nParagraph with two  spaces.\n';
function showSource(app: ReturnType<typeof drive>, html = fixture) {
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
    let message!: ContentMessage;
    assert.ok(app.frame());
    app.viewerWindow().postMessage = (data: ContentMessage) => { message = data; };
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
test('reads a same-origin native preview iframe instead of only the outer Drive document', async () => {
  const app = drive();
  try {
    showSource(app, '<iframe title="Drive preview"></iframe>');
    const frame = app.w.document.querySelector('iframe');
    frame!.contentDocument!.body.innerHTML = fixture;
    assert.equal(app.w.DriveMarkdown.scrapePreviewText(), expected);
    await app.settle(); app.manual(); await app.settle();
    let message!: ContentMessage;
    app.viewerWindow().postMessage = (data: ContentMessage) => { message = data; };
    app.send({ action: 'VIEWER_READY' });
    assert.equal(message.action, 'RENDER'); assert.equal(message.content, expected);
  } finally { app.dom.window.close(); }
});
test('reads nested preview frames while excluding hidden and extension frames', () => {
  const app = drive();
  try {
    showSource(app, '<iframe hidden></iframe><iframe id="drive-md-viewer-frame"></iframe><iframe title="Preview"></iframe>');
    const frames = app.w.document.querySelectorAll('iframe');
    frames[0]!.contentDocument!.body.innerHTML = fixture;
    frames[1]!.contentDocument!.body.innerHTML = fixture;
    frames[2]!.contentDocument!.body.innerHTML = '<iframe></iframe>';
    frames[2]!.contentDocument!.querySelector('iframe')!.contentDocument!.body.innerHTML = fixture;
    assert.equal(app.w.DriveMarkdown.scrapePreviewText(), expected);
  } finally { app.dom.window.close(); }
});
test('does not read inaccessible frames or combine two visible preview files', () => {
  const app = drive();
  try {
    showSource(app, '<iframe></iframe><iframe></iframe>');
    const frames = app.w.document.querySelectorAll('iframe');
    frames.forEach(frame => { frame!.contentDocument!.body.innerHTML = fixture; });
    assert.equal(app.w.DriveMarkdown.scrapePreviewText(), null);
    Object.defineProperty(frames[0]!, 'contentDocument', { get() { throw new app.w.DOMException('Blocked', 'SecurityError'); } });
    assert.equal(app.w.DriveMarkdown.scrapePreviewText(), expected);
  } finally { app.dom.window.close(); }
});
