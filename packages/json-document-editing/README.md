# @interactive-os/json-document-editing

Headless editing transactions, selection publication, clipboard coordination,
and history for `@interactive-os/json-document`.

The package keeps browser rendering and input outside the core. Its first
domain slice is a small block document used by the official site demo.

Its Sheet slice adds stable row and column identity, rectangular cell
selection, JSON/TSV clipboard data, cell commits, and selection-restoring
history without depending on a table renderer.
