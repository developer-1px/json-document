# Activate

TBD.

Activate는 대상의 기본 동작을 실행하는 손입니다. `pointer` 커서가 이
손을 가리킵니다. Enter와 기본 클릭은 같은 손입니다. Listbox에서 Space는
[Select](affordance-select.md)의 toggle입니다.

```ts
import {
  activateAffordance,
  resolveAffordanceKey,
} from "@interactive-os/json-document-affordance";

activateAffordance({ key: "Enter" });
// "activate"

activateAffordance({ type: "pointer", button: 0, detail: 1 });
// "activate"

resolveAffordanceKey({
  key: " ",
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
});
// { type: "toggle" }
```

호스트는 기본 동작이 무엇인지 정합니다. 어포던스는 그 동작을 부르는 손을 닫습니다.

닫는 손:
- 기본 클릭 (`detail` 1)
- Enter
- Space는 장르 Intent: 버튼은 activate, 목록은 toggle

근거: [APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [CSS UI cursor `pointer`](https://www.w3.org/TR/css-ui-4/#cursor)
