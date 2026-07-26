# Changelog

All notable changes to the active v2 package are documented here. The complete
1.x history is preserved under `archive/v1/docs/changelog.md`.

## Unreleased

- **Breaking (`2.0.0-rc.0`):** Replaced the package root with the
  provider-neutral v2 Kernel: exactly 8 runtime values and 12 public types, with
  a non-generic six-member `JSONDocument` projection.
- Removed the 1.x `/session` and `/react` entrypoints, React and Zod peer
  dependencies, and all non-Core packages from the v2 release scope.
- Archived the 1.x editing session, extensions, labs, demos, and their
  documentation. Archive contents are not compiled, tested, cataloged, or
  published as v2-compatible packages.
- Added the v2 Projection Profile, machine-readable public surface, black-box
  conformance vectors, and exact signature/package-surface checks.
- Reduced generated documentation to the single shipped Core package and made
  host adapters or separately versioned companions responsible for rich editing.
