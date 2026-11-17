/* content.js */
(function () {
    if (window.hasDriveMarkdownReader) return;
    window.hasDriveMarkdownReader = true;

    // --- Helpers ---
    function getFileIdFromUrl() {
        // 1. Try URL (Standalone View)
        const urlMatch = location.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
        if (urlMatch) return urlMatch[1];

        // 2. Try URL Query Params
        const params = new URLSearchParams(location.search);
        if (params.get('id')) return params.get('id');

        return null;
    }

    function getFileIdFromDom(currentFileId = null) {
        // If we have a currentFileId, we might be looking for context around it,
        // but for initial load, we scan dialogs.

        // 3. Context-aware DOM Check (Strict)
        // Only look inside active dialogs/modals (Drive Preview Layer)
        const activeDialogs = document.querySelectorAll('div[role="dialog"]');

        for (const dialog of activeDialogs) {
            // Find links inside this dialog (e.g. "Open with", "Download", "Pop-out")
            const links = dialog.querySelectorAll('a[href*="/file/d/"], a[href*="id="]');
            for (const link of links) {
                const href = link.getAttribute('href');
                const match = href.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (match) return match[1];

                const idMatch = href.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (idMatch) return idMatch[1];
            }
        }
        return null;
    }

    function isMarkdownFile() {
        const title = document.title.toLowerCase();
        return title.includes('.md') || title.includes('.markdown');
    }

    function scrapePreviewText() {
        const containers = document.querySelectorAll('pre, .CodeMirror-code, .a-b-r-Q, .a-b-r-Q-z');
        for (const c of containers) {
            if (c.innerText.length > 20) return c.innerText;
        }
        if (document.body.childElementCount < 20 && document.body.innerText.length > 20) {
            return document.body.innerText;
        }
        return null;
    }

    // --- Main Logic ---

    let isRendering = false;
    let pendingContent = null;
    let currentRenderedId = null; // Track what we are currently showing

    async function launchViewer(manualTrigger = false, explicitId = null) {
        // If triggering manually or navigating, we allow re-rendering even if flag is set,
        // but we must clean up first.
        if (isRendering && manualTrigger) {
            cleanupViewer(); // Force reset
        } else if (isRendering) {
            return; // Already active (auto-trigger case)
        }

        const existing = document.getElementById('drive-md-viewer-frame');
        if (existing) {
            if (manualTrigger) existing.remove();
            else return;
        }

        if (!manualTrigger && !explicitId && !isMarkdownFile()) return;

        isRendering = true;
        let text = null;
        let fileId = explicitId || getFileIdFromUrl() || getFileIdFromDom();

        try {
            if (fileId) {
                currentRenderedId = fileId; // Store for navigation
                try {
                    const resp = await fetch(`https://drive.google.com/uc?id=${fileId}&export=download`);
                    if (resp.ok) text = await resp.text();
                } catch (e) { console.warn("Fetch failed", e); }
            }

            if (!text && !explicitId) text = scrapePreviewText(); // Only scrape if no explicit ID (fallback)

            if (!text) {
                if (manualTrigger) alert("Cannot find Markdown content.");
                isRendering = false;
                return;
            }

            // Store content to send when viewer is ready
            pendingContent = text;
            createIframe();

        } catch (err) {
            console.error("DriveMD Logic Error:", err);
            cleanupViewer();
        }
    }

    function cleanupViewer() {
        const iframe = document.getElementById('drive-md-viewer-frame');
        if (iframe) iframe.remove();
        isRendering = false;
        pendingContent = null;
        // Do NOT clear currentRenderedId if simply closing, or maybe we should?
        // If we close, we probably want to reset.
    }

    function createIframe() {
        const iframe = document.createElement('iframe');
        iframe.id = 'drive-md-viewer-frame';
        iframe.src = chrome.runtime.getURL('src/viewer.html');
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.border = 'none';
        iframe.style.zIndex = '2147483647';
        iframe.style.display = 'block';

        document.body.appendChild(iframe);
    }

    // --- Navigation Logic ---

    function findSiblingId(currentId, direction) {
        if (!currentId) return null;

        // Strategy: Find DOM elements representing files. 
        // Drive's UI is complex (Grid vs List).
        // Common assumption: Files are represented by some container with an attribute or link containing the ID.

        // Selector 1: data-id attribute (Common in list views or grid items)
        let currentEl = document.querySelector(`[data-id="${currentId}"]`);

        // Selector 2: Anchor tags (Common in simpler views)
        if (!currentEl) {
            const link = document.querySelector(`a[href*="${currentId}"]`);
            if (link) currentEl = link.closest('[role="row"], [role="gridcell"], .drive-grid-item') || link;
        }

        if (!currentEl) {
            console.warn("DriveMD: Could not find current file in DOM.");
            return null;
        }

        // Find the container list
        // Try to identify the common parent of similar items
        const parent = currentEl.parentElement;
        if (!parent) return null;

        // Get all siblings that look like files
        // We use the same generic identification strategy for siblings as we did for the current element.
        // If currentEl has data-id, look for siblings with data-id.
        let siblings = [];
        if (currentEl.hasAttribute('data-id')) {
            siblings = Array.from(parent.children).filter(el => el.hasAttribute('data-id'));
        } else {
            // Fallback: Use siblings that are of same tag name
            siblings = Array.from(parent.children).filter(el => el.tagName === currentEl.tagName);
        }

        // Only keep siblings that likely point to files (optional optimization)

        const index = siblings.indexOf(currentEl);
        if (index === -1) return null;

        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= siblings.length) {
            return null; // End of list
        }

        const targetEl = siblings[targetIndex];

        // Extract ID from target
        // 1. data-id
        if (targetEl.hasAttribute('data-id')) return targetEl.getAttribute('data-id');

        // 2. Link inside
        const link = targetEl.querySelector('a[href*="/file/d/"], a[href*="id="]');
        if (link) {
            const href = link.getAttribute('href');
            const match = href.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || href.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) return match[1];
        }

        return null;
    }

    // --- Listeners ---

    window.addEventListener('message', (event) => {
        if (event.data.action === 'VIEWER_READY') {
            const iframe = document.getElementById('drive-md-viewer-frame');
            if (iframe && pendingContent) {
                iframe.contentWindow.postMessage({
                    action: 'RENDER',
                    content: pendingContent
                }, '*');
                pendingContent = null;
            }
        }

        if (event.data.action === 'CLOSE_VIEWER') {
            cleanupViewer();
        }

        if (event.data.action === 'NAVIGATE') {
            const direction = event.data.direction; // -1 or 1
            const nextId = findSiblingId(currentRenderedId, direction);

            if (nextId) {
                console.log(`DriveMD: Navigating to ${nextId}`);
                launchViewer(true, nextId);
            } else {
                alert("No more files in that direction (or could not detect them).");
            }
        }
    });

    chrome.runtime.onMessage.addListener((req, sender, sendResp) => {
        if (req.action === "RENDER_NOW") {
            launchViewer(true);
            sendResp({ success: true });
        }
    });

    let lastTitle = document.title;
    const observer = new MutationObserver(() => {
        if (document.title !== lastTitle) {
            lastTitle = document.title;
            // Only auto-close if we relied on implicit ID.
            // If explicit navigation happened, maybe we shouldn't close?
            // Actually, if title changes, it usually means user navigated in the background Drive app.
            // Safer to close to reset state, unless we are in full screen mode.
            // User compliant: "When I open B, only see B". 
            // Better to respect user manual close, but if they click "Back" in browser, we should close.

            // For now, keep existing logic: force re-eval.
            if (isRendering) cleanupViewer();

            setTimeout(() => launchViewer(false), 1000);
        }

        // Auto-launch check
        const existing = document.getElementById('drive-md-viewer-frame');
        if (!existing && isMarkdownFile()) {
            if (!isRendering) setTimeout(() => launchViewer(false), 1000);
        }
    });

    observer.observe(document.querySelector('title'), { childList: true });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check
    setTimeout(() => launchViewer(false), 1500);

})();
