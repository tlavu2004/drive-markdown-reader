# Releasing

1. Set the same `x.y.z` version in `manifest.json`, `package.json`, and `package-lock.json`. Update [CHANGELOG.md](../../CHANGELOG.md) and add `docs/releases/VX.Y.Z.md`.
2. Merge the release preparation PR and confirm CI is green on the exact `main` commit being released. Install and test its CI artifact in Chrome.
3. From that commit on `main`, create and push a signed version tag. For the first release:

   ```sh
   git tag -s v1.0.0 -m "Drive Markdown Reader v1.0.0"
   git push origin v1.0.0
   ```

4. Check the **Release package** workflow and the resulting GitHub Release. It runs the shared verification again on the tagged commit, checks that the commit belongs to `main`, validates the tag against the packaged manifest and checks the SHA-256. It then attaches that same ZIP and checksum with the versioned release notes.

To reproduce packaging locally, run `npm run check` and then `python scripts/package-extension.py` with Python 3. The ZIP and checksum are in `release-artifacts/`. Chrome Web Store submission is a separate manual process.
