# Zoom

Zoom은 보이는 배율을 바꾸는 손입니다. `zoom-in` / `zoom-out` 커서가
이 손을 가리킵니다. CSS `resize`와 무관합니다.

```ts
import {
  applyAffordance,
  zoomAffordance,
  wheelAffordance,
} from "@interactive-os/json-document-affordance";

function onWheel(event: WheelEvent) {
  applyAffordance(wheelAffordance(event), {
    cursor: (cursor) => {
      event.currentTarget.style.cursor = cursor;
    },
    hand: (hand) => {
      if (hand.type === "zoom") setScale(scale * hand.factor);
    },
  });
}

function onKeyDown(event: KeyboardEvent) {
  applyAffordance(zoomAffordance(event), {
    hand: (hand) => {
      if (hand.type === "zoom") setScale(scale * hand.factor);
    },
  });
}
```

이 손은 호스트 뷰포트입니다. 문서 값은 바꾸지 않습니다.

닫는 손:
- Mod + wheel. 커서 아래를 중심으로 배율
- + / −
- `zoom-in` / `zoom-out` 커서
- 객체 좌표는 바꾸지 않음. 호스트 뷰포트만

근거: [CSS UI cursor `zoom-in` / `zoom-out`](https://www.w3.org/TR/css-ui-4/#cursor), [CSS UI resize note](https://www.w3.org/TR/css-ui-4/#resize), Illustrator Ctrl/⌘+Space 줌
