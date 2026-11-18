const { test } = require('node:test');
const assert = require('node:assert/strict');
const { viewer, load } = require('./helpers.cjs');
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function send(w, action, content) {
  w.dispatchEvent(new w.MessageEvent('message', { source: w.parent, origin: 'https://drive.google.com', data: { action, content } }));
}
test('theme changes rebuild Mermaid from original source and preserve controls', async () => {
  const { dom, w, calls, content } = viewer();
  try {
    w.mermaid.run = async ({ nodes }) => nodes.forEach(node => { node.innerHTML = '<svg></svg>'; });
    load(w, 'src/viewer/viewer.ts');
    const markdown = '```mermaid\ngraph TD; A-->B\n```';
    send(w, 'RENDER', markdown); await settle();
    assert.equal(calls.at(-1).theme, 'dark');
    w.document.getElementById('drive-md-mermaid-toggle').click();
    w.document.getElementById('drive-md-zoom-in').click();
    w.document.getElementById('drive-md-darkmode').click(); await settle();
    assert.equal(calls.at(-1).theme, 'default');
    assert.equal(content.querySelector('.mermaid-source code').textContent, 'graph TD; A-->B');
    assert.ok(content.querySelector('svg'));
    assert.ok(w.document.body.classList.contains('show-mermaid-source'));
    assert.equal(w.document.getElementById('drive-md-zoom-reset').textContent, '110%');
  } finally { dom.window.close(); }
});
test('rapid theme changes serialize Mermaid work and render only latest pending state', async () => {
  const { dom, w, calls, content } = viewer();
  try {
    let finish; let active = 0; let maxActive = 0; let runs = 0;
    w.mermaid.run = async () => {
      maxActive = Math.max(maxActive, ++active);
      if (++runs === 1) await new Promise(resolve => { finish = resolve; });
      active--;
    };
    load(w, 'src/viewer/viewer.ts');
    send(w, 'RENDER', '```mermaid\ngraph TD; Old-->A\n```'); await settle();
    const button = w.document.getElementById('drive-md-darkmode');
    button.click(); button.click(); button.click();
    send(w, 'RENDER', '```mermaid\ngraph TD; New-->B\n```');
    finish(); await settle();
    assert.equal(maxActive, 1); assert.equal(runs, 2);
    assert.equal(calls.at(-1).theme, 'default');
    assert.match(content.querySelector('.mermaid-source').textContent, /New-->B/);
    send(w, 'RENDER_ERROR', 'Download failed'); button.click(); await settle();
    assert.match(content.textContent, /Download failed/); assert.equal(runs, 2);
  } finally { dom.window.close(); }
});
