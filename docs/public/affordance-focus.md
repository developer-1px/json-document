# Focus

Focus는 키보드의 포인터입니다. Tab과 Shift+Tab은 컴포넌트 사이로 옮기고,
화살표·Home·End는 컴포넌트 안에서 옮깁니다. Focus와 [Select](affordance-select.md)는
다릅니다. Focus 표시는 항상 보여야 하고, 선택 표시와 겹치면 안 됩니다.

```ts
import { applyAffordance, focusAffordance } from "@interactive-os/json-document-affordance";

function onKeyDown(event: KeyboardEvent) {
  applyAffordance(focusAffordance(event), {
    hand: (hand) => {
      if (hand.type === "tab") return;
      if (hand.type === "move") setFocusKey(neighbor(focusKey, hand.direction));
      if (hand.type === "boundary") setFocusKey(hand.edge === "start" ? ids[0] : ids.at(-1));
    },
  });
}
```

호스트는 마크업과 초점 고리를 그립니다. 화살표가 선택까지 바꿀지는
장르 Intent입니다. keymap을 제품마다 열지 않습니다.

Web Adapter는 logical focus를 `roving tabindex` 또는 `aria-activedescendant`로
투영합니다. 한 composite는 둘 중 하나만 사용합니다. active descendant는 항상
현재 DOM에 있는 descendant ID를 가리키고, 빈 collection이면 속성을 제거한 채
container DOM focus를 유지합니다.

닫는 손:
- Tab / Shift+Tab: 컴포넌트 사이 탭 순서
- 화살표 / Home / End / PageUp / PageDown: 컴포넌트 안
- roving tabindex 또는 `aria-activedescendant`
- `:focus-visible` 윤곽. 마우스 클릭 초점과 키보드 초점을 같은 그림으로 강제하지 않음

근거: [APG Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/), [CSS UI outline](https://www.w3.org/TR/css-ui-4/#outline)

## Session API

`createLineFocusSession({ initialKey, onFocus, wrap? })`은 한 줄의 logical focus key와
화살표·Home·End 이동을 소유합니다. `handle(event, keys)`는 focus command를
소비했는지 반환합니다. DOM focus는 [Keyboard Adapter](adapter-keyboard.md)의
Web item binding이 실현합니다. `wrap: true`는 첫 항목과 마지막 항목 사이의
순환 이동을 선언합니다.
