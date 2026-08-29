# @interactive-os/json-document-web

Official keyboard and clipboard adapters for the public editing
contracts from `@interactive-os/json-document-editing` and
`@interactive-os/json-document-selection`.

The package provides official Web adapters for clipboard, keyboard, Press,
ARIA projection, composite focus, and text input. It translates native `ClipboardEvent`/`DataTransfer` shapes and
conventional keyboard chords without rendering UI or deciding product
keyboard policy.

`registerWebVirtualSelectionScope` coordinates native Select All and copy when a
surface mounts only part of its model. It selects the mounted root with a real
DOM Range, then writes the registered complete model text during the native
`copy` event. Nested contained scopes override a single document fallback;
editable controls keep browser-native selection.

`fileCandidateFromWebFile`, `fileCandidatesFromWebFiles`, and
`fileCandidatesFromWebClipboard` translate browser file metadata into the platform-independent
`@interactive-os/json-document-file-intake` contract without choosing IDs, storage, or product policy.

Pointer Events and HTML Drag and Drop keep separate public sessions:

```ts
import {
  createWebDragDropSession,
  createWebPointerSession,
} from "@interactive-os/json-document-web";

const pointer = createWebPointerSession({
  onPreview: renderPreview,
  onCommit: commitProductIntent,
  onCancel: clearPreview,
});

const dragDrop = createWebDragDropSession({
  onPreview: showDropTarget,
  onCommit: moveItem,
  onCancel: clearDropTarget,
});
```

The sessions own platform lifecycle state. Hit testing, valid targets, geometry,
and document Intent remain in the host.

`createWebViewportPositionPorts` measures an exact target and its paired tail
reserve, writes temporary scroll range, performs smooth or instant positioning,
and observes layout and target visibility without choosing product policy.

`createWebAnchoredFloatingPositionPorts` measures anchor, floating, and clipping
boundary rectangles and coalesces captured scroll, viewport resize, and element
resize changes. It does not choose placement or render overlay semantics.

```ts
import {
  createDocumentEditor,
  documentClipboardFormat,
} from "@interactive-os/json-document-editing";
import {
  createWebClipboardSurface,
  createWebJSONClipboardRepresentation,
  createWebKeyboardAdapter,
  selectionOperationFromModifiers,
  textInputFromControl,
} from "@interactive-os/json-document-web";

const editor = createDocumentEditor({
  blocks: [{ id: "welcome", text: "Hello" }],
});

const clipboardSurface = createWebClipboardSurface({
  codec: createWebJSONClipboardRepresentation(documentClipboardFormat),
  read: () => editor.copy(),
  cut: () => editor.cut()?.result ?? { ok: false },
  paste: (payload) => editor.dispatch({
    type: "clipboard.paste",
    clipboard: payload,
  }),
  onResult: (result) => {
    // Product messages and observation remain host policy.
  },
});

// React: <section {...clipboardSurface} />
surface.addEventListener("copy", clipboardSurface.onCopy);
surface.addEventListener("cut", clipboardSurface.onCut);
surface.addEventListener("paste", clipboardSurface.onPaste);

const keyboard = createWebKeyboardAdapter();

surface.addEventListener("click", (event) => {
  const operation = selectionOperationFromModifiers(event);
  // The host resolves geometry and dispatches its domain selection intent.
});

surface.addEventListener("keydown", (event) => {
  const command = keyboard.resolve(event);
  // Official adapter output. The host maps it through topology to a domain intent.
});

input.addEventListener("input", (event) => {
  const input = textInputFromControl(event);
  editor.dispatch({ type: "text.replace", blockId: "welcome", ...input });
});
```

Grid surfaces bind the Editing topology point to DOM without building selectors
from product identifiers:

```ts
const point = { rowId: "record-1", columnId: "status" };
const attributes = webGridCellAddressProps(point);
const cell = findWebGridCell<HTMLElement>(table, point);
```

Each Editing domain owns its clipboard format and validation. A Host declares
the formats it enables and their priority, while
`createWebJSONClipboardRepresentation` owns JSON serialization. The legacy
named codecs remain compatibility aliases over those domain formats. Clipboard
surfaces write both the structured json-document MIME payload and its
`text/plain` projection. Paste
consumes only a valid structured payload. Parsing arbitrary external plain text
into domain records or cells remains a host policy.

The official keyboard adapter owns `defaultWebKeymap`. `resolve` returns a
semantic command or `null`; `moveLinePoint` and `moveGridPoint` locate the
visible neighbor. The host still decides when a command applies and which
domain Intent to dispatch.

The clipboard binding calls `preventDefault()` only after a successful copy,
canonical cut, or canonical paste. Cut writes the selected payload before
asking the Editing companion to remove it. Missing clipboard data, malformed
payloads, unsupported cut, and rejected editing results leave native handling
available.

`createWebClipboardSurface` is the public surface-level orchestration API. It
projects one binding into `onCopy`, `onCut`, and `onPaste` handlers and reports
every result through `onResult`. `createWebClipboardBinding` remains available
for hosts that need to invoke or install each operation independently.
`isWebEditableTarget` keeps those surface bindings from replacing the native
clipboard lifecycle inside inputs, selects, textareas, and contenteditable
regions.

## Boundary

The Adapter owns:

- structured MIME serialization for public domain clipboard values;
- `ClipboardEvent` copy/cut/paste translation;
- conventional Web modifier translation to `replace`, `extend`, or `toggle`.
- the official keyboard adapter: conventional chords, a host-overridable keymap,
  and visible-order neighbor helpers.
- native text control value and caret observation without owning text selection.
- Web Press event facts without assigning a role action;
- canonical widget state to role-valid ARIA attributes;
- `aria-activedescendant` and roving-tabindex focus props without owning logical focus.
- stable focus-item attributes and DOM focus realization through
  `webFocusItemProps` and `focusWebItem`.

The host owns:

- the event target, canonical focus, when a command applies, and role workflow policy;
- DOM/canvas geometry and hit testing;
- external plain-text interpretation and product-specific paste policy;
- enabled representations and their priority;
- native text selection, IME, drag/drop, persistence, and remote protocols.

The module does not access `window`, `document`, or `navigator` during import,
so non-browser tooling can load it safely.

## Compatibility

| Package | Supported range |
| --- | --- |
| `@interactive-os/json-document-editing` | `>=0.1.0-rc.0 <1` |
| `@interactive-os/json-document-selection` | `>=0.1.0-rc.0 <1` |
