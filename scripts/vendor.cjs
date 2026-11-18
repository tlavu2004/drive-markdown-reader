const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const [source, target] of [
  ['node_modules/dompurify/dist/purify.min.js', 'vendor/dompurify/purify.min.js'],
  ['node_modules/dompurify/LICENSE', 'licenses/DOMPurify.LICENSE']
]) {
  const output = path.join(root, target);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(path.join(root, source), output);
}
