# Rename

Rename은 고른 대상의 레이블을 고치는 손입니다. F2와 느린 double-click이
같은 손을 엽니다. Escape는 [Escape](affordance-cancel.md)입니다.

```ts
import { applyAffordance, createRenameSession, renameAffordance } from "@interactive-os/json-document-affordance";

const rename = createRenameSession<string>({
  tryCommit: (itemId, label) => editor.dispatch({ type: "item.rename", itemId, label }).ok,
  onSnapshot: renderDraft,
  onFinish: restoreFocus,
});

function onKeyDown(event: KeyboardEvent) {
  applyAffordance(renameAffordance(event), {
    hand: (hand) => {
      if (hand.type === "rename" && hand.action === "begin") rename.begin(focusKey, label);
    },
  });
}

function onClick(event: MouseEvent, itemId: string, label: string) {
  rename.handlePointer(itemId, label, event.detail, event.timeStamp);
}

function onDraftKeyDown(event: KeyboardEvent) {
  if (rename.handleKey(event.key)) event.preventDefault();
}
```

호스트는 session snapshot으로 레이블 필드를 그리고 입력 변경을 `rename.update`에
연결합니다. session이 draft의 시작·확정·취소를 소유하고, 확정 시 domain editor가
문서를 변경합니다. 글 편집 자체는 Hands와 [Caret](affordance-caret.md)입니다.

닫는 손:
- F2
- 느린 double-click (빠른 것은 [Double-click](affordance-double-click.md))
- Enter로 확정, Escape로 취소

근거: Finder/Explorer/VS Code, [UIEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail)

## Session API

`createRenameSession`은 active key, draft, slow double-click 간격과 commit/cancel을
소유합니다. 기존 `onCommit(key, draft): void` 또는 동기
`tryCommit(key, draft): boolean` 중 하나를 받습니다. 둘을 동시에 지정하거나
비동기 `tryCommit`을 전달할 수 없습니다.

`tryCommit`이 `false`이면 active key와 draft를 유지하고 `onFinish`를 호출하지
않습니다. 사용자가 수정한 뒤 다시 확정할 수 있습니다. `true` 또는 기존
`onCommit` 완료 시 snapshot을 비우고 `onFinish`를 한 번 호출합니다.
Escape는 commit 없이 종료합니다. 검증과 문서 변경은 domain이 소유합니다.
`onCancel(key, draft)`는 저장되지 않은 값을 복구하거나, Calendar처럼 생성과
동시에 시작된 rename을 취소할 때 새 항목을 제거하는 제품 정책을 연결합니다.

Calendar는 `useCalendarRenameInput(hand)`으로 focus/select, input change,
Enter·Escape, blur를 같은 session에 연결합니다. Host는 반환된 `ref`, `value`,
event handler만 제목 input에 전달합니다.

Usage와 Source: [Order Demo](/demo/order)의 F2 → 입력 → Enter 또는 Escape.
