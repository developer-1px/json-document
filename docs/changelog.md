# Changelog

All notable changes to the active v3 packages are documented here. Earlier
source and release history remains available from Git commits and version tags.

## Next

- Rewrote Why as the background of the editing-platform kernel: the
  same JSON Document port for Collaboration, session state in Editing,
  Hands as the genre shelf, and Adapter, Connector, and 제품 화면 as
  parallel attachments.
- Renamed the public genre shelf from Editors to Hands. Catalog title,
  navigation group, and home index say Hands; `/editors` stays as the
  path, and `createDocumentEditor` stays as the runtime API.
- Projected the site map as a forest of same-category siblings:
  Collaboration is its own tree, single demos stay off the rail,
  Adapter/Connector indexes are the integrations, and the former
  Widgets group is 제품 화면.
- Ordered sitemap branches by dependency: Collaboration lists
  Lifecycle next to Replica, Editing lists Topology before Selection,
  and Intent reference sits beside the Intent guide instead of under it.
- Made the site home a slim concept index and collapsed the desktop
  sidebar to layer names, the active layer's index, and the current
  branch. Order, Object, and Tree docs sit under Editors, Canvas sits
  under Object, Widgets is its own group, and `/demos` redirects to
  Editors.
- Attached `useEditing` to the remaining live demos. `source` is optional
  when the host owns keys, so History, Topology, Rich Text Lab,
  Contenteditable, React Hook Form, Ajv, and Zod validate use the same
  selection queries.
- Added the React editing guide for `useEditing` usage and API, and
  linked it from the Connector, Selection, and Keyboard adapter docs.
- Split object interval (`getIsSelected`) from focus (`getIsFocus`) and text
  cursor offset (`getTextOffset` / `useRestoreTextCursor`) on the shared
  React editing hook, and used that pair on every selection demo.
- Added `useEditing` to `@interactive-os/json-document-react` so hosts attach
  selection marks, press, and optional surface keyboard through
  `getIsSelected` / `getPressHandler` / `getKeyDownHandler`, and dogfooded
  that interface on the selection demos.
- Split official Adapters from Connectors and put Adapters before Connectors
  in the public concept tree. Keyboard and Clipboard are separate official
  adapters in `@interactive-os/json-document-web`, Contenteditable is an
  official adapter, and the Connector catalog keeps library integrations only.
- Opened Document, Canvas, Sheet, Tree, and Kanban as the Editors demos,
  and added `createKanbanEditor` plus object translate for those hands.
- Added minimum Order, Object, and Tree editor demos under Editors, with the
  existing guides as their entrance.
- Reorganized official site navigation into JSON Document, Editing, Editors,
  Adapters, and Connectors. Collaboration sits under JSON Document. Domain
  editors sit in Editors, including Order, Object, and Tree. Concept demos
  remain under their Editing guide.
- Reorganized official site navigation to one public tree: JSON Document,
  Editing, and Connectors. API sits with JSON Document. Document, Sheet, and
  Database sit with Editing. Concept demos remain under their guide.
- Added `@interactive-os/json-document-contenteditable`, a React
  contenteditable root that leases native input for one local JSON Document
  string pointer, with a Connector catalog Live Demo.
- Applied Sheet `cut()` to the TanStack Table Connector and official Sheet
  live paths, and named all six Web clipboard codecs plus the Database slice
  in the public catalogs.
- Applied the editing-layer Clipboard door to Order, Object, Tree, and
  Database, added Sheet `cut()` as a primary-range cell clear, and exported
  matching Web codecs.
- Named the editing-layer Intent door as `EditingIntent` / `EditingDispatch`,
  and added the Intent reference and walkthrough under Editing.
- Reorganized official site and documentation navigation to match the public
  concept tree. Concepts is the overall map in the JSON Document section.
  Editing and Connectors are the next branches. Selection sits with Topology,
  Clipboard with History; demos hang under their concept.
- Extracted visible-order `LineTopology` and `GridTopology` in the editing
  companion so Sheet and Database range selection share the same grid math,
  and opened a Topology guide under Editing.
- Applied that shared line math to Tree, Document, and Order selection
  intervals, and listed selected Sheet/Database cells with `gridCellsInRange`.
- Extended `@interactive-os/json-document-zod` with `databaseDocumentFromZod`, so
  a Zod object schema and record array become a Database document and the
  official Zod Live Demo can use that table as the admin — without a create or
  edit form.
- Split the Zod Live Demo so `/connectors/zod` is the admin table and
  `/connectors/zod/validate` is commit validation.
- Added `@interactive-os/json-document-ajv` to translate compiled synchronous
  Ajv validators into JSON Document failures and JSON Pointer diagnostics while
  validating a clone so Ajv mutations are never adopted, with a Connector Live Demo.
- Added `@interactive-os/json-document-react-hook-form` to keep form drafts and
  field lifecycle in React Hook Form while valid submits become one canonical
  editing transaction and undo/redo reset the form, with a Record Detail Live Demo.
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
- Added `@interactive-os/json-document-web` to translate structured browser
  clipboard copy/cut/paste events, text-control input, and modifier state into
  public editing and selection contracts, with a complete Live Demo.
- Applied the Web Platform Connector to the Document, Sheet, and TanStack Table
  Live Demos so native event translation composes with their existing editors.

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
