const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');

function extensionFile(reference, base = root) {
  const resolved = path.resolve(base, reference);
  assert.ok(resolved.startsWith(root + path.sep), `Asset outside extension: ${reference}`);
  assert.ok(fs.statSync(resolved).isFile(), `Missing extension asset: ${reference}`);
  return resolved;
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const accessible = new Set(manifest.web_accessible_resources.flatMap(group => group.resources));
const contentFiles = manifest.content_scripts.flatMap(entry => [...entry.js, ...(entry.css || [])]);
for (const reference of [...contentFiles, ...accessible]) extensionFile(reference);

function verifyHtml(file, requireAccessible = false) {
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
  try {
    for (const element of dom.window.document.querySelectorAll('script[src], link[href]')) {
      const reference = element.getAttribute('src') || element.getAttribute('href');
      const asset = extensionFile(reference, path.dirname(file));
      if (requireAccessible) {
        const relative = path.relative(root, asset).split(path.sep).join('/');
        assert.ok(accessible.has(relative), `Viewer asset missing from manifest resources: ${relative}`);
      }
    }
  } finally { dom.window.close(); }
}

verifyHtml(extensionFile(manifest.action.default_popup));
for (const reference of accessible) {
  if (reference.endsWith('.html')) verifyHtml(extensionFile(reference), true);
}

const sourceFiles = fs.readdirSync(path.join(root, 'src'), { recursive: true }).filter(file => file.endsWith('.js'));
for (const source of sourceFiles) {
  const code = fs.readFileSync(path.join(root, 'src', source), 'utf8');
  for (const [, reference] of code.matchAll(/chrome\.runtime\.getURL\('([^']+)'\)/g)) {
    extensionFile(reference);
    assert.ok(accessible.has(reference), `Viewer entry missing from manifest resources: ${reference}`);
  }
  for (const [, injected] of code.matchAll(/files:\s*\[([^\]]+)\]/g)) {
    const files = [...injected.matchAll(/'([^']+)'/g)].map(match => match[1]);
    for (const file of files) extensionFile(file);
    assert.deepEqual(files, manifest.content_scripts[0].js, 'Popup injection must preserve content-script dependency order');
  }
}
console.log('Verified manifest assets, popup/viewer HTML, viewer URL and manual injection paths.');
