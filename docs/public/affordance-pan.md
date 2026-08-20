# Pan

Pan은 대상을 옮기지 않고 보이는 평면을 옮기는 손입니다. `grab` /
`grabbing` / `all-scroll` 커서가 이 손을 가리킵니다.

```ts
import { applyAffordance, panAffordance } from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent) {
  applyAffordance(
    panAffordance({
      spaceKey,
      buttons: event.buttons,
      origin,
      point: { x: event.clientX, y: event.clientY },
    }),
    {
      cursor: (cursor) => {
        event.currentTarget.style.cursor = cursor;
      },
      hand: (hand) => {
        if (hand.type !== "translate") return;
        setViewport({ x: hand.dx, y: hand.dy });
      },
    },
  );
}
```

이 손은 json-document가 아니라 호스트 뷰포트입니다. 이동량은
[Drag](affordance-drag.md)와 같은 `translate` 손입니다.

닫는 손:
- Space + 드래그
- 가운데 버튼 드래그
- `grab` → `grabbing`
- `all-scroll`

근거: [CSS UI cursor `grab` / `all-scroll`](https://www.w3.org/TR/css-ui-4/#cursor)
