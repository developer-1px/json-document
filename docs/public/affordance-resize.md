# 크기 바꾸기

TBD.

크기 바꾸기는 가장자리·모서리·칸 경계·창 분할선을 움직이는 손입니다.
CSS predefined 리사이즈 커서가 이 손을 닫습니다.

```ts
import { /* TBD */ } from "@interactive-os/json-document-affordance";
```

닫는 손:
- 모서리: `n-resize` … `nwse-resize`
- 칸/행: `col-resize` / `row-resize`
- 분할선: 화살표로 이동, Enter로 접기 (APG Window Splitter)
- Shift: 비율 고정 (관례)
- Alt: 가운데 기준 (관례)
- CSS `resize` 속성: 스크롤 상자의 사용자 리사이즈

호스트는 핸들과 기하를 그립니다. 어포던스는 손과 커서를 닫습니다.

근거: [CSS UI cursor resize](https://www.w3.org/TR/css-ui-4/#cursor), [CSS UI resize](https://www.w3.org/TR/css-ui-4/#resize), [APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)
