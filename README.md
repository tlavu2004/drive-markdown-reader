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
-   **Isolated Viewer**: Runs in an extension-origin iframe to avoid conflicts with Google Drive's scripts and CSP.
-   **Syntax Highlighting**: Clean styling for code blocks.

## Installation

1.  Clone or download this repository, then run `npm ci` and `npm run build` using Node.js 24.15 or newer in the 24.x release line.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (top right toggle).
4.  Click **Load unpacked**.
5.  Select the generated `drive-markdown-reader/dist` folder. The repository root is build source, not the unpacked extension.

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

-   **Drive helpers (`src/content/drive.ts`)**: Detect file IDs, locate preview text and sibling files, and validate downloads.
-   **Content controller (`src/content/index.ts`)**: Own viewer lifecycle, request cancellation, automatic opening and message validation.
-   **Renderer (`src/viewer/render.ts`)**: Parse and sanitize Markdown, preserve Mermaid source, and serialize diagram rendering.
-   **React viewer (`src/viewer/main.tsx`, `src/viewer/Viewer.tsx`)**: Mount components in an extension-origin iframe. `Toolbar`, `ViewerStatus` and `MarkdownContent` retain the existing controls, loading/error messages and reader styling.
-   **Popup (`src/popup/popup.ts`)**: Request manual opening and inject the content entry points when necessary.
-   **Communication**: Validate message source, origin and payload; send only to the intended origin.

### Directory layout

Source files are grouped by extension surface rather than file extension. A popup or viewer keeps its HTML, CSS and controller together; external runtime libraries and their licenses are kept outside application source.

```text
manifest.json          # Build manifest template
vite.config.ts
tsconfig.json
src/
  content/
    drive.ts
    index.ts
  popup/
    index.html
    popup.css
    popup.ts
  viewer/
    index.html
    viewer.css
    main.tsx
    mount.tsx
    Viewer.tsx
    components/
    hooks/
    render.ts
  shared/              # Typed messages, DOM utilities and runtime paths
  types/vendor.d.ts    # Contracts for the existing vendor globals
vendor/
  dompurify/purify.min.js
  marked/marked.min.js
  mermaid/mermaid.min.js
licenses/
  DOMPurify.LICENSE
  React.LICENSE
  ReactDOM.LICENSE
  Scheduler.LICENSE
scripts/
  build.mjs
  vendor.cjs
  verify-extension.cjs
tests/
dist/                  # Generated extension; ignored by Git
```

### Development and verification

The source uses TypeScript with strict checking and Vite, with React for the viewer. Popup and content scripts remain plain TypeScript. Node dependencies are required to build; Chrome loads only the generated `dist/` directory, including its bundled runtime libraries.

```sh
npm ci
npm run check
```

`npm run check` runs strict typechecking, production builds, all tests, and verification of the generated extension. Individual commands:

- `npm run typecheck`: check application and Vite configuration types without writing JS.
- `npm run build`: clean production build to `dist/`, including popup, viewer, a classic `content.js`, runtime libraries and licenses.
- `npm test`: build and run regression tests, including the generated content script and built popup/viewer smoke tests.
- `npm run verify:extension`: verify an existing `dist/` for missing assets, module chunks, manifest entries and license/library integrity.
- `npm run dev`: build and watch both HTML pages and the classic content script. Reload the extension in Chrome after a rebuild; this does not use a Vite dev server or HMR in the extension.

Popup and viewer use native ES modules; the content script bundles its imports into a classic IIFE so both manifest loading and manual `chrome.scripting.executeScript` work. Source maps are generated for debugging. Vendored parser, sanitizer and Mermaid versions remain unchanged. React/React DOM are bundled locally into the viewer entry; no CDN or extra extension permission is required.

Viewer lifecycle:

- `useViewerMessages` registers the validated parent-message listener before announcing `VIEWER_READY`, then removes it on unmount.
- `usePreferences` owns theme, Graph/Code and bounded zoom state, persists the existing storage keys, and removes viewer-only body classes on unmount.
- React owns the toolbar and loading/error states. Only the Markdown renderer owns descendants of its rendering host, preventing React and Mermaid from editing the same DOM children.
- Each renderer has an isolated Marked instance. Diagram work is serialized across renderers because Mermaid configuration is shared. Effect cleanup cancels pending jobs and ignores stale errors/completions.
- StrictMode is enabled to exercise mount/cleanup behavior during development. The entry unmounts on non-persisted `pagehide` and preserves the mounted tree for back/forward cache restoration.

The viewer entry is approximately 225 KB minified (70 KB gzip), including React, compared with about 4 KB before this migration. Popup and content-script bundles do not import React.

After updating the pinned DOMPurify dependency, run `npm run vendor` to refresh both `vendor/dompurify/purify.min.js` and `licenses/DOMPurify.LICENSE`, and the React/React DOM/Scheduler license files, then commit the refreshed files. Runtime libraries are bundled locally; no CDN is required.

The asset verifier checks the built manifest, HTML references, shared chunks, classic content-script syntax and packaged library/license bytes. The built-popup test checks the manual injection list against the built manifest.

Regression tests use jsdom, the bundled Marked and DOMPurify, simulated Drive responses, and a Mermaid stub. Content-controller tests run the production `dist/content.js`; helper/renderer tests compile TypeScript modules with esbuild. React tests use development builds with `act` and StrictMode to check cleanup, preferences, message handling and rendering across remounts. Two additional smoke tests execute the built popup/viewer entry points and their shared chunks. They cover unsafe content, message validation, close/reopen behavior, stale requests, download errors, and theme rendering order. Real Drive selectors, authenticated downloads, Chrome extension isolation and actual Mermaid SVG layout still need browser verification.

Tooling audit (2026-11-19): `npm audit` reports no advisories for the current locked dependency tree. Re-run it when updating dependencies.

Manual smoke checks after reloading the extension:

1. Open Markdown in a standalone Drive preview and a folder preview; check a short and an empty file.
2. Close the viewer, interact with Drive, and confirm it stays closed; reopen it using the popup.
3. Switch files or close while downloading; confirm old content never reappears.
4. Confirm a denied download shows a readable error and remains closable.
5. Render a valid and an invalid Mermaid block, toggle theme repeatedly, then verify zoom and Graph/Code controls still work.
6. Verify Previous/Next on the available Drive list/grid; virtualized items outside the DOM may not be discoverable.

### Libraries Used
-   [React](https://react.dev/) (Viewer UI)
-   [Marked.js](https://marked.js.org/) (Markdown Parser)
-   [DOMPurify](https://github.com/cure53/DOMPurify) (HTML Sanitizer)
-   [Mermaid.js](https://mermaid.js.org/) (Diagrams)

## License

MIT License. Feel free to fork and modify!
