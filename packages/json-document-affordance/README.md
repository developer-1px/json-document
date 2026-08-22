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
affordance those commands mean. `pressAffordance` owns transient custom-control
Press start/end/cancel and disabled gating; persistent toggle state remains in
the product and ARIA projection remains in the Web Adapter. React Connector still answers selection
queries through `useEditing` ports.

Usage: [Affordance](https://developer-1px.github.io/json-document/docs/affordance)
