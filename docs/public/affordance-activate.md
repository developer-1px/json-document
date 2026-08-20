# Activate

TBD.

Activate는 고른 대상의 기본 동작을 실행하는 손입니다. `pointer` 커서가 이
손을 가리킵니다. 클릭과 Enter·Space는 같은 손입니다.

```ts
import { /* TBD */ } from "@interactive-os/json-document-affordance";
```

닫는 손:
- 기본 클릭
- Enter / Space
- UIEvent.detail이 1일 때의 click

호스트는 기본 동작이 무엇인지 정합니다. 어포던스는 그 동작을 부르는 손을 닫습니다.

근거: [APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [CSS UI cursor `pointer`](https://www.w3.org/TR/css-ui-4/#cursor)
