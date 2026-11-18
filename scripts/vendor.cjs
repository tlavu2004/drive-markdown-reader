const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const [source, target] of [
  ['node_modules/dompurify/dist/purify.min.js', 'vendor/dompurify/purify.min.js'],
  ['node_modules/dompurify/LICENSE', 'licenses/DOMPurify.LICENSE'],
  ['node_modules/react/LICENSE', 'licenses/React.LICENSE'],
  ['node_modules/react-dom/LICENSE', 'licenses/ReactDOM.LICENSE'],
  ['node_modules/scheduler/LICENSE', 'licenses/Scheduler.LICENSE']
]) {
  const output = path.join(root, target);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(path.join(root, source), output);
}
