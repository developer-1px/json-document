# 캐럿

TBD.

캐럿은 글 안의 삽입점입니다. 항목 [고르기](affordance-select.md)와 다릅니다.
`text` / `vertical-text` 커서가 이 손을 가리킵니다. 클릭은 삽입점을 두고,
드래그는 글 범위를 고릅니다.

```ts
import { /* TBD */ } from "@interactive-os/json-document-affordance";
```

닫는 손:
- 클릭: 삽입점
- 드래그: 글 범위
- 화살표 / Home / End: 글자·줄 끝
- IME composition은 삽입 경로. 값 편집 자체는 Hands

호스트는 I-beam과 글 기하를 그립니다. 어포던스는 삽입점과 글 범위 손을 닫습니다.

근거: [CSS UI cursor `text`](https://www.w3.org/TR/css-ui-4/#cursor), [UI Events select](https://www.w3.org/TR/uievents/)
