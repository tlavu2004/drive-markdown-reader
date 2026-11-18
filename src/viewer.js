const driveOrigin = 'https://drive.google.com';

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

const renderContent = window.createMarkdownRenderer(contentDiv, () => isDarkMode);

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
  window.parent.postMessage({ action: 'NAVIGATE', direction: -1 }, driveOrigin);
});

btnNext.addEventListener('click', () => {
  window.parent.postMessage({ action: 'NAVIGATE', direction: 1 }, driveOrigin);
});

btnClose.addEventListener('click', () => {
  window.parent.postMessage({ action: 'CLOSE_VIEWER' }, driveOrigin);
});

// Message Receiver
window.addEventListener('message', (event) => {
  if (event.source !== window.parent || event.origin !== driveOrigin) return;
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.action === 'RENDER_ERROR' && typeof event.data.content === 'string') {
    contentDiv.textContent = `Unable to load Markdown: ${event.data.content}`;
  }
  if (event.data.action === 'RENDER' && typeof event.data.content === 'string') {
    renderContent(event.data.content);
  }
});

// Signal ready
window.parent.postMessage({ action: 'VIEWER_READY' }, driveOrigin);
