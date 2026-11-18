(function () {
window.createMarkdownRenderer = function (contentDiv, getDarkMode) {
/* viewer.js */

// Utils
const unescapeHtml = (str) =>
  str.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

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
    const safeCode = unescapeHtml(codeStr);
    return `
        <div class="mermaid-block">
            <div class="mermaid-graph mermaid">${safeCode}</div>
            <pre class="mermaid-source"><code>${safeCode}</code></pre>
        </div>`;
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
  if (!markdownText) return;

  contentDiv.innerHTML = marked.parse(markdownText);

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
    mermaid.initialize({ startOnLoad: false, theme: theme, securityLevel: 'loose' });

    try {
      console.log("Viewer: Running mermaid.run...");
      await mermaid.run({ nodes: mermaidDivs });
      console.log("Viewer: Mermaid run complete.");
    } catch (e) {
      console.error("Viewer: Mermaid Error:", e);
      mermaidDivs.forEach(d => {
        d.innerHTML = `<div style="color:red; border:1px solid red; padding:5px;">
                    Mermaid Error: ${e.message}
                </div><pre>${d.innerText}</pre>`;
      });
    }
  }
}


return renderContent;
};
})();
