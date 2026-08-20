# Drag

Drag는 고른 대상을 포인터로 옮기는 손입니다. 누른 점에서 현재 점까지
이동량이 생기고, 이동량이 있을 때만 옮기기를 확정합니다. 기하와 히트
테스트는 호스트가 계산하고, editor에는 대상 ID와 이동량만 넘깁니다.

```ts
import {
  dragOffset,
  dragShouldCommit,
  pointerSelect,
} from "@interactive-os/json-document-affordance";

function onPointerDown(event: PointerEvent, objectId: string) {
  const mode = pointerSelect(event);
  editor.dispatch({ type: "selection.set", objectIds: [objectId], mode });
  event.currentTarget.setPointerCapture(event.pointerId);
  drag = { origin: { x: event.clientX, y: event.clientY } };
}

function onPointerUp(event: PointerEvent) {
  const offset = dragOffset(drag.origin, { x: event.clientX, y: event.clientY });
  if (dragShouldCommit(offset)) {
    editor.dispatch({
      type: "object.translate",
      objectIds: editor.selectedObjects.map((object) => object.id),
      dx: offset.dx,
      dy: offset.dy,
    });
  }
  drag = null;
}
```

모양과 그림은 제품이 정합니다. 고른 것을 잡고 옮기는 문법은 닫혀 있습니다.

## TBD

```ts
function onKeyDown(event: KeyboardEvent) {
  const hand = dragKeyboardAffordance({ key: event.key, grab: drag !== null });
  if (hand === "cancel") drag = null;
  if (hand?.type === "nudge") {
    editor.dispatch({
      type: "object.translate",
      objectIds,
      dx: hand.dx ?? 0,
      dy: hand.dy ?? 0,
    });
  }
}
```

- [Drop](affordance-drop.md) 대상과 `no-drop`
- [Duplicate](affordance-copy-drag.md)
- 키보드만으로 옮기기 (APG는 드래그의 키보드 대안을 요구함)
- pointer capture 수명
