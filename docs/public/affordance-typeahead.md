# Typeahead

Typeahead는 인쇄 글쇠로 목록·나무에서 이름으로 건너뛰는 손입니다. 한 글자는
그 글자로 시작하는 다음 항목, 빠르게 이어 치면 그 문자열로 시작합니다.

```ts
import {
  applyAffordance,
  typeaheadAffordance,
} from "@interactive-os/json-document-affordance";

function onKeyDown(event: KeyboardEvent) {
  applyAffordance(typeaheadAffordance({
    buffer,
    key: event.key,
    elapsedMs: event.timeStamp - lastType,
    names: items.map((item) => item.label),
    from: focusedLabel,
  }), {
    hand: (hand) => {
      if (hand.type !== "typeahead") return;
      setBuffer(hand.buffer);
      const itemId = items.find((item) => item.label === hand.name)?.id;
      if (itemId) editor.dispatch({ type: "selection.set", itemId, mode: "replace" });
    },
  });
}
```

호스트는 보이는 이름을 줍니다. 점프한 키는 호스트 Focus로 가고, 선택까지
바꿀지는 장르 Intent입니다.

닫는 손:
- 한 문자: 그 prefix의 다음 항목
- 연속 문자: 문자열 prefix
- 짧은 시간 안에만 이어 붙임

근거: [APG Listbox type-ahead](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
