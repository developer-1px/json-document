# Changelog

All notable changes to this project are documented here.

## Unreleased

### Added

- Added lab-only ready-time materialization to the causal patch inbox for
  delayed positional edits and stable-id field replacements. Authored intents
  are admitted and deduplicated immutably, then materialized only after their
  declared dependencies are applied.
- Added structured policy-specific materialization failures and successful
  rebase diagnostics without changing direct-operation result shapes.
- Added an optional synchronous host coordination Adapter, an inbox-local
  projection journal token, and structured `baseRevision` validation so DOM
  input can be flushed before ready-time planning without giving up divergence
  detection.
- Added single SelectionPoint support across positional, stable-id, and causal
  planners. Paths are rebased while offset, edge, and affinity metadata remain
  intact for atomic document commit.

### Changed

- Changed the causal patch inbox to commit each ready direct or materialized
  envelope once through `doc.commit`, including a rebased `selectionAfter`, and
  to advance its applied ledger and causal frontier only after success.

### Performance

- Indexed explicit `baseRevision` materialization directly into the dense
  journal suffix, replaced full-ledger dependency lookup with id-to-revision
  lookup, and removed duplicate/unneeded patch copies.
- Reused the public trusted-state patch path after the initial rebase preflight
  instead of rescanning a validated large base for every replay step.
- Added `perf:causal` to compare revision-suffix materialization with the legacy
  full-journal path at configurable journal sizes.

## 1.1.0-rc.0 - 2026-07-11

This prerelease lets sibling editors such as `editable` and `canvas` exercise
the next `@interactive-os/json-document` document facade through an explicit
npm opt-in. It is published under the `next` dist-tag while `latest` remains on
`1.0.1`.

The unified mutation success result described below changes the runtime shape
published in `1.0.1`. Treat it as an integration experiment, not a stable 1.x
compatibility promise. Its final shape must be decided before a stable release.

Companion integration prereleases are published under the `next` dist-tag for
`@interactive-os/json-document-grouping`,
`@interactive-os/json-document-patch-preview`, and
`@interactive-os/json-document-search-replace` at `0.1.1-rc.1`. They keep their
stable `0.1.0` APIs and expand the core peer range to
`^1.0.1 || ^1.1.0-rc.0`, allowing `canvas` to exercise a registry-only RC graph.
The grouping RC also commits its documented `selectionAfter` atomically with
the structural patch, so undo and redo restore the matching selection state.
Each companion RC tarball now includes the repository MIT license text.

### Added

- Added `doc.query(jsonpath)` and `doc.canQuery(jsonpath)` as the canonical
  structural JSONPath query names.
- Added `selection.selectAll(options?)` as the canonical scope-wide selection
  command alias for `selectScope`.
- Added `doc.history.clear()` to clear undo/redo stacks without changing the
  current document value.
- Added `JSONDocumentEditOk<T>` and unified mutation success results around
  `{ ok, value, applied, target }`.
- Added text-surface helpers and exported text-surface result/type contracts for
  string surfaces with sidecar atom/range metadata.
- Added `invalid_target` and `missing_offsets` result codes so callers can
  distinguish target-kind failures and pointer-only text selections from other
  recoverable failures.

### Changed

- Changed mutation verbs to report a normalized `target` pointer on success when
  the operation has a single landing point. `insert` and `paste` report the first
  landing slot, `replace` reports the replaced pointer for single-target
  replaces, `move` reports the destination, `duplicate` reports the duplicated
  pointer, and delete/cut or multi-target operations report `null`.
- Deprecated `doc.find(jsonpath)` and `doc.canFind(jsonpath)` in favor of
  `query` and `canQuery`. The aliases remain available in 1.x and are planned
  for removal in 2.0.
- Deprecated `JSONDocumentInsertOptions.rekey` as paste-specific vocabulary.
  New code should use `JSONDocumentPasteOptions.rekey` or duplicate options.

### Fixed

- Fixed undo for values overwritten by add/copy inverse patches.
- Fixed JSONPath fast-path queries returning empty results for object
  containers.
