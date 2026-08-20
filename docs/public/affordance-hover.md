# Hover

TBD.

Hover는 누르지 않은 포인터가 대상 위에 있을 때 가능한 손을 드러냅니다.
커서가 바뀌고, 잠시 뒤 툴팁이 열릴 수 있습니다. `help` 커서는 도움말이
있음을 가리킵니다.

```ts
import { hoverAffordance, hoverCursor } from "@interactive-os/json-document-affordance";

hoverCursor("help");
// "help"

hoverAffordance({ elapsedMs: 120 });
// "hint"

hoverAffordance({ elapsedMs: 400 });
// "tooltip"

hoverAffordance({ elapsedMs: 0, inside: false });
// null
```

호스트는 툴팁 그림을 그립니다. 어포던스는 지연과 커서 손을 닫습니다.

닫는 손:
- pointerenter / pointerleave
- 짧은 체류: 커서 hint
- 기본 지연 후 tooltip
- `help` 커서

근거: [APG Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/), [Apple HIG pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices), [CSS UI cursor](https://www.w3.org/TR/css-ui-4/#cursor)
