# @interactive-os/json-document-rich-text-react

Official React renderer and `contenteditable` surface for the json-document Rich Text v1 profile.

`RichTextRenderer` renders canonical semantic HTML. `RichTextEditorSurface` connects that rendering to the official editor, DOM Selection, `beforeinput`, IME, Clipboard, and history integration.

```tsx
import { RichTextEditorSurface } from "@interactive-os/json-document-rich-text-react";

<RichTextEditorSurface
  editor={editor}
  aria-label="Rich Text editor"
  placeholder="Write a message"
  onAction={(action, result) => console.log(action, result)}
/>
```

Every canonical node is rendered with stable DOM mapping metadata. Containers,
inline atoms, semantic marks, list structure, code blocks, and extension
fallbacks all use the same schema-driven renderer as read-only output.

During native IME composition, `RichTextEditorSurface` freezes React document
reconciliation and DOM Selection restoration. After the Web binding reconciles
the final native DOM diff into the canonical document, the surface resumes from
the committed snapshot. This prevents React renders from terminating Korean
jamo composition or duplicating the final `insertText` event.

The official editable surface enforces `white-space: pre-wrap` so consecutive
U+0020 spaces remain visible and caret geometry stays aligned with canonical
UTF-16 offsets. Other host-provided inline styles are preserved.

Canonical empty text blocks remain empty in JSON. On the editable surface only,
they receive a non-canonical `<span data-rich-text-placeholder><br></span>` so
browsers can retain the DOM caret across consecutive Enter operations without
making the browser-mutated `<br>` a direct React reconciliation boundary.
When `placeholder` is supplied, the first empty block exposes that copy through
the same generated-content attribute plus `aria-placeholder` and
`data-rich-text-empty`. Hosts style the generated content with
`[data-rich-text-placeholder]::before`; no placeholder text node enters the
editable DOM or canonical document.
