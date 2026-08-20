# Resize

TBD.

Resize는 가장자리·모서리·칸 경계·창 분할선을 움직이는 손입니다.
CSS predefined 리사이즈 커서가 이 손을 닫습니다.

```ts
import {
  resizeCursor,
  resizeOffset,
  resolveAffordanceKey,
} from "@interactive-os/json-document-affordance";

resizeCursor("se");
// "se-resize"

resizeCursor("column");
// "col-resize"

resizeOffset(
  { x: 80, y: 40 },
  { x: 112, y: 72 },
  "se",
  { shiftKey: false, altKey: false },
);
// { dx: 32, dy: 32 }

resizeOffset(
  { x: 80, y: 40 },
  { x: 112, y: 56 },
  "se",
  { shiftKey: true, altKey: false },
);
// { dx: 32, dy: 32 }

resolveAffordanceKey({
  key: "ArrowRight",
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
});
// { type: "move", direction: "right", operation: "replace" }
```

호스트는 핸들과 기하를 그립니다. 분할선 화살표는 APG Window Splitter와
같고, Shift는 비율, Alt는 가운데 기준입니다.

닫는 손:
- 모서리: `n-resize` … `nwse-resize`
- 칸/행: `col-resize` / `row-resize`
- 분할선: 화살표, Enter로 접기
- Shift: 비율 고정
- Alt: 가운데 기준

근거: [CSS UI cursor resize](https://www.w3.org/TR/css-ui-4/#cursor), [CSS UI resize](https://www.w3.org/TR/css-ui-4/#resize), [APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)
