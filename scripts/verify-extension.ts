import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { buildSync } from 'esbuild';
const project = path.resolve(import.meta.dirname, '..');
const root = path.join(project, 'dist');

function extensionFile(reference: string, base = root) {
  const resolved = path.resolve(base, reference.startsWith('/') ? path.join(root, reference.slice(1)) : reference);
  assert.ok(resolved.startsWith(root + path.sep), `Asset outside dist: ${reference}`);
  assert.ok(fs.statSync(resolved).isFile(), `Missing built asset: ${reference}`);
  return resolved;
}
type ExtensionManifest = {
  manifest_version: number;
  action: { default_popup: string };
  content_scripts: { js: string[]; css?: string[] }[];
  web_accessible_resources: { resources: string[] }[];
};

const manifest: ExtensionManifest = JSON.parse(fs.readFileSync(extensionFile('manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
const files = fs.readdirSync(root, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile()).map(entry => path.relative(root, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'));
const accessible = manifest.web_accessible_resources.flatMap(group => group.resources);
function matches(pattern: string, file: string) {
  return new RegExp('^' + pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(file);
}
function isAccessible(file: string) { return accessible.some(pattern => matches(pattern, file)); }
for (const pattern of accessible) {
  assert.ok(files.some(file => matches(pattern, file)), `Resource pattern matches no built files: ${pattern}`);
}
for (const entry of manifest.content_scripts) {
  for (const reference of [...entry.js, ...(entry.css || [])]) extensionFile(reference);
  for (const reference of entry.js) {
    new vm.Script(fs.readFileSync(extensionFile(reference), 'utf8'), { filename: reference });
  }
}
function verifyHtml(reference: string, viewer = false) {
  const file = extensionFile(reference);
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
  try {
    for (const element of dom.window.document.querySelectorAll('script[src], link[href]')) {
      const ref = element.getAttribute('src') || element.getAttribute('href');
      assert.ok(ref, 'Expected an HTML asset URL');
      assert.ok(!/\.tsx?$/.test(ref), `HTML references unbuilt TypeScript: ${ref}`);
      const asset = extensionFile(ref, path.dirname(file));
      if (viewer) assert.ok(isAccessible(path.relative(root, asset).replaceAll('\\', '/')), `Viewer asset not web accessible: ${ref}`);
    }
  } finally { dom.window.close(); }
}
assert.deepEqual(fs.readFileSync(extensionFile('LICENSE')), fs.readFileSync(path.join(project, 'LICENSE')));
verifyHtml(manifest.action.default_popup);
verifyHtml('src/viewer/index.html', true);
for (const file of files.filter(file => file.startsWith('assets/') && file.endsWith('.js'))) {
  // Resolve and parse all emitted JS imports, including shared chunks.
  buildSync({ entryPoints: [extensionFile(file)], bundle: true, write: false, platform: 'browser', logLevel: 'silent' });
}
for (const file of files) assert.ok(!/\.(?:tsx?|jsx|cjs|mjs)$/.test(file), `Development source leaked into package: ${file}`);
for (const license of ['DOMPurify', 'React', 'ReactDOM', 'Scheduler']) extensionFile(`licenses/${license}.LICENSE`);
for (const file of files.filter(file => file.startsWith('vendor/') || file.startsWith('licenses/'))) {
  assert.deepEqual(fs.readFileSync(extensionFile(file)), fs.readFileSync(path.join(project, file)), `Bundled library or license changed: ${file}`);
}
console.log('Verified dist manifest, classic content scripts, HTML assets, shared chunks and bundled libraries/licenses.');
