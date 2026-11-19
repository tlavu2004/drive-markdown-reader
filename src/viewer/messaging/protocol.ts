import type { ViewerMessage } from '../../shared/messages';

export const driveOrigin = 'https://drive.google.com';
export function sendToDrive(message: ViewerMessage) {
  window.parent.postMessage(message, driveOrigin);
}
