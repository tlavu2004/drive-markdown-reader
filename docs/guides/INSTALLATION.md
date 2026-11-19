# Installation and troubleshooting

## Install from a release

1. Download the ZIP and optional SHA-256 file from [GitHub Releases](https://github.com/tlavu2004/drive-markdown-reader/releases).
2. Verify the ZIP with `sha256sum -c drive-markdown-reader.zip.sha256`, or on Windows run `Get-FileHash .\drive-markdown-reader.zip -Algorithm SHA256` and compare the hash.
3. Extract the archive. In `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted directory containing `manifest.json`.

## Install from source

With Node.js 24.15+ on the 24.x line, run `npm ci` and `npm run build`. Select the generated `dist/` directory in Chrome.

## Troubleshooting

- **MIME error for a TypeScript file** — Remove the unpacked entry pointing at the source checkout and load `dist/`.
- **Cannot find Markdown** — Close the reader, select Drive's **Markdown** source tab, then use **Render Markdown**. For a newly built version, reload the extension, refresh the Drive tab, and retry.
- **Diagram shown as code** — Choose the reader's Graph mode and use a fenced code block labeled `mermaid`. Invalid diagrams show an error in the reader.
- **Missing image or link** — Relative paths may not resolve from the reader iframe. Try an accessible absolute URL.
- **Previous or Next unavailable** — Navigation requires an identifiable file and adjacent items in Drive's current DOM.
