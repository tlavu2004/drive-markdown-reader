(function () {
window.createMarkdownRenderer = function (contentDiv, getDarkMode) {
/* viewer.js */

// Setup Marked
const renderer = new marked.Renderer();
const originalCodeRenderer = renderer.code.bind(renderer);
renderer.code = (code, language) => {
  // Support both new (Token) and old (string) signatures
  let codeStr = "";
  let lang = "";
  let isToken = false;

  if (typeof code === 'object' && code !== null) {
    // Marked v5+ Token
    isToken = true;
    codeStr = code.text || "";
    lang = (code.lang || "");
  } else {
    // Old signature
    codeStr = String(code || '');
    lang = (language || "");
  }

  lang = lang.trim().toLowerCase();

  // Safe log
  console.log(`Viewer: Code block. Lang: '${lang}'`);

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

  // Pass back to original
  if (isToken) {
    return originalCodeRenderer(code);
  } else {
    return originalCodeRenderer(codeStr, language);
  }
};
marked.use({ renderer });

async function renderContent(markdownText) {
  console.log("Viewer: Received content length:", markdownText.length);
  if (typeof markdownText !== "string") return;

  contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(markdownText), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button'],
    SANITIZE_NAMED_PROPS: true
  });

  // Process Mermaid
  const mermaidDivs = contentDiv.querySelectorAll('.mermaid-graph');
  console.log(`Viewer: Found ${mermaidDivs.length} mermaid blocks.`);

  if (mermaidDivs.length > 0) {
    if (typeof mermaid === 'undefined') {
      console.error("Viewer: Mermaid is undefined! Check script loading.");
      mermaidDivs.forEach(d => d.textContent = "Error: Mermaid library not found.");
      return;
    }

    const theme = getDarkMode() ? 'dark' : 'default';
    console.log("Viewer: Initializing Mermaid with theme:", theme);
    mermaid.initialize({ startOnLoad: false, theme: theme, securityLevel: 'strict' });

    try {
      console.log("Viewer: Running mermaid.run...");
      await mermaid.run({ nodes: mermaidDivs });
      console.log("Viewer: Mermaid run complete.");
    } catch (e) {
      console.error("Viewer: Mermaid Error:", e);
      mermaidDivs.forEach(d => {
        const error = document.createElement('pre');
        error.textContent = `Mermaid Error: ${e.message}\n${d.textContent}`;
        d.replaceChildren(error);
      });
    }
  }
}


let version = 0;
let queue = Promise.resolve();
function scheduleRender(markdown) {
  const requestedVersion = ++version;
  queue = queue.catch(() => {}).then(() => {
    if (requestedVersion === version) return renderContent(markdown);
  });
  return queue;
}
scheduleRender.cancel = () => { version++; };
return scheduleRender;
};
})();
