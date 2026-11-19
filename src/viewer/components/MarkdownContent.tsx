import { RenderedMarkdown } from '../rendering/RenderedMarkdown';
import type { ViewerState } from '../messaging/useViewerMessages';
import { ViewerStatus } from './ViewerStatus';

type Props = { state: ViewerState; dark: boolean; zoom: number };
export function MarkdownContent({ state, dark, zoom }: Props) {
  return <div id="content" className="drive-md-reader-content" style={{ transform: `scale(${zoom})` }}>
    {state.status === 'ready'
      ? <RenderedMarkdown markdown={state.markdown} dark={dark} />
      : <ViewerStatus state={state} />}
  </div>;
}
