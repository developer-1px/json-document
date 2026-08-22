# Drag

Drag는 고른 대상을 포인터로 옮기는 손입니다. 누른 점에서 현재 점까지
이동량이 생기고, 이동량이 있을 때만 옮기기를 확정합니다. 기하와 히트
테스트는 호스트가 계산하고, editor에는 대상 ID와 이동량만 넘깁니다.

```ts
import {
  applyAffordance,
  commitAffordance,
  dragAffordance,
} from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent) {
  applyAffordance(
    dragAffordance(origin, { x: event.clientX, y: event.clientY }),
    {
      cursor: (cursor) => {
        event.currentTarget.style.cursor = cursor;
      },
      hand: (hand) => {
        if (hand.type === "translate") setOffset({ dx: hand.dx, dy: hand.dy });
      },
    },
  );
}

function onPointerUp(event: PointerEvent) {
  const committed = commitAffordance(
    dragAffordance(origin, { x: event.clientX, y: event.clientY }),
  );
  if (!committed) return;
  applyAffordance(committed, {
    commit: (hand) => {
      if (hand.type !== "translate") return;
      editor.dispatch({
        type: "object.translate",
        objectIds,
        dx: hand.dx,
        dy: hand.dy,
      });
    },
  });
}
```

모양과 그림은 제품이 정합니다. 고른 것을 잡고 옮기는 문법은 닫혀 있습니다.
Shift는 축을 구속하고, Alt는 [Duplicate](affordance-copy-drag.md)입니다.

## TBD

- 키보드만으로 옮기기 (APG는 드래그의 키보드 대안을 요구함)
- pointer capture 수명
