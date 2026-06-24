# json-document-contenteditable-web

Official DOM adapter for using `@interactive-os/json-document` text surfaces with
browser `contenteditable`.

This package splits contenteditable into a DOM-free core and a very small DOM
adapter.

The headless core owns browser-independent editing decisions:

- composition/native input leases
- text-surface mutation planning
- copy, cut, paste, and structured fragments
- atom/range preservation
- undo/redo command dispatch

The DOM adapter owns only browser I/O:

- DOM Selection `<->` `SelectionSnap`
- contenteditable text observation
- atom elements counted as one observed model character
- ClipboardEvent read/write
- native event binding

```ts
import { createContentEditableCore } from "@interactive-os/json-document-contenteditable-web";

const core = createContentEditableCore({
  document: doc,
  surface,
});

const result = core.handle({
  type: "input",
  point: { path: "/body", offset: 4 },
}, {
  point: () => ({ path: "/body", offset: 4 }),
  text: (path) => path === "/body" ? "Next text" : null,
  selection: () => doc.selection?.snapshot() ?? null,
});
```

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
