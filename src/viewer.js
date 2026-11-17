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

// State
let isDarkMode = true;
let isMermaidSource = false;
let currentZoom = 1.0;

// UI Elements
const contentDiv = document.getElementById('content');
const btnDark = document.getElementById('drive-md-darkmode');
const btnMermaid = document.getElementById('drive-md-mermaid-toggle');
const btnClose = document.getElementById('drive-md-close');
const btnZoomIn = document.getElementById('drive-md-zoom-in');
const btnZoomOut = document.getElementById('drive-md-zoom-out');
const btnZoomReset = document.getElementById('drive-md-zoom-reset');
const btnPrev = document.getElementById('drive-md-nav-prev');
const btnNext = document.getElementById('drive-md-nav-next');

// Handlers
function updateTheme() {
  if (isDarkMode) document.body.classList.add('dark-mode');
  else document.body.classList.remove('dark-mode');

  btnDark.textContent = isDarkMode ? '🌙 Dark' : '☀️ Light';
  localStorage.setItem('drive-md-dark-mode', isDarkMode);
}

function updateMermaidView() {
  if (isMermaidSource) document.body.classList.add('show-mermaid-source');
  else document.body.classList.remove('show-mermaid-source');

  btnMermaid.textContent = isMermaidSource ? '📝 Code' : '📊 Graph';
  localStorage.setItem('drive-md-mermaid-source', isMermaidSource);
}

function updateZoom() {
  // Limit range
  currentZoom = Math.min(Math.max(currentZoom, 0.5), 2.5);
  // Round to 1 decimal for clean display
  currentZoom = Math.round(currentZoom * 10) / 10;

  contentDiv.style.transform = `scale(${currentZoom})`;
  btnZoomReset.textContent = `${Math.round(currentZoom * 100)}%`;
  localStorage.setItem('drive-md-zoom', currentZoom);
}

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

    const theme = isDarkMode ? 'dark' : 'default';
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

// Init Preferences
const storedDark = localStorage.getItem('drive-md-dark-mode');
isDarkMode = storedDark === null || storedDark === 'true';
const storedMermaid = localStorage.getItem('drive-md-mermaid-source');
isMermaidSource = storedMermaid === 'true';

const storedZoom = localStorage.getItem('drive-md-zoom');
if (storedZoom) currentZoom = parseFloat(storedZoom);

updateTheme();
updateMermaidView();
updateZoom();

// Event Listeners
btnDark.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  updateTheme();
});

btnMermaid.addEventListener('click', () => {
  isMermaidSource = !isMermaidSource;
  updateMermaidView();
});

btnZoomIn.addEventListener('click', () => {
  currentZoom += 0.1;
  updateZoom();
});

btnZoomOut.addEventListener('click', () => {
  currentZoom -= 0.1;
  updateZoom();
});

btnZoomReset.addEventListener('click', () => {
  currentZoom = 1.0;
  updateZoom();
});

btnPrev.addEventListener('click', () => {
  window.parent.postMessage({ action: 'NAVIGATE', direction: -1 }, '*');
});

btnNext.addEventListener('click', () => {
  window.parent.postMessage({ action: 'NAVIGATE', direction: 1 }, '*');
});

btnClose.addEventListener('click', () => {
  window.parent.postMessage({ action: 'CLOSE_VIEWER' }, '*');
});

// Message Receiver
window.addEventListener('message', (event) => {
  if (event.data.action === 'RENDER') {
    renderContent(event.data.content);
  }
});

// Signal ready
window.parent.postMessage({ action: 'VIEWER_READY' }, '*');
