# Not-allowed

TBD.

Not-allowed는 지금 그 손을 쓸 수 없음을 커서로 말하는 손입니다. 비활성
대상은 `not-allowed`, 놓을 수 없는 자리는 `no-drop`입니다.

```ts
import { forbiddenCursor } from "@interactive-os/json-document-affordance";

forbiddenCursor({ allowed: false, dropping: false });
// "not-allowed"

forbiddenCursor({ allowed: false, dropping: true });
// "no-drop"

forbiddenCursor({ allowed: true, dropping: true, operation: "move" });
// "move"
```

호스트는 비활성 그림을 그립니다. 어포던스는 거절 커서를 닫습니다.

닫는 손:
- `not-allowed`: 요청한 동작 불가
- `no-drop`: 이 자리에 놓을 수 없음
- 비활성 대상의 초점 가능 여부는 APG 규칙, 호스트가 가짐

근거: [CSS UI cursor `not-allowed` / `no-drop`](https://www.w3.org/TR/css-ui-4/#cursor), [APG disabled focus](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
