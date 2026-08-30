# @interactive-os/json-document-markdown-react

Canonical resilient Markdown projection and React renderer for streamed json-document surfaces. It supports GFM, incomplete inline markup and code fences during streaming, custom `react-markdown` components, safe destination-less links, and an optional default stylesheet.

```tsx
import { MarkdownRenderer } from "@interactive-os/json-document-markdown-react";
import "@interactive-os/json-document-markdown-react/styles.css";

<MarkdownRenderer content={deltaAccumulatedSource} streaming components={{ code: MyCode }} />
```

The repair suffix exists only in the render projection; canonical source is never modified.
