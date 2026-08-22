# Press / Activate

Press는 custom control을 누르는 동안의 `start`·`end`·`cancel`을 닫고,
Activate는 완료된 Press나 native click이 대상의 기본 동작을 실행하는 손입니다.
Native `<button>`의 Enter·Space는 브라우저에 맡깁니다. Listbox에서 Space는
[Select](affordance-select.md)의 toggle처럼 role Intent로 갑니다.

```ts
import {
  activateAffordance,
  applyAffordance,
  pressAffordance,
  type PressAffordanceState,
} from "@interactive-os/json-document-affordance";
import { pressInteractionFromWeb } from "@interactive-os/json-document-web";

let press: PressAffordanceState = { status: "idle" };

function onCustomPress(event: KeyboardEvent | PointerEvent | MouseEvent) {
  const interaction = pressInteractionFromWeb(event);
  // Pointer lifecycle가 완료된 뒤 오는 compatibility click은 다시 실행하지 않는다.
  if (interaction?.phase === "activation" && interaction.source === "pointer") return;
  const result = pressAffordance(interaction, press);
  press = result.state;
  applyAffordance(result, {
    hand: (hand) => {
      if (hand.type === "activate") hostRunRoleAction();
      if (hand.type !== "press") return;
      applyAffordance(activateAffordance(hand), {
        hand: (activation) => {
          if (activation.type === "activate") hostRunRoleAction();
        },
      });
    },
  });
}
```

`press.status === "active"`는 transient 상태이며 `:active` 또는 `data-pressed`로 그립니다.
Toggle button의 지속 상태인 `aria-pressed`와 다릅니다. disabled이면 Press는
시작되지 않습니다. 호스트는 완료된 Press가 activate·toggle·select·expand 중
어느 action인지 role Intent로 정합니다.

닫는 손:
- native control은 browser activation 뒤 click
- custom control은 Enter·Space·primary pointer의 start/end/cancel
- Enter는 start, Space와 pointer는 유효한 end에서 한 번 activate
- pointerleave·pointercancel·lostpointercapture 뒤의 pointerup은 activate하지 않음
- custom pointer lifecycle 뒤 compatibility click은 무시하고, `detail === 0` virtual click만 별도 activation으로 받음
- repeat keydown은 새 Press를 만들지 않음
- Space는 장르 Intent: 버튼은 activate, 목록은 toggle

근거: [APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [CSS UI cursor `pointer`](https://www.w3.org/TR/css-ui-4/#cursor)
