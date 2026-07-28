# Changelog

All notable changes to the active v2 packages are documented here. The complete
1.x history is preserved under `archive/v1/docs/changelog.md`.

## Unreleased

- Added the independently versioned, transport-free
  `@interactive-os/json-document-collaboration` provider. Local and
  collaborative runtimes expose the same six-member `JSONDocument` Projection;
  causal bundles, conflicts, checkpoints, selective history, and text
  authoring remain optional sidecars.
- Added
  `@interactive-os/json-document-contenteditable-collaboration`, an optional
  publication lease that lets native input and IME composition keep temporary
  DOM ownership while the collaborative model continues to ingest changes.
- Kept the Core package dependency-free: local-only consumers install neither
  collaboration package, and the Kernel API and 20-symbol public surface do not
  change.
- **Breaking (`2.0.0-rc.0`):** Replaced the package root with the
  provider-neutral v2 Kernel: exactly 8 runtime values and 12 public types, with
  a non-generic six-member `JSONDocument` projection.
- Removed the 1.x `/session` and `/react` entrypoints, React and Zod peer
  dependencies, and all 1.x non-Core packages from the v2 release scope.
- Archived the 1.x editing session, extensions, labs, demos, and their
  documentation. Archive contents are not compiled, tested, cataloged, or
  published as v2-compatible packages.
- Added the v2 Projection Profile, machine-readable public surface, black-box
  conformance vectors, and exact signature/package-surface checks.
- Reduced generated documentation to the single shipped Core package and made
  host adapters or separately versioned companions responsible for rich editing.
