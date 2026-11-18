import { mountViewer } from './mount';
const root = mountViewer();
window.addEventListener('pagehide', event => {
  if (!event.persisted) root.unmount();
});
