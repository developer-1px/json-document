# 밀기

TBD.

밀기는 대상을 옮기지 않고 보이는 평면을 옮기는 손입니다. `grab` /
`grabbing` / `all-scroll` 커서가 이 손을 가리킵니다.

```ts
import { /* TBD */ } from "@interactive-os/json-document-affordance";
```

닫는 손:
- Space + 드래그
- 가운데 버튼 드래그
- `grab` → `grabbing`
- `all-scroll`

호스트는 뷰포트 변환을 가집니다. 어포던스는 손과 커서를 닫습니다.

근거: [CSS UI cursor `grab` / `all-scroll`](https://www.w3.org/TR/css-ui-4/#cursor)
