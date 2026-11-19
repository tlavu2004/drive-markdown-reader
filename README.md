# Drive Markdown Reader

A Chrome extension that renders Mermaid diagrams in Markdown files opened in Google Drive. Use Drive's built-in preview for regular Markdown, or open the extension viewer when you want diagrams, a reading theme, or zoom controls.

## Install

Download `drive-markdown-reader.zip` from [GitHub Releases](https://github.com/tlavu2004/drive-markdown-reader/releases) after a release is published. Extract it, open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**. Select the extracted directory containing `manifest.json`. The [installation guide](docs/guides/INSTALLATION.md) also covers building from source and checking the download.

## Use

1. Open a `.md` or `.markdown` file in Drive and select **Markdown** to show its source when using the native preview.
2. Click the extension icon and choose **Render Markdown**. The viewer can also open automatically when the extension detects a Markdown file.
3. Use **Graph / Code** to switch Mermaid between its diagram and source, or use the toolbar to change theme, zoom, navigate, and close the viewer.

Relative images and links may fail because the viewer has a different URL from the original document. Previous and Next depend on file IDs and visible Drive items. See [troubleshooting](docs/guides/INSTALLATION.md#troubleshooting).

## Develop

With Node.js 24.15+ on the 24.x line:

```sh
npm ci
npm run check
```

Load `dist/` in Chrome. See [architecture](docs/guides/ARCHITECTURE.md), [testing and delivery](docs/guides/TESTING.md), and [release procedure](docs/guides/RELEASING.md). See [privacy](docs/guides/PRIVACY.md) for permissions and data handling.

## Project policies

- [Contributing](.github/CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](.github/SECURITY.md)
- [Accessibility](ACCESSIBILITY.md)
- [Changelog](CHANGELOG.md)
- [MIT license](LICENSE) and [third-party notices](licenses/README.md)
