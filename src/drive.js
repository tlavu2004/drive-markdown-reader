(function () {
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

    window.DriveMarkdown = { getFileIdFromUrl, getFileIdFromDom, isMarkdownFile, scrapePreviewText, findSiblingId };
})();
