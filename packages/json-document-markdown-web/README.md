# @interactive-os/json-document-markdown-web

Source-preserving Markdown DOM projection for the canonical contenteditable
binding. Delimiters stay in the DOM text coordinate space and become visible
when the selection intersects their strong span.

See [API and lifecycle](docs/api.md) and [caret Usage](/demo/markdown-caret).

The [browser benchmark](docs/performance.md) measures production input,
selection mapping, DOM reconciliation, and retained text History.
