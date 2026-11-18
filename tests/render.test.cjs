const { test } = require('node:test');
const assert = require('node:assert/strict');
const { viewer } = require('./helpers.cjs');
test('sanitizes raw HTML, unsafe URLs and Mermaid code without losing literal source', async () => {
  const { dom, w, calls, content } = viewer();
  try {
    const render = w.createMarkdownRenderer(content, () => true);
    const source = 'graph TD\nA["<img src=x onerror=alert(1)> &lt;b&gt;"]';
    await render('<script>alert(1)</script><img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))\n\n```mermaid\n' + source + '\n```');
    assert.equal(content.querySelector('script'), null);
    assert.equal(content.querySelector('[onerror]'), null);
    assert.equal(content.querySelector('a[href^="javascript:"]'), null);
    assert.equal(content.querySelector('.mermaid-graph img'), null);
    assert.equal(content.querySelector('.mermaid-source code').textContent, source);
    assert.equal(calls[0].securityLevel, 'strict');
  } finally { dom.window.close(); }
});
test('Mermaid error details are displayed as text', async () => {
  const { dom, w, content } = viewer();
  try {
    w.mermaid.run = async () => { throw new Error('<img src=x onerror=alert(1)>'); };
    await w.createMarkdownRenderer(content, () => false)('```mermaid\ngraph TD; A-->B\n```');
    assert.equal(content.querySelector('img'), null);
    assert.match(content.textContent, /<img src=x/);
  } finally { dom.window.close(); }
});
