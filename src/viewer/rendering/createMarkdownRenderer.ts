import { errorMessage } from '../../shared/messages';

// Mermaid has shared configuration, so serialize work across mounts as well as renders.
let diagramQueue: Promise<void> = Promise.resolve();

export function createMarkdownRenderer(contentDiv: HTMLElement, getDarkMode: () => boolean) {
  // Setup Marked
  const renderer = new marked.Renderer();
  const originalCodeRenderer = renderer.code.bind(renderer);
  renderer.code = (code) => {
    const codeStr = code.text || '';
    let lang = code.lang || '';

    lang = lang.trim().toLowerCase();

    const isMermaid = lang === 'mermaid' ||
      lang === 'mermaid-graph' ||
      (!lang && /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline)/.test(codeStr));

    if (isMermaid) {
      const block = document.createElement('div');
      block.className = 'mermaid-block';
      const graph = document.createElement('div');
      graph.className = 'mermaid-graph mermaid';
      graph.textContent = codeStr;
      const source = document.createElement('pre');
      source.className = 'mermaid-source';
      const codeElement = document.createElement('code');
      codeElement.textContent = codeStr;
      source.appendChild(codeElement);
      block.append(graph, source);
      return block.outerHTML;
    }

    return originalCodeRenderer(code);
  };
  // Each mount owns its parser; remounting must not stack global renderer overrides.
  const parser = new marked.Marked({ renderer });

  async function renderContent(markdownText: string, requestedVersion: number) {
    if (typeof markdownText !== "string") return;

    contentDiv.innerHTML = DOMPurify.sanitize(parser.parse(markdownText, { async: false }), {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['style', 'form', 'input', 'button'],
      SANITIZE_NAMED_PROPS: true
    });

    // Process Mermaid
    const mermaidDivs = contentDiv.querySelectorAll<HTMLElement>('.mermaid-graph');

    if (mermaidDivs.length > 0) {
      if (typeof mermaid === 'undefined') {
        console.error("Viewer: Mermaid is undefined! Check script loading.");
        mermaidDivs.forEach(d => d.textContent = "Error: Mermaid library not found.");
        return;
      }

      const renderDiagrams = async () => {
        if (requestedVersion !== version) return;
        const theme = getDarkMode() ? 'dark' : 'default';
        mermaid.initialize({ startOnLoad: false, theme: theme, securityLevel: 'strict' });

        try {
          await mermaid.run({ nodes: mermaidDivs });
        } catch (e) {
          if (requestedVersion !== version) return;
          console.error("Viewer: Mermaid Error:", e);
          mermaidDivs.forEach(d => {
            const error = document.createElement('pre');
            error.textContent = `Mermaid Error: ${errorMessage(e)}\n${d.textContent}`;
            d.replaceChildren(error);
          });
        }
      };
      diagramQueue = diagramQueue.catch(() => {}).then(renderDiagrams);
      await diagramQueue;
    }
  }

  let version = 0;
  let queue = Promise.resolve();
  function scheduleRender(markdown: string) {
    const requestedVersion = ++version;
    queue = queue.catch(() => {}).then(() => {
      if (requestedVersion === version) return renderContent(markdown, requestedVersion);
    });
    return queue;
  }
  scheduleRender.cancel = () => { version++; };
  return scheduleRender;
}
