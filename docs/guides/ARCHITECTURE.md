# Architecture and source layout

## Reading a file

The popup sends a manual render request to the Drive tab. If the content script is missing, the popup injects the same classic script listed in the manifest and retries. Automatic opening uses the Drive page title as a heuristic.

The content controller looks for a file ID in the URL or preview DOM. It tries the Drive download first, then reads the active preview when available. The numbered-source reader expects a single visible block with consecutive lines starting at 1. It traverses accessible same-origin frames and skips inaccessible frames. A separate fallback reads visible text from recognized preview elements. Previous and Next use adjacent file IDs exposed by the current Drive list or grid. An explicit navigation request needs a downloadable target.

## Rendering and lifetime

The content controller opens an extension-origin iframe and waits for the viewer to announce readiness before sending Markdown or an error. Both ends check the sender window, origin, and message payload. The controller aborts superseded downloads and discards stale results.

React manages the toolbar, preferences, and load or error state. Marked parses Markdown, DOMPurify sanitizes the generated HTML, and Mermaid renders diagram blocks in strict mode. Mermaid runs are serialized because they share configuration. Closing the viewer cancels pending work, and viewer cleanup removes its message listener.

## Source and build

| Path | Responsibility |
| --- | --- |
| `src/content/` | Drive detection, source reading, download, navigation, and viewer lifetime |
| `src/popup/` | Manual render button, injection fallback, and status |
| `src/viewer/` | React UI, message bridge, local preferences, and rendering |
| `src/shared/` | Runtime paths, DOM helpers, and message validation |
| `vendor/`, `licenses/` | Bundled libraries and notices |
| `scripts/`, `tests/` | Build, verification, packaging, and regression tests |

Vite builds the popup and viewer as ES modules and the content script as a classic bundle that Chrome can inject. The build emits source maps and copies the manifest, runtime libraries and licenses to `dist/`. For commands and checks, see [Testing and delivery](TESTING.md).
