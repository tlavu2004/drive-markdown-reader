import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
for (const [source, target] of [
  ['node_modules/dompurify/dist/purify.min.js', 'vendor/dompurify/purify.min.js'],
  ['node_modules/dompurify/LICENSE', 'licenses/DOMPurify.LICENSE'],
  ['node_modules/react/LICENSE', 'licenses/React.LICENSE'],
  ['node_modules/react-dom/LICENSE', 'licenses/ReactDOM.LICENSE'],
  ['node_modules/scheduler/LICENSE', 'licenses/Scheduler.LICENSE']
] as const) {
  const output = path.join(root, target);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(path.join(root, source), output);
}
