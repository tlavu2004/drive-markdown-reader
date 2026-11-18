import type { ViewerState } from '../hooks/useViewerMessages';

type Props = { state: Exclude<ViewerState, { status: 'ready' }> };
export function ViewerStatus({ state }: Props) {
  return <>{state.status === 'loading' ? 'Loading Markdown…' : `Unable to load Markdown: ${state.message}`}</>;
}
