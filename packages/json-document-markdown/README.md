# @interactive-os/json-document-markdown

Markdown source is the canonical document. JSONDocument can store the entire
string at its root or at a string pointer; no Rich Text tree or Markdown
serializer is needed.

```ts
import { projectMarkdown } from "@interactive-os/json-document-markdown";
const projection = projectMarkdown("A **source** and __text__");
// projection.source is unchanged; strong spans use UTF-16 source offsets.
```

For repeated edits, `createMarkdownParser(source).update(from, to, insert)`
reuses safe syntax fragments and reports the changed block range. Uncertain
CommonMark boundaries fall back to a full parse; the raw source remains canonical.

See [API and scope](docs/api.md) and the [caret Usage](/demo/markdown-caret).
