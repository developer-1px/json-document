# Context menu

TBD.

Context menu는 대상이 있는 자리에서 보조 동작을 여는 손입니다.
`context-menu` 커서가 이 손을 가리킵니다.

```ts
import { contextMenuAffordance } from "@interactive-os/json-document-affordance";

function onContextMenu(event: MouseEvent, itemId: string) {
  if (contextMenuAffordance(event) !== "open") return;
  event.preventDefault();
  setMenu({ itemId, x: event.clientX, y: event.clientY });
}

function onKeyDown(event: KeyboardEvent) {
  if (contextMenuAffordance(event) === "open") {
    setMenu({ itemId: focusKey, x: 0, y: 0 });
  }
  if (contextMenuAffordance(event) === "cancel") setMenu(null);
}
```

호스트는 메뉴 항목을 그립니다. 여는 손은 호스트 화면 상태입니다.

닫는 손:
- 보조 버튼 / `contextmenu` / `auxclick`
- Shift+F10
- Menu 키
- Escape로 [Escape](affordance-cancel.md)

근거: [Pointer Events contextmenu](https://www.w3.org/TR/pointerevents/), [CSS UI cursor `context-menu`](https://www.w3.org/TR/css-ui-4/#cursor)
