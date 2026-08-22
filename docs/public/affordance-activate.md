# Press / Activate

Press는 custom control을 누르는 동안의 `start`·`end`·`cancel`을 닫고,
Activate는 완료된 Press나 native click이 대상의 기본 동작을 실행하는 손입니다.
Native `<button>`의 Enter·Space는 브라우저에 맡깁니다. Listbox에서 Space는
[Select](affordance-select.md)의 toggle처럼 role Intent로 갑니다.

```ts
import {
  applyAffordance,
  pressAffordance,
} from "@interactive-os/json-document-affordance";
import { pressInteractionFromWeb } from "@interactive-os/json-document-web";

let pressing = false;

function onCustomPress(event: KeyboardEvent | PointerEvent) {
  const result = pressAffordance(pressInteractionFromWeb(event), { pressing });
  pressing = result.pressing;
  applyAffordance(result, {
    hand: (hand) => {
      if (hand.type === "press" && hand.phase === "end") hostRunRoleAction();
    },
  });
}
```

`pressing`은 transient 상태이며 `:active` 또는 `data-pressed`로 그립니다.
Toggle button의 지속 상태인 `aria-pressed`와 다릅니다. disabled이면 Press는
시작되지 않습니다. 호스트는 완료된 Press가 activate·toggle·select·expand 중
어느 action인지 role Intent로 정합니다.

닫는 손:
- native control은 browser activation 뒤 click
- custom control은 Enter·Space·primary pointer의 start/end/cancel
- repeat keydown은 새 Press를 만들지 않음
- Space는 장르 Intent: 버튼은 activate, 목록은 toggle

근거: [APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [CSS UI cursor `pointer`](https://www.w3.org/TR/css-ui-4/#cursor)
