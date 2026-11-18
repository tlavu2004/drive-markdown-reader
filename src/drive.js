(function () {
    function getFileIdFromUrl() {
        const urlMatch = location.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
        if (urlMatch) return urlMatch[1];

        const params = new URLSearchParams(location.search);
        if (params.get('id')) return params.get('id');

        return null;
    }

    function getFileIdFromDom() {

        const activeDialogs = document.querySelectorAll('div[role="dialog"]');

        for (const dialog of activeDialogs) {
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
        const dialogs = [...document.querySelectorAll('[role="dialog"]')]
            .filter(el => !el.closest('[hidden], [aria-hidden="true"]'));
        const roots = dialogs.length ? dialogs :
            (getFileIdFromUrl() ? [...document.querySelectorAll('main, [role="main"]')] : []);
        for (const root of roots) {
            for (const node of root.querySelectorAll('pre, .CodeMirror-code, .a-b-r-Q, .a-b-r-Q-z')) {
                if (node.closest('[hidden], [aria-hidden="true"]')) continue;
                const text = node.innerText ?? node.textContent;
                if (text.length) return text;
            }
        }
        return null;
    }

    async function fetchMarkdown(fileId, signal) {
        const response = await fetch(`https://drive.google.com/uc?id=${encodeURIComponent(fileId)}&export=download`, { signal });
        if (!response.ok) throw new Error(`Drive download failed (HTTP ${response.status}).`);
        if (response.url) {
            const host = new URL(response.url).hostname;
            if (host !== 'drive.google.com' && !host.endsWith('.googleusercontent.com')) {
                throw new Error('Drive redirected to a login or unsupported download page.');
            }
        }
        const type = (response.headers?.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (type && !['text/plain', 'text/markdown', 'text/x-markdown', 'application/markdown', 'application/octet-stream'].includes(type)) {
            throw new Error(`Expected Markdown text, received ${type}.`);
        }
        const text = await response.text();
        if (/^\s*(?:<!doctype\s+html|<html(?:\s|>))/i.test(text) || text.includes('\0')) {
            throw new Error('Drive returned an HTML page or binary content instead of Markdown.');
        }
        return text;
    }

    function findSiblingId(currentId, direction) {
        if (!currentId) return null;

        let currentEl = document.querySelector(`[data-id="${currentId}"]`);

        if (!currentEl) {
            const link = document.querySelector(`a[href*="${currentId}"]`);
            if (link) currentEl = link.closest('[role="row"], [role="gridcell"], .drive-grid-item') || link;
        }

        if (!currentEl) {
            console.warn("DriveMD: Could not find current file in DOM.");
            return null;
        }

        const parent = currentEl.parentElement;
        if (!parent) return null;

        let siblings = [];
        if (currentEl.hasAttribute('data-id')) {
            siblings = Array.from(parent.children).filter(el => el.hasAttribute('data-id'));
        } else {
            siblings = Array.from(parent.children).filter(el => el.tagName === currentEl.tagName);
        }

        const index = siblings.indexOf(currentEl);
        if (index === -1) return null;

        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= siblings.length) {
            return null; // End of list
        }

        const targetEl = siblings[targetIndex];

        if (targetEl.hasAttribute('data-id')) return targetEl.getAttribute('data-id');

        const link = targetEl.querySelector('a[href*="/file/d/"], a[href*="id="]');
        if (link) {
            const href = link.getAttribute('href');
            const match = href.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || href.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) return match[1];
        }

        return null;
    }

    window.DriveMarkdown = { getFileIdFromUrl, getFileIdFromDom, isMarkdownFile, scrapePreviewText, fetchMarkdown, findSiblingId };
})();
