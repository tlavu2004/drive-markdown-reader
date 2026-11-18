import { Toolbar } from './components/Toolbar';
import { MarkdownContent } from './components/MarkdownContent';
import { usePreferences } from './hooks/usePreferences';
import { useViewerMessages } from './hooks/useViewerMessages';

export function Viewer() {
  const preferences = usePreferences();
  const state = useViewerMessages();
  return <>
    <Toolbar {...preferences} />
    <MarkdownContent state={state} dark={preferences.dark} zoom={preferences.zoom} />
  </>;
}
