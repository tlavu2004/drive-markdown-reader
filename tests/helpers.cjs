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
