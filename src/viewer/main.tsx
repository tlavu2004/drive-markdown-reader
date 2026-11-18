import { mountViewer } from './mount';
const root = mountViewer();
window.addEventListener('pagehide', () => root.unmount(), { once: true });
