# Architecture

- `src/content/` detects Drive context, obtains Markdown, controls requests and mounts the viewer iframe. The source reader reconstructs numbered lines in the page or accessible same-origin frames.
- `src/popup/` sends the manual render request. If necessary, it injects the same classic script declared in the manifest.
- `src/viewer/` contains the React UI under `app/` and `components/`, preferences under `hooks/`, and the frame bridge under `messaging/`. Marked, DOMPurify, and Mermaid manage the rendered children under `rendering/`.
- `src/shared/` defines validated message payloads and runtime paths. Frame messages are checked against their sender window and origin.
- `vite.config.ts` and `scripts/build.ts` build the viewer and popup as ES modules and the content script as a classic bundle. `dist/` contains the manifest, assets and license notices.

See [Testing and delivery](TESTING.md) for the build and checks.
