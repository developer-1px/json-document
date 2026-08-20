# Snap

TBD.

Snap은 [Drag](affordance-drag.md)·[Resize](affordance-resize.md)·
[Nudge](affordance-nudge.md) 중에 그리드나 가이드에 붙는 손입니다.
수정 키를 누르면 붙지 않습니다.

```ts
import {
  dragOffset,
  dragShouldCommit,
  snapAffordance,
} from "@interactive-os/json-document-affordance";

function onPointerUp(event: PointerEvent, object: { id: string; x: number; y: number }) {
  const offset = dragOffset(origin, { x: event.clientX, y: event.clientY });
  if (!dragShouldCommit(offset)) return;
  const snapped = snapAffordance(
    { x: object.x + offset.dx, y: object.y + offset.dy },
    { grid: 8, disable: event.metaKey || event.ctrlKey },
  );
  editor.dispatch({
    type: "object.translate",
    objectIds: [object.id],
    dx: snapped.x - object.x,
    dy: snapped.y - object.y,
  });
}
```

가이드 기하는 호스트가 가지고, 붙은 좌표만 json-document로 갑니다.

닫는 손:
- 이동·리사이즈 중 스냅
- 수정 키로 스냅 해제
- 회전 15° 스냅은 장르 Intent (Object)

근거: 캔버스·슬라이드 편집기 관례. CSS predefined 커서는 없음.
