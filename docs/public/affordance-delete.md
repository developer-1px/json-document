# Delete

Delete는 고른 대상을 없애는 손입니다. `resolveAffordanceKey`는 이미
Delete와 Backspace를 `delete` command로 닫습니다. 칸 비우기와 항목 제거는
장르 Intent입니다.

```ts
import {
  deleteAffordance,
  resolveAffordanceKey,
} from "@interactive-os/json-document-affordance";

function onKeyDown(event: KeyboardEvent) {
  const command = resolveAffordanceKey(event);
  const hand = deleteAffordance(event);
  if (command?.type !== "delete" || !hand) return;
  if (hand.source === "selection" || hand.source === "forward") {
    editor.dispatch({ type: "selection.remove" });
  }
}
```

호스트는 장르 Intent만 가집니다. 값 삽입은 Hands입니다.

항목 삭제 뒤 logical focus는 Editing transaction의 `selectionAfter`가
복구합니다. 같은 위치의 다음 survivor, 없으면 이전 survivor를 고르고,
collection이 비면 `null`입니다. 마지막 `null`을 container·opener·다음 workflow
중 어디로 보낼지는 Extension/host 정책입니다. Affordance와 Connector는
successor를 다시 계산하지 않습니다.

닫는 손:
- Delete: 앞으로 지우기
- Backspace: 뒤로 지우기
- 범위가 있으면 고른 것만 지움
- 삭제된 key를 selection·focus·`aria-activedescendant`가 참조하지 않음

근거: 이미 닫힌 Delete chord, [APG](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
