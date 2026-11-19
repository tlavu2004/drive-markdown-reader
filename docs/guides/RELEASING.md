# Releasing

1. Set matching numeric `x.y.z` versions in `manifest.json`, `package.json`, and both version entries in `package-lock.json`. Update [CHANGELOG.md](../../CHANGELOG.md) and add release notes at `docs/releases/VX.Y.Z.md` with an uppercase `V`.
2. Merge the preparation PR. Confirm CI passed for the exact `main` commit to publish, then use that run's artifact for the [Chrome smoke checks](TESTING.md#chrome-smoke-checks).
3. From the verified commit, create and push a signed tag. The tag uses a lowercase `v`. For the first release:

   ```sh
   git tag -s v1.0.0 -m "Drive Markdown Reader v1.0.0"
   git push origin v1.0.0
   ```

4. Follow the **Release package** workflow. It verifies and packages the tagged commit, then the publish job checks that the commit is reachable from `origin/main`, verifies the archive SHA-256, and checks the tag against the packaged manifest and notes filename. The publish job attaches the same archive from that workflow's verification job.
5. Verify that [GitHub Releases](https://github.com/tlavu2004/drive-markdown-reader/releases) shows the expected notes and both assets, `drive-markdown-reader.zip` and `drive-markdown-reader.zip.sha256`.

For a local package, run `npm run check` and then `python scripts/package-extension.py` with Python 3. Outputs are written to `release-artifacts/`. To validate a matching tag name and its notes locally, run `python scripts/package-extension.py --verify-tag v1.0.0` after packaging. Chrome Web Store submission is separate from this workflow.
