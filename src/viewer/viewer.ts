import { createMarkdownRenderer } from './render';
import { isContentMessage, errorMessage } from '../shared/messages';
import { requireElement } from '../shared/dom';

const driveOrigin = 'https://drive.google.com';

// State
let isDarkMode = true;
let isMermaidSource = false;
let currentZoom = 1.0;
let currentMarkdown: string | null = null;
let renderVersion = 0;

// UI Elements
const contentDiv = requireElement('content');
const btnDark = requireElement('drive-md-darkmode');
const btnMermaid = requireElement('drive-md-mermaid-toggle');
const btnClose = requireElement('drive-md-close');
const btnZoomIn = requireElement('drive-md-zoom-in');
const btnZoomOut = requireElement('drive-md-zoom-out');
const btnZoomReset = requireElement('drive-md-zoom-reset');
const btnPrev = requireElement('drive-md-nav-prev');
const btnNext = requireElement('drive-md-nav-next');

const renderContent = createMarkdownRenderer(contentDiv, () => isDarkMode);

function renderCurrentMarkdown() {
  if (currentMarkdown === null) return;
  const version = ++renderVersion;
  renderContent(currentMarkdown).catch(error => {
    if (version === renderVersion) contentDiv.textContent = `Unable to render Markdown: ${errorMessage(error)}`;
  });
}

// Handlers
function updateTheme() {
  if (isDarkMode) document.body.classList.add('dark-mode');
  else document.body.classList.remove('dark-mode');

  btnDark.textContent = isDarkMode ? '🌙 Dark' : '☀️ Light';
  localStorage.setItem('drive-md-dark-mode', String(isDarkMode));
}

function updateMermaidView() {
  if (isMermaidSource) document.body.classList.add('show-mermaid-source');
  else document.body.classList.remove('show-mermaid-source');

  btnMermaid.textContent = isMermaidSource ? '📝 Code' : '📊 Graph';
  localStorage.setItem('drive-md-mermaid-source', String(isMermaidSource));
}

function updateZoom() {
  // Limit range
  currentZoom = Math.min(Math.max(currentZoom, 0.5), 2.5);
  // Round to 1 decimal for clean display
  currentZoom = Math.round(currentZoom * 10) / 10;

  contentDiv.style.transform = `scale(${currentZoom})`;
  btnZoomReset.textContent = `${Math.round(currentZoom * 100)}%`;
  localStorage.setItem('drive-md-zoom', String(currentZoom));
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
  renderCurrentMarkdown();
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
window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.source !== window.parent || event.origin !== driveOrigin) return;
  if (!isContentMessage(event.data)) return;
  if (event.data.action === 'RENDER_ERROR' && typeof event.data.content === 'string') {
    currentMarkdown = null;
    renderVersion++;
    renderContent.cancel();
    contentDiv.textContent = `Unable to load Markdown: ${event.data.content}`;
  }
  if (event.data.action === 'RENDER' && typeof event.data.content === 'string') {
    currentMarkdown = event.data.content;
    renderCurrentMarkdown();
  }
});

// Signal ready
window.parent.postMessage({ action: 'VIEWER_READY' }, driveOrigin);
