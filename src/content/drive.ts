export function getFileIdFromUrl() {
    const urlMatch = location.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
    if (urlMatch) return urlMatch[1];

    const params = new URLSearchParams(location.search);
    if (params.get('id')) return params.get('id');

    return null;
}

export function getFileIdFromDom() {

    const activeDialogs = document.querySelectorAll<HTMLElement>('div[role="dialog"]');

    for (const dialog of activeDialogs) {
        const links = dialog.querySelectorAll<HTMLAnchorElement>('a[href*="/file/d/"], a[href*="id="]');
        for (const link of links) {
            const href = link.getAttribute('href') ?? '';
            const match = href.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match) return match[1];

            const idMatch = href.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (idMatch) return idMatch[1];
        }
    }
    return null;
}

export function isMarkdownFile() {
    const title = document.title.toLowerCase();
    return title.includes('.md') || title.includes('.markdown');
}

// Drive's native Markdown source view renders one pre/code pair per numbered line.
const numberedPreviewSelector = 'div.ndfHFb-c4YZDc-QGztLd-fmcmS-n8fv3b';
const numberedLineSelector = 'pre.ndfHFb-c4YZDc-QGztLd-fmcmS-RWgCYc-bN97Pc';

function isVisiblePreview(element: HTMLElement): boolean {
    if (element.closest('[hidden], [aria-hidden="true"]')) return false;
    for (let node: HTMLElement | null = element; node; node = node.parentElement) {
        const style = node.ownerDocument.defaultView?.getComputedStyle(node);
        if (!style) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    }
    return true;
}

function previewDocuments(): Document[] {
    const documents: Document[] = [];
    const seen = new Set<Document>();
    function visit(doc: Document) {
        if (seen.has(doc)) return;
        seen.add(doc);
        documents.push(doc);
        for (const frame of doc.querySelectorAll<HTMLIFrameElement>('iframe')) {
            if (frame.id === 'drive-md-viewer-frame' || !isVisiblePreview(frame)) continue;
            try {
                // Cross-origin frames remain isolated; do not bypass the browser's origin checks.
                if (frame.contentDocument) visit(frame.contentDocument);
            } catch {
                // A frame can navigate to another origin while the preview is being inspected.
            }
        }
    }
    visit(document);
    return documents;
}

function readNumberedPreview(root: HTMLElement): string | null {
    const children = [...root.children];
    if (!children.length || children.length % 2 !== 0) return null;
    const lines: string[] = [];
    for (let index = 0; index < children.length; index += 2) {
        const marker = children[index];
        const pre = children[index + 1];
        // Reject gaps/duplicates or a scrolled slice rather than silently truncating Markdown.
        if (marker?.getAttribute('data-line-number') !== String(lines.length + 1)) return null;
        if (!pre?.matches(numberedLineSelector)) return null;
        const code = pre.firstElementChild;
        if (pre.childElementCount !== 1 || !code?.matches('code.hljs')) return null;
        lines.push(code.textContent ?? '');
    }
    return lines.join('\n');
}

export function scrapePreviewText() {
    const documents = previewDocuments();
    const numberedPreviews = documents.flatMap(doc =>
        [...doc.querySelectorAll<HTMLElement>(numberedPreviewSelector)].filter(isVisiblePreview));
    // The native viewer is not necessarily a role=dialog and folder URLs have no file ID.
    if (numberedPreviews.length > 0) {
        const root = numberedPreviews[0];
        return numberedPreviews.length === 1 && root ? readNumberedPreview(root) : null;
    }
    const dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')]
        .filter(el => !el.closest('[hidden], [aria-hidden="true"]'));
    const roots = dialogs.length ? dialogs :
        (getFileIdFromUrl() ? [...document.querySelectorAll<HTMLElement>('main, [role="main"]')] : []);
    for (const root of roots) {
        for (const node of root.querySelectorAll<HTMLElement>('pre, .CodeMirror-code, .a-b-r-Q, .a-b-r-Q-z')) {
            if (node.closest('[hidden], [aria-hidden="true"]')) continue;
            const text = node.innerText ?? node.textContent ?? '';
            if (text.length) return text;
        }
    }
    return null;
}

export async function fetchMarkdown(fileId: string, signal?: AbortSignal) {
    const response = await fetch(`https://drive.google.com/uc?id=${encodeURIComponent(fileId)}&export=download`, { signal });
    if (!response.ok) throw new Error(`Drive download failed (HTTP ${response.status}).`);
    if (response.url) {
        const host = new URL(response.url).hostname;
        if (host !== 'drive.google.com' && !host.endsWith('.googleusercontent.com')) {
            throw new Error('Drive redirected to a login or unsupported download page.');
        }
    }
    const type = ((response.headers?.get('content-type') || '').split(';')[0] ?? '').trim().toLowerCase();
    if (type && !['text/plain', 'text/markdown', 'text/x-markdown', 'application/markdown', 'application/octet-stream'].includes(type)) {
        throw new Error(`Expected Markdown text, received ${type}.`);
    }
    const text = await response.text();
    if (/^\s*(?:<!doctype\s+html|<html(?:\s|>))/i.test(text) || text.includes('\0')) {
        throw new Error('Drive returned an HTML page or binary content instead of Markdown.');
    }
    return text;
}

export function findSiblingId(currentId: string | null, direction: -1 | 1) {
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

    const siblings = currentEl.hasAttribute('data-id')
        ? Array.from(parent.children).filter(el => el.hasAttribute('data-id'))
        : Array.from(parent.children).filter(el => el.tagName === currentEl.tagName);

    const index = siblings.indexOf(currentEl);
    if (index === -1) return null;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= siblings.length) {
        return null; // End of list
    }

    const targetEl = siblings[targetIndex];

    if (!targetEl) return null;

    if (targetEl.hasAttribute('data-id')) return targetEl.getAttribute('data-id');

    const link = targetEl.querySelector('a[href*="/file/d/"], a[href*="id="]');
    if (link) {
        const href = link.getAttribute('href') ?? '';
        const match = href.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || href.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
    }

    return null;
}
