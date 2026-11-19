# Privacy and permissions

The reader works on `drive.google.com`. Its content script reads the relevant preview DOM or requests the selected file's Markdown through Google Drive. Markdown is processed in the browser using locally bundled libraries. The extension has no telemetry or separate backend.

`activeTab` lets the popup work with the active tab on user action. `scripting` lets the popup inject the content script when it is missing. The manifest declares the Drive domain for automatic detection.

The viewer stores theme, Graph / Code mode and zoom in browser local storage. It does not save Markdown contents as preferences. Remote images in a document can cause browser requests to their image hosts, and opening a link uses normal browser navigation. Drive access remains governed by Google and the current account.
