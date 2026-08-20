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

zoomCursor("in");
// "zoom-in"

zoomAffordance({ key: "=", metaKey: true, ctrlKey: false });
// { type: "in" }

zoomAffordance({ key: "-", metaKey: true, ctrlKey: false });
// { type: "out" }

wheelAffordance({ deltaY: -80, ctrlKey: true, metaKey: false });
// { type: "zoom", delta: 80 }
```

호스트는 배율 변환을 가집니다.

닫는 손:
- Mod + wheel
- + / −
- `zoom-in` / `zoom-out` 커서

근거: [CSS UI cursor `zoom-in` / `zoom-out`](https://www.w3.org/TR/css-ui-4/#cursor), [CSS UI resize note](https://www.w3.org/TR/css-ui-4/#resize)
