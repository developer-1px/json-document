# Resize

Resize는 가장자리·모서리·칸 경계·창 분할선을 움직이는 손입니다.
CSS predefined 리사이즈 커서가 이 손을 닫습니다.

`InteractionHandleDescriptor`가 Drag·Resize·Control 손잡이의 축, cursor와
`start → preview → commit / cancel` lifecycle을 하나의 정본 계약으로 묶습니다.
DOM pointer capture는 React/Web binding이 맡고, 제품은 delta를 자기 Intent로
변환합니다.

```ts
import { createInteractionHandleSession } from "@interactive-os/json-document-affordance";

const handle = createInteractionHandleSession();
handle.start({ kind: "resize", edge: "se" }, origin);
handle.preview(point); // axis-aware delta + nw/se cursor meaning
handle.commit(point);
```

```tsx
import {
  ControlHandle,
  DragHandle,
  ResizeHandle,
} from "@interactive-os/json-document-ui-primitives-react";

<DragHandle label="Move card" onHandle={applyDrag} />;
<ResizeHandle label="Resize panel" orientation="horizontal" onResize={applyResize} />;
<ControlHandle label="Move control point" onHandle={applyControlPoint} />;
```

```ts
import { applyAffordance, commitAffordance, resizeAffordance } from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent, edge: "se") {
  applyAffordance(resizeAffordance(origin, { x: event.clientX, y: event.clientY }, edge, event), {
    cursor: (cursor) => {
      event.currentTarget.style.cursor = cursor;
    },
    hand: (hand) => {
      if (hand.type === "resize") setPreview(hand);
    },
  });
}

function onPointerUp(event: PointerEvent, objectId: string, edge: "se") {
  const committed = commitAffordance(
    resizeAffordance(origin, { x: event.clientX, y: event.clientY }, edge, event),
  );
  if (!committed) return;
  applyAffordance(committed, {
    commit: (hand) => {
      if (hand.type !== "resize") return;
      editor.dispatch({
        type: "object.resize",
        objectIds: [objectId],
        dx: hand.dx,
        dy: hand.dy,
        dw: hand.dw,
        dh: hand.dh,
      });
    },
  });
}
```

커서는 호스트 화면 상태이고, 확정된 크기만 json-document로 갑니다.
분할선 화살표는 APG Window Splitter와 같고, Shift는 비율, Alt는 가운데
기준입니다.

닫는 손:
- 선택 바운딩 박스 핸들
- 모서리: `n-resize` … `nwse-resize`
- 칸/행: `col-resize` / `row-resize`
- 분할선: 화살표, Enter로 접기
- Shift: 비율 고정
- Alt: 가운데 기준
- 스냅은 [Snap](affordance-snap.md)

근거: [CSS UI cursor resize](https://www.w3.org/TR/css-ui-4/#cursor), [CSS UI resize](https://www.w3.org/TR/css-ui-4/#resize), [APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/), Figma/Keynote/Illustrator 바운딩 박스

```live-demo
/affordances/handles
```
