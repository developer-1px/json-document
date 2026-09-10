# @interactive-os/json-document-markdown

Markdown source is the canonical document. JSONDocument can store the entire
string at its root or at a string pointer; no Rich Text tree or Markdown
serializer is needed.

```ts
import { projectMarkdown } from "@interactive-os/json-document-markdown";
const projection = projectMarkdown("A **source** and __text__");
// projection.source is unchanged; strong spans use UTF-16 source offsets.
```

See [API and scope](docs/api.md) and the [caret Usage](/demo/markdown-caret).
