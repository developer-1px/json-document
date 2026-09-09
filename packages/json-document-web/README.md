# @interactive-os/json-document-web

## Editing host ownership

`isWebEditingHostTarget(root, target)` returns whether a DOM target belongs to
the supplied editing surface. It excludes nested input, textarea, select,
option, and explicit contenteditable boundaries (including `false`). Root and
inherited text targets are accepted. It uses the root's owner-document realm;
invalid or outside-root targets return false. This is distinct from
`isWebEditableTarget`, which identifies native editable targets without an owner.

```ts
import { isWebEditingHostTarget } from "@interactive-os/json-document-web";

surface.addEventListener("copy", (event) => {
  if (isWebEditingHostTarget(surface, event.target)) clipboard.copy(event);
});
```

The plain local, collaborative text, and Rich Text bindings all consume this
same ownership predicate; each keeps its own model reconciliation contract.

## Platform adapters

Official keyboard and clipboard adapters for the public editing
contracts from `@interactive-os/json-document-editing` and
`@interactive-os/json-document-selection`.

The package provides official Web adapters for clipboard, keyboard, Press,
ARIA projection, composite focus, and text input. It translates native `ClipboardEvent`/`DataTransfer` shapes and
conventional keyboard chords without rendering UI or deciding product
keyboard policy.

Once a supported cut has written its payload or a paste has decoded a supported
payload, the binding cancels the native event before calling the editor. A
rejected edit remains `editing.rejected` and cannot fall through to a browser
mutation. Unsupported or undecodable paste data keeps its existing pass-through
behavior.

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

세션은 플랫폼 수명주기를 소유합니다. Hit testing과 geometry의 플랫폼 관찰,
유효 대상과 문서 Intent의 의미는 각각 Adapter와 문서·Editing owner의 계약을
소비합니다. Host는 제품의 대상·정책 값과 실행 경로를 연결합니다.

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
  // Connect canonical geometry/selection APIs with the product's target.
});

surface.addEventListener("keydown", (event) => {
  const command = keyboard.resolve(event);
  // Pass the command to the canonical topology/editor API.
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
into domain records or cells belongs to the document/editor's format contract.
The Host chooses which representations and product policies to enable.

The official keyboard adapter owns `defaultWebKeymap`. `resolve` returns a
semantic command or `null`; `moveLinePoint` and `moveGridPoint` locate the
visible neighbor. The host still decides when a command applies and which
domain Intent to dispatch.

Cut writes the selected payload before asking Editing to remove it. Once a
Cut payload is owned, native deletion is cancelled before removal; a rejected
removal must not trigger another browser deletion. Copy/Paste cancel native
handling on success. Missing data and unsupported input follow the specific
failure boundary below.

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

- product-specific activation, permissions, and workflow policy;
- concrete DOM/external instances and visual composition;
- selection of canonical geometry, editor, focus, and clipboard APIs;
- product-specific paste policy values;
- enabled representations and their priority;
- composition and execution order of persistence and remote-system integrations.

Native text selection, IME, drag/drop lifecycle, serialization, and reusable UI
behavior remain at their canonical Adapter, Affordance, Connector, or UI owner.
Host composition is not an exemption from those module boundaries.

The module does not access `window`, `document`, or `navigator` during import,
so non-browser tooling can load it safely.

## Compatibility

| Package | Supported range |
| --- | --- |
| `@interactive-os/json-document-editing` | `>=0.1.0-rc.0 <1` |
| `@interactive-os/json-document-selection` | `>=0.1.0-rc.0 <1` |

## Cut failure boundary (Draft grammar)

`createWebClipboardBinding` captures the editor payload and writes its
representations before calling `cut`. A failed write leaves removal uncalled;
a rejected removal reports `editing.rejected` after native event cancellation.
Previously written clipboard data can remain in either failure case: the OS
clipboard and JSONDocument are not one transaction. Headless `editor.cut()`
returns its captured payload alongside the editing result.

[EG-CUT integration cases](tests/clipboard-rejection.test.ts) use a real
Document editor to check each write failure, schema-rejected removal, successful
capture-before-removal, and selection-restoring Undo. Existing unsupported-format
cases retain their event ownership behavior. These tests exercise the Web event
port; they do not certify browser-specific clipboard permissions or transport.

## Native text selection

`textSelectionFromControl({ currentTarget })` projects an input or textarea's
`selectionStart`, `selectionEnd`, and `selectionDirection` into the existing
`SelectionRange<number>` anchor/focus contract. A backward native selection has
its anchor at the end and focus at the start. Bounds are clamped to the text.
A missing `selectionEnd` produces a collapsed selection; a missing direction
uses start as anchor and end as focus. The existing
`textInputFromControl` text/offset result is unchanged.

```ts
import { textSelectionFromControl } from "@interactive-os/json-document-web";

const range = textSelectionFromControl({ currentTarget: textarea });
// range.anchor and range.focus preserve the native selection direction.
```

`DocumentTextControl` consumes this public projection in the live
[Document Usage](https://developer-1px.github.io/json-document/demo); its source
view links the React binding to this package's `input.ts` implementation and
[API reference](https://developer-1px.github.io/json-document/docs/api/web).
