# 굴리기

TBD.

굴리기는 휠로 보이는 내용을 옮기는 손입니다. 드래그 중 가장자리에 닿으면
자동으로 더 굴러갑니다. [확대](affordance-zoom.md)의 Mod+휠과 구분합니다.

```ts
import { /* TBD */ } from "@interactive-os/json-document-affordance";
```

닫는 손:
- wheel (수정 키 없음)
- 드래그 중 가장자리 autoscroll
- 초점 대상이 보이도록 scroll-into-view

호스트는 overflow를 그립니다. 어포던스는 휠과 자동 굴리기를 닫습니다.

근거: [UI Events wheel](https://www.w3.org/TR/uievents/), [Pointer Events](https://www.w3.org/TR/pointerevents/)
