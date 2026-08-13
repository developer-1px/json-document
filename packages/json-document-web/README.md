# @interactive-os/json-document-web

Web Platform Connector for the public clipboard and selection interaction
contracts from `@interactive-os/json-document-editing` and
`@interactive-os/json-document-selection`.

The package translates browser-native `ClipboardEvent`/`DataTransfer` shapes
without rendering UI or deciding product keyboard policy.

```ts
import { createDocumentEditor } from "@interactive-os/json-document-editing";
import {
  createWebClipboardBinding,
  documentClipboardCodec,
  selectionOperationFromModifiers,
  textInputFromControl,
} from "@interactive-os/json-document-web";

const editor = createDocumentEditor({
  blocks: [{ id: "welcome", text: "Hello" }],
});

const clipboard = createWebClipboardBinding({
  codec: documentClipboardCodec,
  read: () => editor.copy(),
  cut: () => editor.cut()?.result ?? { ok: false },
  paste: (payload) => editor.dispatch({
    type: "clipboard.paste",
    clipboard: payload,
  }),
});

surface.addEventListener("copy", (event) => clipboard.copy(event));
surface.addEventListener("cut", (event) => clipboard.cut(event));
surface.addEventListener("paste", (event) => clipboard.paste(event));

surface.addEventListener("click", (event) => {
  const operation = selectionOperationFromModifiers(event);
  // The host resolves geometry and dispatches its domain selection intent.
});

input.addEventListener("input", (event) => {
  const input = textInputFromControl(event);
  editor.dispatch({ type: "text.replace", blockId: "welcome", ...input });
});
```

Document, Sheet, Order, Object, Tree, and Database codecs write both the
structured json-document MIME payload and its `text/plain` projection. Paste
consumes only a valid structured payload. Parsing arbitrary external plain text
into domain records or cells remains a host policy.

The binding calls `preventDefault()` only after a successful copy, canonical
cut, or canonical paste. Cut writes the selected payload before asking the
Editing companion to remove it. Missing clipboard data, malformed payloads,
unsupported cut, and rejected editing results leave native handling available.

## Boundary

The Connector owns:

- structured MIME serialization and validation for public domain clipboard
  values;
- `ClipboardEvent` copy/cut/paste translation;
- conventional Web modifier translation to `replace`, `extend`, or `toggle`.
- native text control value and caret observation without owning text selection.

The host owns:

- the event target, focus, keyboard shortcuts, and accessibility wiring;
- DOM/canvas geometry and hit testing;
- external plain-text interpretation and product-specific paste policy;
- native text selection, IME, drag/drop, persistence, and remote protocols.

The module does not access `window`, `document`, or `navigator` during import,
so non-browser tooling can load it safely.

## Compatibility

| Package | Supported range |
| --- | --- |
| `@interactive-os/json-document-editing` | `>=0.1.0-rc.0 <1` |
| `@interactive-os/json-document-selection` | `>=0.1.0-rc.0 <1` |
