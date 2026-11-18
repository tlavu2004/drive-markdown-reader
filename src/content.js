/* content.js */
(function () {
    if (window.hasDriveMarkdownReader) return;
    window.hasDriveMarkdownReader = true;

    const { getFileIdFromUrl, getFileIdFromDom, isMarkdownFile, scrapePreviewText, findSiblingId } = window.DriveMarkdown;

    const viewerOrigin = chrome.runtime.getURL('').replace(/\/$/, '');

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

    // --- Listeners ---

    window.addEventListener('message', (event) => {
        const frame = document.getElementById('drive-md-viewer-frame');
        const data = event.data;
        if (!frame || event.source !== frame.contentWindow || event.origin !== viewerOrigin) return;
        if (!data || typeof data !== 'object') return;
        if (!['VIEWER_READY', 'CLOSE_VIEWER', 'NAVIGATE'].includes(data.action)) return;
        if (data.action === 'NAVIGATE' && data.direction !== -1 && data.direction !== 1) return;
        if (event.data.action === 'VIEWER_READY') {
            const iframe = document.getElementById('drive-md-viewer-frame');
            if (iframe && pendingContent) {
                iframe.contentWindow.postMessage({
                    action: 'RENDER',
                    content: pendingContent
                }, viewerOrigin);
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
        if (req && req.action === "RENDER_NOW") {
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
