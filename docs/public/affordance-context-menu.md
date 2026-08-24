# Context menu

Context menu는 대상이 있는 자리에서 보조 동작을 여는 손입니다.
`context-menu` 커서가 이 손을 가리킵니다.

```ts
import { applyAffordance, contextMenuAffordance } from "@interactive-os/json-document-affordance";

function onContextMenu(event: MouseEvent, itemId: string) {
  applyAffordance(contextMenuAffordance(event), {
    hand(hand) {
      if (hand.type !== "menu" || hand.action !== "open") return;
      event.preventDefault();
      setMenu({ itemId, x: event.clientX, y: event.clientY });
    },
  });
}

function onKeyDown(event: KeyboardEvent) {
  applyAffordance(contextMenuAffordance(event), {
    hand(hand) {
      if (hand.type !== "menu") return;
      if (hand.action === "open") setMenu({ itemId: focusKey, x: 0, y: 0 });
      if (hand.action === "cancel") setMenu(null);
    },
  });
}
```

호스트는 메뉴 항목을 그립니다. 여는 손은 호스트 화면 상태입니다.

닫는 손:
- 보조 버튼 / `contextmenu` / `auxclick`
- Shift+F10
- Menu 키
- Escape로 [Escape](affordance-cancel.md)
- 평면: 메뉴를 열어도 선택은 유지하는 편이 많음

근거: [Pointer Events contextmenu](https://www.w3.org/TR/pointerevents/), [CSS UI cursor `context-menu`](https://www.w3.org/TR/css-ui-4/#cursor), Figma Select layer 메뉴
