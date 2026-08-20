# Resize

TBD.

Resize는 가장자리·모서리·칸 경계·창 분할선을 움직이는 손입니다.
CSS predefined 리사이즈 커서가 이 손을 닫습니다.

```ts
import { resizeCursor, resizeOffset } from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent, edge: "se") {
  event.currentTarget.style.cursor = resizeCursor(edge);
  const offset = resizeOffset(
    origin,
    { x: event.clientX, y: event.clientY },
    edge,
    event,
  );
  setPreview(offset);
}

function onPointerUp(event: PointerEvent, objectId: string, edge: "se") {
  const offset = resizeOffset(
    origin,
    { x: event.clientX, y: event.clientY },
    edge,
    event,
  );
  editor.dispatch({
    type: "object.resize",
    objectId,
    dx: offset.dx,
    dy: offset.dy,
  });
}
```

커서는 호스트 화면 상태이고, 확정된 크기만 json-document로 갑니다.
분할선 화살표는 APG Window Splitter와 같고, Shift는 비율, Alt는 가운데
기준입니다.

닫는 손:
- 모서리: `n-resize` … `nwse-resize`
- 칸/행: `col-resize` / `row-resize`
- 분할선: 화살표, Enter로 접기
- Shift: 비율 고정
- Alt: 가운데 기준

근거: [CSS UI cursor resize](https://www.w3.org/TR/css-ui-4/#cursor), [CSS UI resize](https://www.w3.org/TR/css-ui-4/#resize), [APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)
