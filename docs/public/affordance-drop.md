# Drop

TBD.

Drop은 [Drag](affordance-drag.md)의 끝입니다. 어디에 둘 수 있는지를
커서가 말하고, 못 두는 자리는 `no-drop`입니다.

```ts
import {
  applyAffordance,
  commitAffordance,
  dropAffordance,
} from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent) {
  applyAffordance(dropAffordance({ canDrop: hostCanDrop(event) }), {
    cursor: (cursor) => {
      event.currentTarget.style.cursor = cursor;
    },
  });
}

function onPointerUp(event: PointerEvent, cardId: string, columnId: string) {
  const drop = dropAffordance({ canDrop: hostCanDrop(event) });
  applyAffordance(drop, {
    cursor: (cursor) => {
      event.currentTarget.style.cursor = cursor;
    },
  });
  const committed = commitAffordance(drop);
  if (!committed) return;
  applyAffordance(committed, {
    commit: (hand) => {
      if (hand.type !== "move-drop") return;
      editor.dispatch({ type: "card.move", cardId, columnId });
    },
  });
}
```

커서는 호스트 화면 상태이고, 허용된 놓기만 json-document로 갑니다.

닫는 손:
- drop 대상 위: `move` / `copy` / `alias`
- 불가능한 자리: `no-drop`
- Escape: [Escape](affordance-cancel.md)

근거: [HTML Drag and Drop](https://html.spec.whatwg.org/multipage/dnd.html), [CSS UI cursor `no-drop`](https://www.w3.org/TR/css-ui-4/#cursor)
