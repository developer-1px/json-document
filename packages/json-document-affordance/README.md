# @interactive-os/json-document-affordance

Official keyboard and mouse editing affordances for json-document hosts.
The package closes conventional select, fold, drag, and undo/redo grammar.
Hosts keep markup and genre Intent. It does not render widgets.

```sh
npm i @interactive-os/json-document-affordance
```

```ts
import {
  pointerSelect,
  resolveAffordanceKey,
  treeAffordance,
  dragOffset,
  dragShouldCommit,
  historyAffordance,
} from "@interactive-os/json-document-affordance";

pointerSelect({ shiftKey: true, metaKey: false, ctrlKey: false });
// "extend"

resolveAffordanceKey({
  key: "ArrowDown",
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
});
// { type: "move", direction: "down", operation: "replace" }
```

Keyboard Adapter still translates chords. This package decides the
affordance policy those commands mean. React Connector still answers
selection queries. Hosts still draw the product screen.

Usage: [Affordance](https://developer-1px.github.io/json-document/docs/affordance)
