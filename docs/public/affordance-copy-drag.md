# Duplicate

Duplicate는 수정 키를 누른 채 드래그하면 원본을 복제하는 손입니다.
`copy` / `alias` 커서가 이 손을 가리킵니다.

```ts
import {
  applyAffordance,
  commitAffordance,
  dragAffordance,
  dragOperation,
  dropAffordance,
} from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent) {
  applyAffordance(dragOperation(event), {
    cursor: (cursor) => {
      event.currentTarget.style.cursor = cursor;
    },
  });
}

function onPointerUp(event: PointerEvent) {
  const committed = commitAffordance(
    dragAffordance(origin, { x: event.clientX, y: event.clientY }),
  );
  if (!committed) return;
  applyAffordance(committed, {
    commit: (translate) => {
      if (translate.type !== "translate") return;
      let copied = false;
      applyAffordance(dragOperation(event), {
        hand: (operation) => {
          if (operation.type !== "copy") return;
          copied = true;
          hostDuplicate(objectIds, translate);
        },
      });
      if (copied) return;
      const drop = commitAffordance(dropAffordance({ canDrop: true }));
      if (!drop) return;
      applyAffordance(drop, {
        commit: (hand) => {
          if (hand.type !== "move-drop") return;
          editor.dispatch({
            type: "object.translate",
            objectIds,
            dx: translate.dx,
            dy: translate.dy,
          });
        },
      });
    },
  });
}
```

복제 생성은 장르 Intent(호스트 또는 editor)이고, 옮기기는 json-document로
갑니다. 값의 클립보드 복사/붙이기는 Hands입니다.

닫는 손:
- Alt/Option + 드래그 → copy
- 커서 `copy` 또는 `alias`
- 원본은 자리에 남고, 복제본이 포인터를 따라감
- 드롭 후 복제본 집합이 선택된 채로 남음

근거: [Apple HIG pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices), [CSS UI cursor `copy` / `alias`](https://www.w3.org/TR/css-ui-4/#cursor), Figma Option-drag, Illustrator Option, tldraw Alt
