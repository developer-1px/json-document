# Drop

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

## Board drag session

Kanban의 HTML Drag and Drop과 Board Widget의 Pointer Events는 입력 lifecycle이
다르지만 active card와 drop target의 의미는 같습니다. 그 공통 상태는
Affordance의 `createBoardDragSession`이 소유합니다.

```ts
const boardDrag = createBoardDragSession<CardId, {
  columnId: string;
  beforeCardId: string | null;
}>({
  onBegin: (cardId) => selectCard(cardId),
  onCommit: ({ item: cardId, target }) => {
    editor.dispatch({ type: "card.move", cardId, ...target });
  },
});

boardDrag.begin(cardId);
boardDrag.preview({ columnId, beforeCardId });
boardDrag.commit();
```

### `createBoardDragSession(options?)`

`begin(item)`은 active item을 만들고, `preview(target | null)`은 현재 drop
target을 교체합니다. `commit()`은 target이 있을 때만 `{ item, target }`을
반환하고 `onCommit`을 호출합니다. `cancel(reason)`과 새 `begin`의
`superseded`는 commit 없이 state를 idle로 되돌립니다.

`BoardDragSnapshot`은 `idle` 또는 `{ status: "dragging", item, target }`입니다.
session은 column/card 구조나 `card.move`를 알지 않습니다. target hit-test와
column 끝·card 앞 배치 규칙은 Host가 target 값으로 정하고, Web의
[`createWebDragDropSession`과 `createWebPointerSession`](adapter-interaction.md)은
각 platform event lifecycle만 연결합니다.

닫는 손:

- drop 대상 위: `move` / `copy` / `alias`
- 불가능한 자리: `no-drop`
- Escape: [Escape](affordance-cancel.md)
- 드롭 후 옮긴 집합이 선택된 채로 남음

근거: [HTML Drag and Drop](https://html.spec.whatwg.org/multipage/dnd.html), [CSS UI cursor `no-drop`](https://www.w3.org/TR/css-ui-4/#cursor), [Apple HIG Drag and drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop)
