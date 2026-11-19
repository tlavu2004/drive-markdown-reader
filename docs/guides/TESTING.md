# Testing and delivery

Use Node.js 24.15 or later from the 24.x line. Run `npm ci` followed by `npm run check` to typecheck the app, Vite configuration, scripts, and tests, build the extension, run the TypeScript tests directly with Node 24, and verify `dist/`. Use `npm run dev` to rebuild on changes, then reload the extension and refresh Drive.

The suite uses jsdom, simulated Drive responses, and Mermaid stubs. It covers the packaged entry points, source extraction, message validation, sanitization, request cancellation, and viewer controls. The package check verifies built assets and licenses. Browser-specific behavior and SVG rendering need manual checks.

## Chrome smoke checks

1. Install the extracted ZIP or load `dist/` in desktop Chrome.
2. Test both a standalone Drive file and a folder preview. Try **Markdown** source mode and the manual render button.
3. Render a valid Mermaid diagram and try an invalid block. Check **Graph / Code**, theme, and zoom.
4. Close and reopen the viewer. Switch files during loading and verify that obsolete results stay out of view. Try a file without download access and check that the error remains closable.
5. Try **Previous / Next** where Drive exposes other files. Check keyboard focus and contrast for affected UI changes.

Record what was actually run. Documentation-only changes can be checked by validating links, paths, examples, and the affected workflow or release tooling when relevant.

## CI artifacts

**CI** runs on PRs targeting `main`, pushes to `main`, and manual dispatch. Its shared **Extension verification** workflow runs on Ubuntu 24.04 and uses Node 24 from `.node-version`. It installs the lockfile, runs `npm run check`, and packages the verified build. The **drive-markdown-reader** Actions artifact contains the ZIP and checksum and has a 14-day retention setting. Extract the artifact, then extract the inner ZIP to install the review build.

See [Releasing](RELEASING.md) for publishing.
