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

When a cut callback is configured, the binding cancels native cut before attempting
to write, including unavailable/failed/partial writes. It calls the editor only after
every representation is written. A supported paste is cancelled after decoding and before editing. A
rejected edit remains `editing.rejected` and cannot fall through to a browser
mutation. Unsupported or undecodable paste data keeps its existing pass-through
behavior.

See the owning [Clipboard event contract](docs/clipboard.md) for captured targets,
native editable ownership and observable failure semantics.

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
`text/plain` projection. `captureWebClipboardPaste` captures an enabled structured
representation, files, opt-in image-containing HTML (`html: "images"`), or literal
text before the event expires. `delegatedMimeTypes` leaves recognized formats to
an existing nested binding before this priority. Its codec is optional. Domain conversion belongs to the canonical
Editing or Hand API; the Host supplies product policy.

`readWebRasterFiles` validates a PNG/JPEG/WebP batch and prepares its embedded
content and intrinsic dimensions through `readWebRasterFile`. Canvas and Composer
share this path. File Intake owns `RasterImageContent`; Web owns reading and
decoding, not document mutation or server upload. See the
[Clipboard API and remaining TBD](docs/clipboard.md).

`parseWebHTMLFragment` is the inert platform parser shared with Rich Text Web;
its nodes are conversion input, never live DOM insertion output.
`parseWebClipboardHTML` projects ordered text/image sources. `readWebHTMLClipboard`
checks embedded PNG/JPEG/WebP data URLs before allocating bytes and reuses the
raster batch reader. It does not fetch external, relative, blob, or cid URLs.
Canvas consumes mixed content; Composer accepts image-only HTML and explicitly
rejects mixed text/images until its document profile can represent them.

The official keyboard adapter owns `defaultWebKeymap`. `resolve` returns a
semantic command or `null`; `moveLinePoint` and `moveGridPoint` locate the
visible neighbor. The host still decides when a command applies and which
domain Intent to dispatch.

The clipboard binding cancels cut before attempting a write, and only removes
the captured selection after the write succeeds. Copy cancels after writing;
its synchronous paste cancels after decoding a supported representation and
before invoking Editing. Decode failures retain that binding's existing
pass-through. In contrast, `captureWebClipboardPaste` claims a recognized
representation before decoding, so an invalid structured payload cannot fall
back to other content. Missing or unrecognized content remains unclaimed.

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
- composition of canonical text-selection, IME and drag/drop bindings;
- injection of persistence and remote-system instances.

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

Default keyboard interpretation has one owner here. `chordFromStroke` folds
Meta/Control into `Mod`, preserves Alt/Shift, normalizes single-character case,
and maps the space key to `Space`. Unlisted chords resolve to `null`; for
example, Mod+Alt+Z and Mod+Backspace have no default structural command.
`createWebKeyboardAdapter({ keymap, defaults: false })` can explicitly assign
such chords for a product profile. Affordance consumes the default delete
mapping; Composer consumes its Undo/Redo mapping. Select-all remains an
Affordance policy over the canonical chord normalizer, outside
`WebKeyboardCommand`.
