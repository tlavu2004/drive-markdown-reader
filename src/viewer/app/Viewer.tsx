import { sendToDrive } from '../messaging/protocol';
import { Toolbar } from '../components/Toolbar';
import { MarkdownContent } from '../components/MarkdownContent';
import { usePreferences } from '../hooks/usePreferences';
import { useViewerMessages } from '../messaging/useViewerMessages';

export function Viewer() {
  const preferences = usePreferences();
  const state = useViewerMessages();
  return <>
    <Toolbar {...preferences}
      onPrevious={() => sendToDrive({ action: 'NAVIGATE', direction: -1 })}
      onNext={() => sendToDrive({ action: 'NAVIGATE', direction: 1 })}
      onClose={() => sendToDrive({ action: 'CLOSE_VIEWER' })}
    />
    <MarkdownContent state={state} dark={preferences.dark} zoom={preferences.zoom} />
  </>;
}
