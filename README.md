# Drive Markdown Reader

A powerful Chrome Extension that renders **Markdown** files directly within Google Drive's preview pane. It transforms raw text into beautiful, readable HTML with support for diagrams, dark mode, and more.

![Demo](https://via.placeholder.com/800x400?text=Drive+Markdown+Reader+Demo)

## Features

-   **Seamless Integration**: Opens automatically when you preview a `.md` or `.markdown` file in Google Drive.
-   **Markdown Rendering**: Uses `marked.js` to render standard Markdown (headers, lists, tables, code blocks).
-   **Mermaid Diagrams**: Automatically renders Mermaid graphs (`graph`, `sequenceDiagram`, `gantt`, etc.) found in code blocks.
-   **Dark Mode**: Built-in Dark/Light theme switcher with persistence.
-   **Zoom Controls**: Zoom In/Out (50% - 250%) for better readability.
-   **Code/Graph Toggle**: Switch Mermaid diagrams between rendered view and source code with a single click.
-   **Isolated Viewer**: Runs in a extension-origin iframe to avoid conflicts with Google Drive's scripts and CSP.
-   **Syntax Highlighting**: Clean styling for code blocks.

## Installation

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (top right toggle).
4.  Click **Load unpacked**.
5.  Select the `drive-markdown-reader` folder.

## Usage

1.  Navigate to Google Drive.
2.  Double-click a Markdown file to open the preview.
3.  The extension will automatically detect the file and overlay the rendered view.
4.  **Toolbar Controls**:
    -   **Graph / Code**: Toggle Mermaid diagrams.
    -   **- / 100% / +**: Adjust zoom level.
    -   **Dark / Light**: Switch theme.
    -   **Close**: Return to standard Drive preview.
5.  **Manual Trigger**: If it doesn't open automatically, click the extension icon in the browser toolbar and hit "Render Markdown".

## Technical Architecture

This extension uses a **Content Script + Iframe** architecture to ensure stability:

-   **Drive helpers (`src/drive.js`)**: Detect file IDs, locate preview text and sibling files, and validate downloads.
-   **Content controller (`src/content.js`)**: Own viewer lifecycle, request cancellation, automatic opening and message validation.
-   **Renderer (`src/render.js`)**: Parse and sanitize Markdown, preserve Mermaid source, and serialize diagram rendering.
-   **Viewer (`src/viewer.html`, `src/viewer.js`)**: Own toolbar controls, saved preferences and display state in an extension-origin iframe.
-   **Popup (`popup.js`)**: Request manual opening and inject the content entry points when necessary.
-   **Communication**: Validate message source, origin and payload; send only to the intended origin.

### Development and verification

The unpacked extension includes its runtime libraries; installing Node dependencies is only needed for development.

```sh
npm ci
npm test
```

After updating the pinned DOMPurify dependency, run `npm run vendor` and commit the generated `src/lib/purify.min.js` together with its license. Runtime libraries are bundled locally; no CDN is required.

Regression tests use jsdom, the bundled Marked and DOMPurify, simulated Drive responses, and a Mermaid stub. They cover unsafe content, message validation, close/reopen behavior, stale requests, download errors, and theme rendering order. Real Drive selectors, authenticated downloads, Chrome extension isolation and actual Mermaid SVG layout still need browser verification.

Manual smoke checks after reloading the extension:

1. Open Markdown in a standalone Drive preview and a folder preview; check a short and an empty file.
2. Close the viewer, interact with Drive, and confirm it stays closed; reopen it using the popup.
3. Switch files or close while downloading; confirm old content never reappears.
4. Confirm a denied download shows a readable error and remains closable.
5. Render a valid and an invalid Mermaid block, toggle theme repeatedly, then verify zoom and Graph/Code controls still work.
6. Verify Previous/Next on the available Drive list/grid; virtualized items outside the DOM may not be discoverable.

### Libraries Used
-   [Marked.js](https://marked.js.org/) (Markdown Parser)
-   [DOMPurify](https://github.com/cure53/DOMPurify) (HTML Sanitizer)
-   [Mermaid.js](https://mermaid.js.org/) (Diagrams)

## License

MIT License. Feel free to fork and modify!
