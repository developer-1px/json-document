# @interactive-os/json-document-rich-text-react

Official React renderer and `contenteditable` surface for the json-document Rich Text v1 profile.

`RichTextRenderer` renders canonical semantic HTML. `RichTextEditorSurface` connects that rendering to the official editor, DOM Selection, `beforeinput`, IME, Clipboard, and history integration.

```tsx
import { RichTextEditorSurface } from "@interactive-os/json-document-rich-text-react";

<RichTextEditorSurface
  editor={editor}
  aria-label="Rich Text editor"
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
