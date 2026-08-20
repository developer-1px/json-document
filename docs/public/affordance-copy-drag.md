# Duplicate

TBD.

Duplicate는 수정 키를 누른 채 드래그하면 원본을 복제하는 손입니다.
`copy` / `alias` 커서가 이 손을 가리킵니다.

```ts
import {
  dragOffset,
  dragOperation,
  dragShouldCommit,
  dropAffordance,
} from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent) {
  const operation = dragOperation(event);
  event.currentTarget.style.cursor = dropAffordance({
    canDrop: true,
    operation,
  }).cursor;
}

function onPointerUp(event: PointerEvent) {
  const offset = dragOffset(origin, { x: event.clientX, y: event.clientY });
  if (!dragShouldCommit(offset)) return;
  if (dragOperation(event) === "copy") {
    hostDuplicate(objectIds, offset);
    return;
  }
  editor.dispatch({
    type: "object.translate",
    objectIds,
    dx: offset.dx,
    dy: offset.dy,
  });
}
```

복제 생성은 장르 Intent(호스트 또는 editor)이고, 옮기기는 json-document로
갑니다. 값의 클립보드 복사/붙이기는 Hands입니다.

닫는 손:
- Alt/Option + 드래그 → copy
- 커서 `copy` 또는 `alias`

근거: [Apple HIG pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices), [CSS UI cursor `copy` / `alias`](https://www.w3.org/TR/css-ui-4/#cursor)
