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

`createBoardDragSession` owns the input-agnostic active item, drop-target
preview, commit, and cancel lifecycle for Board Hands. Web pointer and HTML
Drag and Drop sessions feed it; Hosts still resolve targets and dispatch the
domain move Intent.

`createCanvasGestureSession` owns one active semantic Canvas gesture and its
preview, commit, cancel, and supersede lifecycle. Web pointer capture and Host
coordinate, hit-test, renderer, lock, and viewport policies stay outside it.

Usage: [Affordance](https://developer-1px.github.io/json-document/docs/affordance)
