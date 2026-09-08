# @interactive-os/json-document-affordance

Official keyboard and mouse editing affordances for json-document hosts.
Preview results are `{ hand, cursor? }`. A write is `commitAffordance`
then `applyAffordance(..., { commit })`. Hosts keep markup and genre
Intent. It does not render widgets.

```sh
npm i @interactive-os/json-document-affordance
```

```ts
import {
  applyAffordance,
  pointerSelect,
} from "@interactive-os/json-document-affordance";

applyAffordance(pointerSelect(event), {
  hand: (hand) => {
    if (hand.type === "select") {
      editor.dispatch({ type: "selection.set", itemId, mode: hand.operation });
    }
  },
});
```

Keyboard Adapter still translates chords. This package decides the
affordance those commands mean. `pressAffordance` owns source-aware transient
custom-control Press start/end/cancel and disabled gating; persistent toggle state remains in
the product and ARIA projection remains in the Web Adapter. React Connector still answers selection
queries through `useEditing` ports.

The public keyboard projection fills that port without a site-local adapter:

```ts
import { editingCommandFromWebKeyboardStroke } from "@interactive-os/json-document-affordance";

useEditing({
  keyboard: {
    resolve: editingCommandFromWebKeyboardStroke,
    focusKey,
    neighbor,
  },
  // selection state and dispatch stay with the host
});
```

`historyAffordance(snapshot).hand` exposes the typed Undo/Redo availability map
directly. The editing runtime still owns history state and execution.

`contentInteractionAffordance` is the canonical product-content state model.
It distinguishes persistent selection, transient active feedback, movement,
drop targets, and insertion positions without owning DOM or product color.

`createTypeaheadSession`, `createRenameSession`, and `createLineFocusSession`
own the reusable state that spans several events. Product selection and rename
Intents remain callbacks supplied by the host.

`createRenameSession` accepts either the legacy `onCommit(key, draft): void`
or synchronous `tryCommit(key, draft): boolean`. A false result keeps the active
key and draft without publishing a finish. Updating and retrying can then
complete the edit; success or cancellation clears the draft and calls `onFinish`
once. The domain editor still owns validation and document changes:

```ts
createRenameSession<string>({
  tryCommit: (itemId, label) => editor.dispatch({ type: "item.rename", itemId, label }).ok,
  onSnapshot: renderDraft,
  onFinish: restoreFocus,
});
```

`createBoardDragSession` owns the input-agnostic active item, drop-target
preview, commit, and cancel lifecycle for Board Hands. Web pointer and HTML
Drag and Drop sessions feed it; Hosts still resolve targets and dispatch the
domain move Intent.

`createCanvasGestureSession` owns one active semantic Canvas gesture and its
preview, commit, cancel, and supersede lifecycle. Web pointer capture and Host
coordinate, hit-test, renderer, lock, and viewport policies stay outside it.

`createViewportPositionSession` places an exact logical target at a requested
viewport offset. It creates the missing trailing scroll range near the document
end, reconciles that range as layout grows, and removes it when the target
leaves the viewport; target meaning remains in the Host.

`computeAnchoredFloatingPosition` places platform-independent floating geometry
beside an anchor rectangle. A `preferred` policy evaluates collision fallbacks;
a `locked` policy preserves its declared side and reports overflow instead of
pretending that complete viewport visibility is possible. The result exposes
the final placement and available size while Tooltip, Menu, Dialog, and product
open/focus semantics remain outside this geometry contract.

Usage: [Affordance](https://developer-1px.github.io/json-document/docs/affordance)

`selectAllAffordance(stroke, state, { repeat: "preserve" })` emits `select-all`
for Mod+A without Alt or Shift, even when everything is selected. The default
editing Usage chooses this policy. Omission or `{ repeat: "toggle" }` retains the existing behavior:
emit `clear` when `state.allSelected`, otherwise `select-all`. This is an input
policy; domain editors own the selected universe and its semantic transition.

[Editing grammar integration tests](tests/conformance/editing-grammar.test.ts)
connect both mappings to selection, cover rejected draft commits, and connect `createGestureSession` to
Document's `selection.move`. Structural preview and cancellation leave committed
value/history unchanged; commit dispatches the latest preview once. This proves
the tested composition, not every Host callback. IME composition has a separate
[DOM editing lifecycle](../../standards/dom-editing-lifecycle.md) contract.

`deleteAffordance(stroke)` consumes the Web default structural keymap: bare
Delete/Backspace delete; modified variants return no hand. Omitted modifiers
remain false for existing partial-input calls. Pass the full event to preserve
modifier facts. `selectAllAffordance` uses Web `chordFromStroke` for the same
normalization, then applies its own select-all repetition policy. Text word or
line deletion belongs to the text input adapter.
