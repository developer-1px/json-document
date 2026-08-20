# Drop

TBD.

Drop은 [Drag](affordance-drag.md)의 끝입니다. 어디에 둘 수 있는지를
커서가 말하고, 못 두는 자리는 `no-drop`입니다.

```ts
import { dropAffordance } from "@interactive-os/json-document-affordance";

dropAffordance({ canDrop: true, operation: "move" });
// { accept: true, cursor: "move" }

dropAffordance({ canDrop: true, operation: "copy" });
// { accept: true, cursor: "copy" }

dropAffordance({ canDrop: false });
// { accept: false, cursor: "no-drop" }
```

호스트는 드롭 자리와 가능한지를 그립니다. 어포던스는 허용·거절 손을 닫습니다.

닫는 손:
- drop 대상 위: `move` / `copy` / `alias`
- 불가능한 자리: `no-drop`
- Escape: [Escape](affordance-cancel.md)

근거: [HTML Drag and Drop](https://html.spec.whatwg.org/multipage/dnd.html), [CSS UI cursor `no-drop`](https://www.w3.org/TR/css-ui-4/#cursor)
