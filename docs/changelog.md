# Changelog

All notable changes to the active v3 packages are documented here. Earlier
source and release history remains available from Git commits and version tags.

## Next

- Added the official Connector package category for independently versioned
  external ecosystem integrations, with Zod and TanStack Table contracts.
- Added `@interactive-os/json-document-react` for React external-store
  subscriptions and Document editor component lifecycle, and migrated the
  official Document demo to that Connector.
- Added `@interactive-os/json-document-zod` to translate Zod validation issues
  into JSON Document failures and JSON Pointer diagnostics without adopting
  parsed transforms, with a connector-specific Live Demo.
- Added a browser-independent Sheet editing slice with stable row and column
  identity, rectangular selection, JSON/TSV clipboard, atomic paste, cell
  history, and the complete minimal `/demo/sheet` application.
- Reorganized official site and documentation navigation around the product
  hierarchy: Start, Core, Editing, and Connectors.
- Added the official TanStack Table v8 Connector with visible-order Sheet
  selection, clipboard, history, editable cells, and a complete Live Demo.

## 3.0.0

- **Breaking:** Removed every deprecated public naming alias and option fallback.
  The canonical API now exclusively uses `validatePatch`,
  `JSONPatchValidationResult`, `validate`, `CollaborationReplica`,
  `ReplicaStatus`, `History*`, `Text*`, `didChangeDocument`,
  `ContentEditable*`, `TextDOMAdapter`, and `DOMObservation`.
- Replaced Projection-named active standards and conformance artifacts with the
  v3 JSON Document profile, 21-symbol root manifest, and six-member
  `JSONDocument` contract.
- Raised companion peer ranges to Core `^3.0.0`; no wire field, protocol
  meaning, runtime algorithm, or package boundary changed.

## 2.0.0

- Made the collaborative text profile include actor-local selective history,
  and made capture-time text commits return the canonical owned
  `JSONAppliedChange` with optional commit metadata for editor integration.
- Declared the `2.0.0` Projection Profile Stable after the same black-box suite
  passed the public reference binding and a reference-free independent
  implementation across form, table/data-grid, outliner/tree, rich text, and
  storage/collaboration pressure vectors.
- Converged Core JSON equality and canonical array-index parsing to one
  primitive each, locked collaboration package-local equivalents to shared
  vectors, and recorded the intentional validation/owning-clone/trusted-clone
  responsibility split.
- Added independent prerelease tag publishing for the Core and both optional
  collaboration packages, and kept the live-site package gate aware of the two
  supported v2 companions.
- Enabled the two root-value cases that the active RFC 6902 implementation
  already conforms to and documented the two vendored duplicate-member cases
  that JSON module parsing cannot represent.
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
- Removed the 1.x editing session, extensions, labs, demos, and their
  documentation from the active release graph.
- Added the v2 Projection Profile, machine-readable public surface, black-box
  conformance vectors, and exact signature/package-surface checks.
- Reduced generated documentation to the single shipped Core package and made
  host adapters or separately versioned companions responsible for rich editing.
