# Marquee

TBD.

Marquee는 빈 평면에서 사각형을 끌어 여러 대상을 집는 손입니다. 고른
대상을 옮기는 [Drag](affordance-drag.md)와 다릅니다. `crosshair` / `cell`
커서가 이 손을 가리킬 수 있습니다.

```ts
import {
  marqueeRect,
  marqueeShouldCommit,
  pointerSelect,
} from "@interactive-os/json-document-affordance";

function onPointerUp(event: PointerEvent) {
  const rect = marqueeRect(origin, { x: event.clientX, y: event.clientY });
  if (!marqueeShouldCommit(rect)) return;
  const objectIds = hostHits(rect);
  const mode = pointerSelect(event);
  editor.dispatch({ type: "selection.set", objectIds, mode });
}
```

호스트는 히트 테스트와 기하를 계산합니다. 어떤 키가 범위에 들어오는지는
호스트가 보고, 손이 replace인지 extend인지는 Affordance가 닫고, 선택은
json-document로 갑니다.

닫는 손:
- 빈 곳에서 pointerdown → move → up
- Shift: 기존 고르기에 더함
- Mod: 토글
- 칸 위 `cell` 커서, 그림 위 `crosshair`

근거: [Apple HIG band selection](https://developer.apple.com/design/human-interface-guidelines/pointing-devices), [CSS UI cursor `cell` / `crosshair`](https://www.w3.org/TR/css-ui-4/#cursor)
