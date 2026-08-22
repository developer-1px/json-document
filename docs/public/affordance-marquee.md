# Marquee

Marquee는 빈 평면에서 사각형을 끌어 여러 대상을 집는 손입니다. 고른
대상을 옮기는 [Drag](affordance-drag.md)와 다릅니다. `crosshair` / `cell`
커서가 이 손을 가리킬 수 있습니다.

```ts
import {
  applyAffordance,
  commitAffordance,
  marqueeAffordance,
} from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent) {
  const point = { x: event.offsetX, y: event.offsetY };
  applyAffordance(marqueeAffordance(origin, point, event), {
    cursor: (cursor) => {
      event.currentTarget.style.cursor = cursor;
    },
    hand: (hand) => {
      if (hand.type === "select" && hand.rect) setRect(hand.rect);
    },
  });
}

function onPointerUp(event: PointerEvent) {
  const committed = commitAffordance(marqueeAffordance(origin, { x: event.offsetX, y: event.offsetY }, event));
  if (!committed) return;
  applyAffordance(committed, {
    commit: (hand) => {
      if (hand.type !== "select" || !hand.rect) return;
      editor.dispatch({
        type: "selection.set",
        objectIds: hostHits(hand.rect),
        mode: hand.operation === "extend" ? "add" : hand.operation,
      });
    },
  });
}
```

호스트는 히트 테스트와 기하를 계산합니다. 어떤 키가 범위에 들어오는지는
호스트가 보고, 손이 replace인지 extend인지는 Affordance가 닫고, 선택은
json-document로 갑니다. 이동이 없는 빈 곳 누르기는 `clear`입니다.

닫는 손:
- 빈 곳에서 pointerdown → move → up
- Shift: 기존 고르기에 더함
- 평면 히트는 닿으면 포함 (`marqueeHitsAffordance`)
- Mod는 토글이 아님. 중첩 히트는 호스트가 줌
- 칸 위 `cell` 커서, 그림 위 `crosshair`

근거: [Apple HIG band selection](https://developer.apple.com/design/human-interface-guidelines/pointing-devices), [CSS UI cursor `cell` / `crosshair`](https://www.w3.org/TR/css-ui-4/#cursor)
