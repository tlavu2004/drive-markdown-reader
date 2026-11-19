# Third-party licenses

`vendor/` contains bundled third-party runtime JavaScript, organized by library. This directory contains separate license files; preserve any license and copyright notices embedded in the JavaScript bundles as well.

- DOMPurify: `DOMPurify.LICENSE` is copied from the installed package by `npm run vendor` together with `vendor/dompurify/purify.min.js`.
- Marked and Mermaid: existing bundled files were relocated without modification, including embedded notices. Their dependencies may carry additional notices in the bundles.

- React, React DOM and Scheduler are bundled by Vite into the viewer JavaScript. `React.LICENSE`, `ReactDOM.LICENSE` and `Scheduler.LICENSE` are refreshed from the installed packages by `npm run vendor` and copied into `dist/licenses/`.
