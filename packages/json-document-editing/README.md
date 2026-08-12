# @interactive-os/json-document-editing

Headless editing transactions, selection publication, clipboard coordination,
and history for `@interactive-os/json-document`. Structural selection state and
semantic interaction contracts come from `@interactive-os/json-document-selection`.

The package keeps browser rendering and input outside the core. Its first
domain slice is a small block document used by the official site demo.

Its structural selection slices split into two reusable families without
pretending that every topology is the same:

- `Document`, `Order`, `Sheet`, and `Tree` use the range family.
  Their host or domain slice supplies ordered axes, visible order, and JSON
  Patch planning.
- `Object` uses the key family. The host owns pointer
  geometry and hit-testing, then sends only stable object IDs to the editor.

All slices keep renderer, DOM, physical keyboard policy, geometry, and expansion
state outside the common engines. Value-changing transactions store forward and
inverse patches with `selectionBefore` and `selectionAfter`; selection-only,
no-op, canceled, preview, and remote-presence changes do not create local document
history. Native text selection remains input/editor-owned and connects through
an explicit edit lease rather than becoming a structural selection variant.

`Database` keeps typed property schema and records in canonical JSON while its
saved Table views own property order and visibility, sort, and filter. The
editor projects each saved view into a visible record/property topology for
range selection, keeps native title/text caret state in the host, and restores
structural selection with record and view mutations through history.
