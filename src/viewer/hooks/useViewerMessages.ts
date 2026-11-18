import { useLayoutEffect, useState } from 'react';
import { isContentMessage, type ViewerMessage } from '../../shared/messages';

export type ViewerState =
  | { status: 'loading' }
  | { status: 'ready'; markdown: string }
  | { status: 'error'; message: string };
const driveOrigin = 'https://drive.google.com';
export function sendToDrive(message: ViewerMessage) {
  window.parent.postMessage(message, driveOrigin);
}
export function useViewerMessages() {
  const [state, setState] = useState<ViewerState>({ status: 'loading' });
  useLayoutEffect(() => {
    function receive(event: MessageEvent<unknown>) {
      if (event.source !== window.parent || event.origin !== driveOrigin || !isContentMessage(event.data)) return;
      const message = event.data;
      setState(message.action === 'RENDER'
        ? { status: 'ready', markdown: message.content }
        : { status: 'error', message: message.content });
    }
    window.addEventListener('message', receive);
    // Subscribe before signaling readiness, including on a StrictMode remount.
    sendToDrive({ action: 'VIEWER_READY' });
    return () => window.removeEventListener('message', receive);
  }, []);
  return state;
}
