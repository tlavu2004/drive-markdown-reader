/* content.js */
(function () {
    // Prevent duplicate injection
    if (window.hasDriveMarkdownReader) return;
    window.hasDriveMarkdownReader = true;

    // Checks
    if (typeof marked === 'undefined') {
        console.error("Drive Markdown Reader: 'marked' undefined.");
        return;
    }

    // Mermaid Setup
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false });
    }

    // Marked Renderer
    const renderer = new marked.Renderer();
    const originalCodeRenderer = renderer.code.bind(renderer);
    renderer.code = (code, language) => {
        if (language === 'mermaid') {
            return `<div class="mermaid">${code}</div>`;
        }
        return originalCodeRenderer(code, language);
    };
    marked.use({ renderer });

    // --- Helpers ---

    function getFileId() {
        const urlMatch = location.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
        if (urlMatch) return urlMatch[1];

        const params = new URLSearchParams(location.search);
        if (params.get('id')) return params.get('id');

        const links = document.querySelectorAll('a[href*="/file/d/"], a[href*="id="]');
        for (const link of links) {
            const href = link.getAttribute('href');
            const match = href.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match) return match[1];

            const idMatch = href.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (idMatch) return idMatch[1];
        }
        return null;
    }

    function isMarkdownFile() {
        const title = document.title.toLowerCase();
        return title.includes('.md') || title.includes('.markdown');
    }

    function scrapePreviewText() {
        // Try common pre/code containers in Drive Preview
        const containers = document.querySelectorAll('pre, .CodeMirror-code, .a-b-r-Q, .a-b-r-Q-z');
        for (const c of containers) {
            if (c.innerText.length > 20) return c.innerText;
        }
        // Fallback to body if clean page
        if (document.body.childElementCount < 20 && document.body.innerText.length > 20) {
            return document.body.innerText;
        }
        return null;
    }

    // --- Main Logic ---

    let isRendering = false;

    async function renderMarkdown(manualTrigger = false) {
        if (isRendering) return;

        // Remove existing if manual re-trigger
        const existing = document.getElementById('drive-md-reader-view');
        if (existing) {
            if (manualTrigger) existing.remove();
            else return; // Already open
        }

        if (!manualTrigger && !isMarkdownFile()) return;

        isRendering = true;
        let text = null;
        let usedScraping = false;

        try {
            // 1. Try Fetch by ID
            const fileId = getFileId();
            if (fileId) {
                // console.log("Drive Markdown Reader: Fetching ID", fileId);
                try {
                    const resp = await fetch(`https://drive.google.com/uc?id=${fileId}&export=download`);
                    if (resp.ok) text = await resp.text();
                } catch (e) {
                    console.warn("Fetch failed", e);
                }
            }

            // 2. Fallback Scrape
            if (!text) {
                // console.log("Drive Markdown Reader: Scraping text...");
                text = scrapePreviewText();
                usedScraping = true;
            }

            if (!text) {
                if (manualTrigger) alert("Cannot find Markdown content. Open the file preview and try again.");
                return;
            }

            // Render
            const html = marked.parse(text);

            // Create UI
            createOverlay(html);

        } catch (err) {
            console.error(err);
        } finally {
            // Reset rendering flag slightly later to prevent double-trigger
            setTimeout(() => { isRendering = false; }, 1000);
        }
    }

    function createOverlay(htmlContent) {
        const overlay = document.createElement('div');
        overlay.id = 'drive-md-reader-view';
        overlay.className = 'drive-md-reader-container';

        // Check Dark Mode (Default: True)
        const stored = localStorage.getItem('drive-md-dark-mode');
        const isDarkMode = stored !== 'false'; // Default to Dark unless 'false'
        if (isDarkMode) overlay.classList.add('dark-mode');

        overlay.innerHTML = `
            <div class="drive-md-toolbar">
                <div class="drive-md-title">Markdown Preview</div>
                <div class="drive-md-actions">
                    <button class="drive-md-btn drive-md-icon-btn" id="drive-md-darkmode" title="Toggle Dark Mode">
                        ${isDarkMode ? '☀️ Change Mode' : '🌙 Change Mode'}
                    </button>
                    <button class="drive-md-btn drive-md-close-btn" id="drive-md-close" title="Close">
                        ✕ Close
                    </button>
                </div>
            </div>
            <div class="drive-md-reader-content">
                ${htmlContent}
            </div>
        `;

        document.body.appendChild(overlay);

        // Handlers
        document.getElementById('drive-md-close').addEventListener('click', () => {
            overlay.remove();
        });

        const dmBtn = document.getElementById('drive-md-darkmode');
        dmBtn.addEventListener('click', () => {
            overlay.classList.toggle('dark-mode');
            const isDark = overlay.classList.contains('dark-mode');
            dmBtn.textContent = isDark ? '☀️ Change Mode' : '🌙 Change Mode';
            localStorage.setItem('drive-md-dark-mode', isDark);
        });

        // Mermaid
        if (typeof mermaid !== 'undefined') {
            const divs = overlay.querySelectorAll('.mermaid');
            if (divs.length) mermaid.run({ nodes: divs });
        }
    }

    // --- Listeners ---

    // Message from Popup
    chrome.runtime.onMessage.addListener((req, sender, sendResp) => {
        if (req.action === "RENDER_NOW") {
            renderMarkdown(true); // Fire and forget
            sendResp({ success: true });
        }
    });

    // Navigation Observer
    let lastTitle = document.title;
    const observer = new MutationObserver(() => {
        if (document.title !== lastTitle) {
            lastTitle = document.title;
            // Title changed (navigated), close old view
            const existing = document.getElementById('drive-md-reader-view');
            if (existing) existing.remove();

            // Try new
            setTimeout(() => renderMarkdown(false), 500);
        }

        // Check if we Landed on a MD file and nothing is open
        if (isMarkdownFile() && !document.getElementById('drive-md-reader-view')) {
            renderMarkdown(false);
        }
    });

    observer.observe(document.querySelector('title'), { childList: true });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial
    setTimeout(() => renderMarkdown(false), 1000);

})();
