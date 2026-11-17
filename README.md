# Drive Markdown Reader 📄✨

A powerful Chrome Extension that renders **Markdown** files directly within Google Drive's preview pane. It transforms raw text into beautiful, readable HTML with support for diagrams, dark mode, and more.

![Demo](https://via.placeholder.com/800x400?text=Drive+Markdown+Reader+Demo)

## 🚀 Features

-   **Seamless Integration**: Opens automatically when you preview a `.md` or `.markdown` file in Google Drive.
-   **Markdown Rendering**: Uses `marked.js` to render standard Markdown (headers, lists, tables, code blocks).
-   **📊 Mermaid Diagrams**: Automatically renders Mermaid graphs (`graph`, `sequenceDiagram`, `gantt`, etc.) found in code blocks.
-   **🌓 Dark Mode**: Built-in Dark/Light theme switcher with persistence.
-   **🔍 Zoom Controls**: Zoom In/Out (50% - 250%) for better readability.
-   **Code/Graph Toggle**: Switch Mermaid diagrams between rendered view and source code with a single click.
-   **Isolated Viewer**: Runs in a secure Iframe sandbox to avoid conflicts with Google Drive's scripts and CSP.
-   **Syntax Highlighting**: Clean styling for code blocks.

## 🛠️ Installation

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (top right toggle).
4.  Click **Load unpacked**.
5.  Select the `drive-markdown-reader` folder.

## 📖 Usage

1.  Navigate to Google Drive.
2.  Double-click a Markdown file to open the preview.
3.  The extension will automatically detect the file and overlay the rendered view.
4.  **Toolbar Controls**:
    -   **📊 Graph / 📝 Code**: Toggle Mermaid diagrams.
    -   **➖ / 100% / ➕**: Adjust zoom level.
    -   **🌙 Dark / ☀️ Light**: Switch theme.
    -   **✕ Close**: Return to standard Drive preview.
5.  **Manual Trigger**: If it doesn't open automatically, click the extension icon in the browser toolbar and hit "Render Markdown".

## 🏗️ Technical Architecture

This extension uses a **Content Script + Iframe** architecture to ensure stability:

-   **Content Script (`content.js`)**: Detects Markdown files and fetches the raw content from Drive.
-   **Viewer (`src/viewer.html`)**: A sandboxed page running inside an Iframe. This ensures libraries like `Mermaid.js` run without being blocked by Google Drive's strict Content Security Policy (CSP).
-   **Communication**: The Content Script sends the raw text to the Viewer via `postMessage`.

### Libraries Used
-   [Marked.js](https://marked.js.org/) (Markdown Parser)
-   [Mermaid.js](https://mermaid.js.org/) (Diagrams)

## 📝 License

MIT License. Feel free to fork and modify!
