/* content.js */
(function () {
    if (window.hasDriveMarkdownReader) return;
    window.hasDriveMarkdownReader = true;

    const { getFileIdFromUrl, getFileIdFromDom, isMarkdownFile, scrapePreviewText, fetchMarkdown, findSiblingId } = window.DriveMarkdown;

    const viewerOrigin = chrome.runtime.getURL('').replace(/\/$/, '');

    // --- Main Logic ---

    function getPreviewKey() {
        return `${location.href}|${document.title}|${getFileIdFromUrl() || getFileIdFromDom() || ''}`;
    }

    let dismissedPreview = null;
    let autoLaunchTimer = null;
    let requestVersion = 0;
    let activeRequest = null;
    let isRendering = false;
    let pendingMessage = null;
    let viewerReady = false;
    let currentRenderedId = null; // Track what we are currently showing

    async function launchViewer(manualTrigger = false, explicitId = null) {
        if (manualTrigger) dismissedPreview = null;
        if (!manualTrigger && dismissedPreview === getPreviewKey()) return;

        // Manual open and sibling navigation replace the current viewer.
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
        const version = ++requestVersion;
        const preview = getPreviewKey();
        const controller = new AbortController();
        activeRequest = controller;
        const isCurrent = () => version === requestVersion && !controller.signal.aborted && preview === getPreviewKey();
        createIframe();
        let text = null;
        let loadError = null;
        const fileId = explicitId || getFileIdFromUrl() || getFileIdFromDom();

        try {
            if (fileId) {
                currentRenderedId = fileId; // Store for navigation
                try {
                    text = await fetchMarkdown(fileId, controller.signal);
                } catch (e) {
                    if (!isCurrent()) return;
                    loadError = e;
                }
            }

            if (!isCurrent()) return;
            if (text === null && !explicitId) text = scrapePreviewText();
            if (text === null) throw loadError || new Error('Cannot find Markdown in the active Drive preview.');
            pendingMessage = { action: 'RENDER', content: text };
            flushViewerMessage();
            return { success: true };

        } catch (err) {
            if (!isCurrent()) return;
            pendingMessage = { action: 'RENDER_ERROR', content: err.message || 'Unable to load Markdown.' };
            flushViewerMessage();
            return { success: false, reason: pendingMessage?.content || err.message };
        }
    }

    function cleanupViewer() {
        requestVersion++;
        activeRequest?.abort();
        activeRequest = null;
        const iframe = document.getElementById('drive-md-viewer-frame');
        if (iframe) iframe.remove();
        isRendering = false;
        pendingMessage = null;
        viewerReady = false;
        currentRenderedId = null;
    }

    function flushViewerMessage() {
        const frame = document.getElementById('drive-md-viewer-frame');
        if (frame && viewerReady && pendingMessage) {
            frame.contentWindow.postMessage(pendingMessage, viewerOrigin);
            pendingMessage = null;
        }
    }

    function createIframe() {
        const iframe = document.createElement('iframe');
        iframe.id = 'drive-md-viewer-frame';
        iframe.src = chrome.runtime.getURL('src/viewer/index.html');
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
        if (data.action === 'VIEWER_READY') {
            viewerReady = true;
            flushViewerMessage();
        }

        if (data.action === 'CLOSE_VIEWER') {
            dismissedPreview = getPreviewKey();
            clearTimeout(autoLaunchTimer);
            autoLaunchTimer = null;
            cleanupViewer();
        }

        if (data.action === 'NAVIGATE') {
            const direction = data.direction; // -1 or 1
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
            launchViewer(true).then(result => sendResp(result || { success: false, reason: 'Loading was cancelled.' }));
            return true;
        }
    });

    let lastPreview = getPreviewKey();
    function scheduleAutoLaunch(delay = 1000) {
        if (autoLaunchTimer !== null || isRendering || !isMarkdownFile()) return;
        if (dismissedPreview === getPreviewKey()) return;
        autoLaunchTimer = setTimeout(() => {
            autoLaunchTimer = null;
            launchViewer(false);
        }, delay);
    }

    function checkPreview() {
        const preview = getPreviewKey();
        if (preview !== lastPreview) {
            lastPreview = preview;
            dismissedPreview = null;
            clearTimeout(autoLaunchTimer);
            autoLaunchTimer = null;
            cleanupViewer();
        }
        scheduleAutoLaunch();
    }
    const observer = new MutationObserver(checkPreview);

    const title = document.querySelector('title');
    if (title) observer.observe(title, { childList: true });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', checkPreview);
    scheduleAutoLaunch(1500);
})();
