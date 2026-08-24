# Rename

Rename은 고른 대상의 레이블을 고치는 손입니다. F2와 느린 double-click이
같은 손을 엽니다. Escape는 [Escape](affordance-cancel.md)입니다.

```ts
import { applyAffordance, renameAffordance } from "@interactive-os/json-document-affordance";

function onKeyDown(event: KeyboardEvent) {
  applyAffordance(renameAffordance(event), {
    hand: (hand) => {
      if (hand.type !== "rename") return;
      if (hand.action === "begin") setRenaming(focusKey);
      if (hand.action === "cancel") setRenaming(null);
      if (hand.action === "commit" && renaming) {
        editor.dispatch({ type: "item.rename", itemId: renaming, label: draft });
        setRenaming(null);
      }
    },
  });
}

function onClick(event: MouseEvent, itemId: string) {
  applyAffordance(renameAffordance({ type: "pointer", detail: event.detail, intervalMs }), {
    hand: (hand) => {
      if (hand.type === "rename" && hand.action === "begin") setRenaming(itemId);
    },
  });
}
```

호스트는 레이블 필드를 그립니다. begin/cancel은 호스트 화면 상태이고,
commit만 json-document로 갑니다. 글 편집 자체는 Hands와 [Caret](affordance-caret.md)입니다.

닫는 손:
- F2
- 느린 double-click (빠른 것은 [Double-click](affordance-double-click.md))
- Enter로 확정, Escape로 취소

근거: Finder/Explorer/VS Code, [UIEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail)

## Session API

`createRenameSession({ onCommit, onFinish, onSnapshot })`은 active key, draft,
slow double-click 간격과 commit/cancel을 소유합니다. Host는 snapshot으로 input을
그리고 `onCommit(key, draft)`에서 domain rename Intent를 보냅니다.
