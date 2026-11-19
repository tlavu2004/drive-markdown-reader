# Privacy and permissions

The manifest registers a content script on `https://drive.google.com/*`. The viewer and its packaged assets are also exposed to Drive pages through the manifest.

| Permission | Use |
| --- | --- |
| `activeTab` | Lets the popup inspect the active tab when invoked. |
| `scripting` | Lets the popup inject the content script if it has not started. |

The script reads the visible Markdown preview or requests file contents from Google Drive, subject to the current browser session and Drive access. The download code accepts responses from Drive or its Googleusercontent download host after validation. The viewer processes the Markdown in memory with packaged libraries. The extension has no telemetry or separate application backend.

Viewer preferences are saved in the extension iframe's browser `localStorage`. The keys are `drive-md-dark-mode`, `drive-md-mermaid-source`, and `drive-md-zoom`. File contents are not written to this storage.

Remote images referenced in Markdown can cause requests to their hosts. Clicking a link uses ordinary browser navigation. Avoid sharing private Drive links or document contents in public reports.
