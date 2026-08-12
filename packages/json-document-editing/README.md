# @interactive-os/json-document-editing

Headless editing transactions, selection publication, clipboard coordination,
and history for `@interactive-os/json-document`.

The package keeps browser rendering and input outside the core. Its first
domain slice is a small block document used by the official site demo.

Its Document and Sheet slices share one range-set transition engine while
keeping their topology and JSON Patch planning separate. The Sheet slice adds
stable row and column identity, multiple rectangular ranges, primary-range
JSON/TSV clipboard data, selection fill, cell commits, and
selection-restoring history without depending on a table renderer.
