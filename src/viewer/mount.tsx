import { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Viewer } from './Viewer';
import { requireElement } from '../shared/dom';

export function mountViewer() {
  const root = createRoot(requireElement('viewer-root'));
  // Mount the receiver before the parent can reply to VIEWER_READY.
  flushSync(() => root.render(<StrictMode><Viewer /></StrictMode>));
  return root;
}
