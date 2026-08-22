# Delete

Delete는 고른 대상을 없애는 손입니다. `resolveAffordanceKey`는 이미
Delete와 Backspace를 `delete` command로 닫습니다. 칸 비우기와 항목 제거는
장르 Intent입니다.

```ts
import {
  applyAffordance,
  deleteAffordance,
} from "@interactive-os/json-document-affordance";

function onKeyDown(event: KeyboardEvent) {
  applyAffordance(deleteAffordance(event), {
    hand: (hand) => {
      if (hand.type === "delete") editor.dispatch({ type: "selection.remove" });
    },
  });
}
```

호스트는 장르 Intent만 가집니다. 값 삽입은 Hands입니다.

닫는 손:
- Delete: 앞으로 지우기
- Backspace: 뒤로 지우기
- 범위가 있으면 고른 것만 지움
- 평면: 고른 집합 삭제. 빈 선택이면 no-op

근거: 이미 닫힌 Delete chord, [APG](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/), Figma/tldraw/Excalidraw
