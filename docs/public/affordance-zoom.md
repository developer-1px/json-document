# Zoom

TBD.

Zoom은 보이는 배율을 바꾸는 손입니다. `zoom-in` / `zoom-out` 커서가
이 손을 가리킵니다. CSS `resize`와 무관합니다.

```ts
import {
  zoomAffordance,
  zoomCursor,
  wheelAffordance,
} from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent) {
  event.currentTarget.style.cursor = zoomCursor("in");
}

function onWheel(event: WheelEvent) {
  const hand = wheelAffordance(event);
  if (hand.type === "zoom") setScale(hostZoom(scale, hand.delta));
}

function onKeyDown(event: KeyboardEvent) {
  const hand = zoomAffordance(event);
  if (hand?.type === "in") setScale(scale * 1.1);
  if (hand?.type === "out") setScale(scale / 1.1);
}
```

이 손은 호스트 뷰포트입니다. 문서 값은 바꾸지 않습니다.

닫는 손:
- Mod + wheel
- + / −
- `zoom-in` / `zoom-out` 커서

근거: [CSS UI cursor `zoom-in` / `zoom-out`](https://www.w3.org/TR/css-ui-4/#cursor), [CSS UI resize note](https://www.w3.org/TR/css-ui-4/#resize)