- Fixed selection range removal so remaining ranges re-home correctly.
- Fixed schema introspection traversal through wrapper schemas.
- Fixed `readAt` so non-canonical array indices are rejected.
- Fixed paste-into capability errors for absent targets.
- Replanned prepared insert, paste, cut, and duplicate changes when schema
  validation or a custom rekey callback changed the document revision before
  publication.
- Preserved atomic guard-test and mutation semantics for overlapping replace
  batches and guarded proposed-change acceptance.

### Performance

- Added a copy-on-write sequential replace path for eligible overlapping
  parent/child replacements on plain structural schemas.
- Reused that path for history inverse capture and eligible guarded replace
  batches, avoiding repeated whole-document cloning while preserving operation
  order. Unsupported operations and schemas keep the canonical full-validation
  path.

## 1.0.1 - 2026-06-19

This release publishes the finalized 1.0 public API artifact after the npm
`1.0.0` package had already been published.

The current package keeps the same core concept set, but its published surface
now matches the locked 1.0 API: relative insert/move targets, payload-only
document paste, exported edit target/result types, `strict: false` default
execution policy, reasoned undo/redo command results, and the finalized
result/error contract.

### Added

- Added lab `@interactive-os/json-document-grid-range` to delegate rectangular grid paste/fill
  planning over sparse JSON records while hosts own coordinate naming and
  parsing.
- Added lab `@interactive-os/json-document-sparse-record` to delegate sparse JSON record entry
  add/replace/remove/no-op patch planning across one or more record roots.
- Added `@interactive-os/json-document-id-resolver` as an official headless extension for resolving
  scoped stable ids to current JSON Pointers.
- Added `@interactive-os/json-document-patch-preview` as an official headless extension for
  previewing schema-safe JSON Patch changes before applying them.
- Added `@interactive-os/json-document-search-replace` as an official headless extension for
  searching and replacing JSON string fields.
- Added `@interactive-os/json-document-proposed-changes` as an official headless extension for
  reviewing, accepting, and rejecting proposed JSON Patch changes.
- Added `@interactive-os/json-document-comments` as an official headless extension for review
  comments anchored to JSON Pointers.
- Added `@interactive-os/json-document-form-draft` as an official headless extension for keeping
  temporary invalid input outside schema-valid JSON documents until commit.
- Added `@interactive-os/json-document-protected-ranges` as an official headless extension for
  guarding edits to locked JSON Pointer ranges before core capability checks.
- Added `@interactive-os/json-document-snippets` as an official headless extension for inserting
  reusable JSON payload snippets through schema-safe paste.

### Changed

- Changed lab `@interactive-os/json-document-grid-range` fill to accept a host-owned
  `generateFillIntent` hook so products can preserve arithmetic/date/formula
  series semantics while json-document owns sparse record application.
- Clarified the `@interactive-os/json-document-search-replace` delegation boundary: literal JSON
  string-field find/replace is standardized, while regex engines, rendered text
  extraction, advanced search ranking, and regex replace-all capture policy
  remain host-owned.
- Renamed lab extension packages toward common editor command names: `batch-set`
  to `batch-update`, `clear-values` to `clear-contents`, `coerce` to
  `convert-type`, `collection-sort` to `sort-items`, `computed-fields` to
  `calculated-fields`, `convert-node-kind` to `convert-block-type`, `cycle` to
  `toggle-value`, `ensure-fields` to `apply-defaults`, `fill-empty` to
  `fill-blanks`, `forward-fill` to `fill-down`, `grid-paste` to `paste-cells`,
  `limit` to `limit-items`, `move-selection` to `move-selected`, `number-step`
  to `increment-number`, `pad` to `pad-text`, `paste-compatible` to
  `paste-special`, `presence-cursors` to `live-cursors`, `reindex` to
  `renumber-items`, `set-membership` to `toggle-option`, `slugify` to
  `generate-slug`, `swap` to `swap-items`, `text-transform` to `change-case`,
  `truncate` to `trim-text`, and `wrap-unwrap` to `wrap-selection`.
- Changed the default document execution error policy to `strict: false`.
  Callers that want `JSONDocumentError` throws now opt in with `strict: true`.
