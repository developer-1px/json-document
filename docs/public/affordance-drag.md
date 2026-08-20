# 드래그

드래그는 고른 대상을 포인터로 옮기는 손입니다. 누른 점에서 현재 점까지
이동량이 생기고, 이동량이 있을 때만 옮기기를 확정합니다. 기하와 히트
테스트는 호스트가 계산하고, editor에는 대상 ID와 이동량만 넘깁니다.

```ts
import {
  dragOffset,
  dragShouldCommit,
} from "@interactive-os/json-document-affordance";

const offset = dragOffset({ x: 24, y: 40 }, { x: 80, y: 36 });
if (dragShouldCommit(offset)) {
  editor.dispatch({
    type: "object.translate",
    objectIds: selectedIds,
    dx: offset.dx,
    dy: offset.dy,
  });
}
```

모양과 그림은 제품이 정합니다. 고른 것을 잡고 옮기는 문법은 닫혀 있습니다.

## TBD

- [놓기](affordance-drop.md) 대상과 `no-drop`
- [복사해서 옮기기](affordance-copy-drag.md)
- 키보드만으로 옮기기 (APG는 드래그의 키보드 대안을 요구함)
- pointer capture 수명
