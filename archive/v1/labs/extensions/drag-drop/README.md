# @interactive-os/json-document-drag-drop

Lab drag and drop extension for `@interactive-os/json-document` documents.

Use it to test whether drag/drop behavior can stay outside core while still
using the public read, move, and insert capability surface.

```ts
import { createDragDrop } from "@interactive-os/json-document-drag-drop";

const drop = createDragDrop(doc);

drop.perform({
  source: { kind: "move", pointer: "/cards/0" },
  target: { after: "/cards/1" },
});
drop.perform({
  source: { kind: "copy", pointer: "/cards/0" },
  target: "/archive/-",
});
drop.perform({
  source: { kind: "payload", value: card },
  target: "/cards/-",
});
```

## Scope

- Represent internal pointer moves and external payload drops.
- Represent copy-drag as reading a pointer and inserting that payload.
- Map internal drops to `canMove` / `move`, including core relative targets.
- Map copy and payload drops to `canInsert` / `insert`.
- Preserve disabled reasons from core capability checks.
- Keep target conversion headless and based on public Pointer / relative target contracts.

## Non-goals

- No DOM drag events, drag image, pointer capture, hover UI, keyboard policy, or
  focus policy.
- No rendered drop zones or product-specific target naming.
- No stable id lookup; host code owns id-to-pointer policy when needed.
- No collection-specific reorder policy beyond public Pointer and relative target
  contracts.
- No new `duplicate` meaning; core `duplicate` stays same-parent sibling
  duplication, while copy-drag is copy plus paste to a drop target.
- No plugin registration; this package composes functions and does not call
  `doc.use(...)`.
- No `@interactive-os/json-document` internal imports.

## Friction report

The public facade is enough for headless drop intent. Internal drops are moves,
copy-drops read an existing pointer and insert that payload, and external drops
are payload inserts. The same `can*` result object can drive drop
affordances and disabled reasons.

DOM event decoding, hit testing, scrolling, visual insertion indicators, and
keyboard alternatives remain host concerns.
