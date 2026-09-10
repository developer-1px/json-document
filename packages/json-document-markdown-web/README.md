# @interactive-os/json-document-markdown-web

Source-preserving Markdown DOM projection for the canonical contenteditable
binding. Delimiters stay in the DOM text coordinate space and become visible
when the selection intersects their syntax range. CommonMark and GFM blocks,
inlines, tables, tasks and images share the same source mapping.

Import `@interactive-os/json-document-markdown-web/markdown-editor.css` for the
canonical presentation; customize its CSS variables with product semantic tokens.

See [API and lifecycle](docs/api.md) and [caret Usage](/demo/markdown-caret).

The [historical strong-only benchmark](docs/performance.md) measures production input,
selection mapping, DOM reconciliation, and retained text History.
