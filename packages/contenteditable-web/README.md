# json-document-contenteditable-web

Official DOM adapter for using `@interactive-os/json-document` text surfaces with
browser `contenteditable`.

This package owns browser-specific behavior:

- DOM Selection `<->` `SelectionSnap`
- contenteditable native text flush
- composition/native input leases
- atom elements counted as one model character
- structured text-surface clipboard fragments

```ts
import { createContentEditableAdapter } from "@interactive-os/json-document-contenteditable-web";

const adapter = createContentEditableAdapter({
  document: doc,
  root,
  surface,
});

const unbind = adapter.bind();
```

It intentionally does not define editor block semantics, toolbar policy, React
rendering, or rich text commands.

It does not call `doc.use(...)`; hosts compose the adapter around a
json-document instance.
