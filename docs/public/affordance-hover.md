# Hover

TBD.

Hover는 누르지 않은 포인터가 대상 위에 있을 때 가능한 손을 드러냅니다.
커서가 바뀌고, 잠시 뒤 툴팁이 열릴 수 있습니다. `help` 커서가 도움말이
있음을 가리킵니다.

```ts
import { hoverAffordance, hoverCursor } from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent, itemId: string) {
  event.currentTarget.style.cursor = hoverCursor("help");
  const hand = hoverAffordance({ elapsedMs, inside: true });
  if (hand === "tooltip") setTooltip(itemId);
  if (hand === null) setTooltip(null);
}
```

호스트는 툴팁 그림을 그립니다. 이 손은 json-document가 아니라 호스트
화면 상태입니다.

닫는 손:
- pointerenter / pointerleave
- 짧은 체류: 커서 hint
- 기본 지연 후 tooltip
- `help` 커서

근거: [APG Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/), [Apple HIG pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices), [CSS UI cursor](https://www.w3.org/TR/css-ui-4/#cursor)
