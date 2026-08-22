# Caret

TBD.

Caret은 글 안의 삽입점입니다. 항목 [Select](affordance-select.md)와 다릅니다.
`text` / `vertical-text` 커서가 이 손을 가리킵니다. 클릭은 삽입점을 두고,
드래그는 글 범위를 고릅니다.

```ts
import { caretAffordance, caretCursor } from "@interactive-os/json-document-affordance";

function onPointerMove(event: PointerEvent) {
  event.currentTarget.style.cursor = caretCursor("horizontal");
}

function onPointerDown(event: PointerEvent, blockId: string) {
  const hand = caretAffordance({ type: "pointer", detail: event.detail });
  if (hand.type === "place") {
    editor.dispatch({
      type: "selection.set",
      blockId,
      offset: hostHitOffset(event),
    });
  }
}

function onKeyDown(event: KeyboardEvent) {
  const hand = caretAffordance(event);
  if (hand?.type === "move") {
    editor.dispatch({
      type: "selection.set",
      blockId: focus.blockId,
      offset: hostMoveOffset(focus.offset, hand),
      mode: hand.operation,
    });
  }
}
```

호스트는 I-beam과 글 기하를 그립니다. 값 삽입은 Hands입니다.

닫는 손:
- 클릭: 삽입점
- 드래그: 글 범위
- 화살표 / Home / End: 글자·줄 끝
- IME composition은 삽입 경로

근거: [CSS UI cursor `text`](https://www.w3.org/TR/css-ui-4/#cursor), [UI Events select](https://www.w3.org/TR/uievents/)
