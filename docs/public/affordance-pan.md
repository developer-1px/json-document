# Pan

TBD.

Pan은 대상을 옮기지 않고 보이는 평면을 옮기는 손입니다. `grab` /
`grabbing` / `all-scroll` 커서가 이 손을 가리킵니다.

```ts
import {
  panAffordance,
  dragOffset,
} from "@interactive-os/json-document-affordance";

panAffordance({ spaceKey: true, buttons: 0 });
// { cursor: "grab" }

panAffordance({ spaceKey: true, buttons: 1 });
// { cursor: "grabbing" }

panAffordance({ buttons: 4 });
// { cursor: "all-scroll" }

dragOffset({ x: 80, y: 40 }, { x: 64, y: 52 });
// { dx: -16, dy: 12 }
```

호스트는 뷰포트 변환을 가집니다. 이동량은 [Drag](affordance-drag.md)와
같은 `dragOffset`입니다.

닫는 손:
- Space + 드래그
- 가운데 버튼 드래그
- `grab` → `grabbing`
- `all-scroll`

근거: [CSS UI cursor `grab` / `all-scroll`](https://www.w3.org/TR/css-ui-4/#cursor)
