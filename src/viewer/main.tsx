import { mountViewer } from './app/mount';
const root = mountViewer();
window.addEventListener('pagehide', event => {
  if (!event.persisted) root.unmount();
});
