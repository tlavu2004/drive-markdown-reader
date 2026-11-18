import type { ViewerState } from '../messaging/useViewerMessages';

type Props = { state: Exclude<ViewerState, { status: 'ready' }> };
export function ViewerStatus({ state }: Props) {
  return <>{state.status === 'loading' ? 'Loading Markdown…' : `Unable to load Markdown: ${state.message}`}</>;
}
