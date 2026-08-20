# Focus

TBD.

Focus는 키보드의 포인터입니다. Tab과 Shift+Tab은 컴포넌트 사이로 옮기고,
화살표·Home·End는 컴포넌트 안에서 옮깁니다. Focus와 [Select](affordance-select.md)는
다릅니다. Focus 표시는 항상 보여야 하고, 선택 표시와 겹치면 안 됩니다.

```ts
import { /* TBD */ } from "@interactive-os/json-document-affordance";
```

닫는 손:
- Tab / Shift+Tab: 컴포넌트 사이 탭 순서
- 화살표 / Home / End / PageUp / PageDown: 컴포넌트 안
- roving tabindex 또는 `aria-activedescendant`
- `:focus-visible` 윤곽. 마우스 클릭 초점과 키보드 초점을 같은 그림으로 강제하지 않음

호스트는 마크업과 초점 고리를 그립니다. 단축키를 제품마다 열지 않습니다.

근거: [APG Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/), [CSS UI outline](https://www.w3.org/TR/css-ui-4/#outline)