- Changed top-level `doc.undo()` and `doc.redo()` to return
  `JSONCapabilityResult` instead of boolean so command execution follows the
  same `can* -> command -> result` shape.
- Changed clipboard, paste, duplicate, web clipboard, and persistence failure
  diagnostics to use `reason` instead of result-level `message`. Validation
  `violations[].message` and JavaScript `Error.message` remain unchanged.

### Fixed

- Added lab extension runtime import smoke coverage so generated `dist`
  artifacts cannot contain invalid JavaScript identifiers after feature renames.
- Clarified clipboard spread docs: multi-source clipboard buffer paste spreads
  by default at array insertion targets, while direct array payload insert uses
  explicit `spread: true`.
- Added semantic contract references for result/error, selection, and schema
  introspection to LLM-facing docs.

## 1.0.0 - 2026-05-28

### Added

- Added the stable document facade for schema-guarded JSON editing:
  `find`, `insert`, `replace`, `delete`, `move`, `duplicate`, `copy`, `cut`,
  `paste`, `undo`, and `redo`.
- Added matching `can*` probes for the document editing verbs so command UIs can
  show disabled reasons without mutating state.
- Added selection-backed defaults for editing verbs where the source or target is
  naturally the current selection.
- Added `@interactive-os/json-document/react` as the React adapter entrypoint for the same
  `JSONDocument` surface.
- Added extension-lab packages to test whether core concepts can support
  annotation anchors, autosave, checkpoints, clipboard, persistence, dirty
  state, schema forms, presence cursors, patch logs, bulk editing, computed
  fields, collection sorting, document diffs, document outlines, field drafts,
  patch previews, Pointer bookmarks, document-wide text search, and drag/drop
  intents without expanding the core API.
- Added `@interactive-os/json-document-clipboard-web` as a browser clipboard extension boundary.
- Added `@interactive-os/json-document-collection` as the first official collection editing
  extension for ordered JSON arrays.
- Added `@interactive-os/json-document-schema-form` as an official schema-backed field descriptor
  extension.
- Added `@interactive-os/json-document-dirty-state` as an official clean-baseline dirty tracking
  extension.
- Added `@interactive-os/json-document-bulk-edit` as an official JSONPath replace-all/delete-all
  extension.
- Added `@interactive-os/json-document-patch-log` as an official applied-patch recording and replay
  extension.
- Added `@interactive-os/json-document-persist-web` as an official local document persistence
  extension for browser storage-like hosts.
- Added deterministic `persist-web.watch().flush()` / `status()` affordances for
  downstream integration tests.
- Added optional `bulk-edit` command metadata forwarding for labeled replace-all
  and delete-all changes.
- Added standardization checks, public conformance tests, and API Lab coverage
  for the public facade.

### Changed

- Promoted editor feature verbs to the primary document surface while keeping
  JSON Patch through `patch` and `commit` as the explicit escape hatch.
- Standardized document command names around common editing-tool vocabulary:
  Insert, Delete, Find, Replace, Cut, Copy, Paste, Duplicate, Move, Undo, Redo.
- Standardized docs around the outside-in flow:
  `schema -> document -> pointer/query -> can* -> change -> result`.
- Moved browser/system clipboard responsibility out of core and into extension
  composition.
- Updated Workbench/API Lab to expose the public facade directly instead of
  teaching nested internal paths first.
- Kept React lifecycle concerns in `@interactive-os/json-document/react`; the root package remains
  headless and React-free.

### Fixed

- Aligned `duplicate()` with `canDuplicate()` so both can use the current primary
  selection when the source pointer is omitted.
- Removed stale documentation references that presented nested clipboard methods
  as the primary mutation surface.
- Aligned extension docs with shipped packages and kept lab candidates out of
  the official extension list.

### Contract

- Core owns JSON state, JSON Pointer, JSON Patch, JSONPath search, schema
  validation, headless selection, headless clipboard payload flow, undo/redo
  history, and reasoned capability probes.
- Core does not own rendering, DOM focus, keyboard policy, drag and drop,
  command palette UI, system clipboard integration, persistence, transport,
  CRDT/OT conflict resolution, or product-specific command names.
