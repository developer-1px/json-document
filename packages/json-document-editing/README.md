# @interactive-os/json-document-editing

Headless editing transactions, selection publication, clipboard coordination,
and history for `@interactive-os/json-document`.

The package keeps browser rendering and input outside the core. Its first
domain slice is a small block document used by the official site demo.

Its structural selection slices split into two reusable families without
pretending that every topology is the same:

- `Document`, `Order`, `Sheet`, and `Tree` use the range-set transition engine.
  Their host or domain slice supplies ordered axes, visible order, and JSON
  Patch planning.
- `Object` uses the set-selection transition engine. The host owns pointer
  geometry and hit-testing, then sends only stable object IDs to the editor.

All slices keep renderer, DOM, keyboard policy, geometry, and expansion state
outside the common engines. Value-changing transactions capture selection in
the same undo/redo history entry. Native text selection remains a separate
authoring concern rather than a structural selection variant.
