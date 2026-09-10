# @interactive-os/json-document-markdown-react

Canonical resilient Markdown projection and React renderer for streamed json-document surfaces. It supports GFM, incomplete inline markup and code fences during streaming, custom `react-markdown` components, safe destination-less links, and an optional default stylesheet.

```tsx
import { MarkdownRenderer } from "@interactive-os/json-document-markdown-react";

<MarkdownRenderer content={deltaAccumulatedSource} streaming components={{ code: MyCode }} />
```

The repair suffix exists only in the render projection; canonical source is never modified.

`MarkdownEditingSurface` composes the source-preserving Markdown Web adapter
with a `TextEditor`. See the [editing contract](docs/editing.md) and
[caret Usage](/demo/markdown-caret). It does not convert source into a Rich Text tree.
