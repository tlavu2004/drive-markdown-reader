import { useLayoutEffect, useRef } from 'react';
import { createMarkdownRenderer } from '../render';
import { errorMessage } from '../../shared/messages';
import type { ViewerState } from '../hooks/useViewerMessages';

type Props = { state: ViewerState; dark: boolean; zoom: number };
export function MarkdownContent({ state, dark, zoom }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const theme = useRef(dark);
  theme.current = dark;
  const renderer = useRef<ReturnType<typeof createMarkdownRenderer> | null>(null);
  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const render = createMarkdownRenderer(element, () => theme.current);
    renderer.current = render;
    return () => { render.cancel(); renderer.current = null; };
  }, []);
  useLayoutEffect(() => {
    const element = host.current;
    const render = renderer.current;
    if (!element || !render) return;
    let active = true;
    if (state.status === 'ready') {
      render(state.markdown).catch(error => {
        if (active) element.textContent = `Unable to render Markdown: ${errorMessage(error)}`;
      });
    } else {
      render.cancel();
      element.textContent = state.status === 'loading' ? 'Loading Markdown…' : `Unable to load Markdown: ${state.message}`;
    }
    return () => { active = false; render.cancel(); };
  }, [state, dark]);
  // React owns this element; the sanitized Markdown/Mermaid renderer owns its children.
  return <div ref={host} id="content" className="drive-md-reader-content" style={{ transform: `scale(${zoom})` }} />;
}
