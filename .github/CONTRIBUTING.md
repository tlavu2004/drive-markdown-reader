# Contributing

Read the [Code of Conduct](../CODE_OF_CONDUCT.md) and [architecture guide](../docs/guides/ARCHITECTURE.md). Branch from `main` using a focused name such as `fix/preview-detection` or `docs/install-guide`. Use Conventional Commit subjects and sign commits with GPG when configured.

For code changes, run `npm run check` and describe relevant Chrome/Drive smoke checks. For documentation-only changes, verify links, path casing, examples, and claims against the code. See [Testing and delivery](../docs/guides/TESTING.md) for the verification scope.

Write documentation in English and use uppercase filenames with a lowercase `.md` extension. Put detailed guides in `docs/guides/` and real screenshots in `docs/images/`.

Use spaces for Markdown list indentation. Align continuation text, images, and nested lists with the first character of the parent item's text. This takes two spaces after `- ` or `* `, three after `1. `, and four after `10. `.

Use a minimal, shareable Markdown sample for Drive preview changes. Remove private file IDs and account details from logs or screenshots. Report vulnerabilities privately via the [security policy](SECURITY.md).
