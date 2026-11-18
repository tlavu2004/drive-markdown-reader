import type { usePreferences } from '../hooks/usePreferences';
import { sendToDrive } from '../hooks/useViewerMessages';

type Props = ReturnType<typeof usePreferences>;
export function Toolbar(p: Props) {
  return <div className="drive-md-toolbar">
    <div className="drive-md-title">Markdown Preview</div>
    <div className="drive-md-actions">
      <button className="drive-md-btn drive-md-icon-btn" id="drive-md-mermaid-toggle" title="Toggle Mermaid Graph/Code" onClick={p.toggleSource}>{p.source ? '📝 Code' : '📊 Graph'}</button>
      <div className="drive-md-btn-group">
        <button className="drive-md-btn drive-md-icon-btn" id="drive-md-nav-prev" title="Previous File" onClick={() => sendToDrive({ action: 'NAVIGATE', direction: -1 })}>⬅️</button>
        <button className="drive-md-btn drive-md-icon-btn" id="drive-md-nav-next" title="Next File" onClick={() => sendToDrive({ action: 'NAVIGATE', direction: 1 })}>➡️</button>
      </div>
      <div className="drive-md-btn-group">
        <button className="drive-md-btn drive-md-icon-btn" id="drive-md-zoom-out" title="Zoom Out" onClick={p.zoomOut}>➖</button>
        <button className="drive-md-btn drive-md-icon-btn" id="drive-md-zoom-reset" title="Reset Zoom" onClick={p.resetZoom}>{Math.round(p.zoom * 100)}%</button>
        <button className="drive-md-btn drive-md-icon-btn" id="drive-md-zoom-in" title="Zoom In" onClick={p.zoomIn}>➕</button>
      </div>
      <button className="drive-md-btn drive-md-icon-btn" id="drive-md-darkmode" title="Toggle Dark Mode" onClick={p.toggleDark}>{p.dark ? '🌙 Dark' : '☀️ Light'}</button>
      <button className="drive-md-btn drive-md-close-btn" id="drive-md-close" title="Close" onClick={() => sendToDrive({ action: 'CLOSE_VIEWER' })}>✕ Close</button>
    </div>
  </div>;
}
