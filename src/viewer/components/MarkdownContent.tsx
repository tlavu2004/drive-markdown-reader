import { useLayoutEffect, useRef } from 'react';
import { createMarkdownRenderer } from '../render';
import { errorMessage } from '../../shared/messages';
import type { ViewerState } from '../hooks/useViewerMessages';
import { ViewerStatus } from './ViewerStatus';

function RenderedMarkdown({ markdown, dark }: { markdown: string; dark: boolean }) {
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
    render(markdown).catch(error => {
      if (active) element.textContent = `Unable to render Markdown: ${errorMessage(error)}`;
    });
    return () => { active = false; render.cancel(); };
  }, [markdown, dark]);
  // The renderer alone owns this element's children, including Mermaid's SVG output.
  return <div ref={host} />;
}

type Props = { state: ViewerState; dark: boolean; zoom: number };
export function MarkdownContent({ state, dark, zoom }: Props) {
  return <div id="content" className="drive-md-reader-content" style={{ transform: `scale(${zoom})` }}>
    {state.status === 'ready'
      ? <RenderedMarkdown markdown={state.markdown} dark={dark} />
      : <ViewerStatus state={state} />}
  </div>;
}
