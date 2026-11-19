import { useLayoutEffect, useRef } from 'react';
import { createMarkdownRenderer } from './createMarkdownRenderer';
import { errorMessage } from '../../shared/messages';

export function RenderedMarkdown({ markdown, dark }: { markdown: string; dark: boolean }) {
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
