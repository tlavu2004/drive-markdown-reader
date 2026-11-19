# Testing and delivery

Use Node.js 24.15+ on the 24.x line:

```sh
npm ci
npm run check
```

This checks TypeScript types in the app, tooling, and tests, builds the production extension, runs the TypeScript tests with Node and jsdom, and verifies the package paths. Node 24 runs the TypeScript scripts and tests directly. `npm run dev` watches source changes. Reload the extension in Chrome and refresh Drive after rebuilding.

CI runs on PRs to `main`, pushes to `main`, and manual dispatch. The shared workflow uploads the ZIP and SHA-256 of the checked build. Automated tests simulate Drive and use a Mermaid stub.

Before releasing, install the extracted ZIP in Chrome. Open a Drive Markdown file with Mermaid, verify Graph / Code, theme, zoom and close, and try the source shown inside Drive's native preview. Check that switching files quickly does not display stale content and that download failures remain closable. Record what you verified in the PR.

See [Releasing](RELEASING.md) for the tag and delivery process.
