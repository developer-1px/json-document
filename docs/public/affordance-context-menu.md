# Context menu

TBD.

Context menu는 대상이 있는 자리에서 보조 동작을 여는 손입니다.
`context-menu` 커서가 이 손을 가리킵니다.

```ts
import { contextMenuAffordance } from "@interactive-os/json-document-affordance";

contextMenuAffordance({ button: 2 });
// "open"

contextMenuAffordance({ key: "ContextMenu" });
// "open"

contextMenuAffordance({ key: "F10", shiftKey: true });
// "open"

contextMenuAffordance({ key: "Escape" });
// "cancel"
```

호스트는 메뉴 항목을 그립니다. 어포던스는 여는 손을 닫습니다.

닫는 손:
- 보조 버튼 / `contextmenu` / `auxclick`
- Shift+F10
- Menu 키
- Escape로 [Escape](affordance-cancel.md)

근거: [Pointer Events contextmenu](https://www.w3.org/TR/pointerevents/), [CSS UI cursor `context-menu`](https://www.w3.org/TR/css-ui-4/#cursor)
