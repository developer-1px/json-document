# Snap

TBD.

Snap은 [Drag](affordance-drag.md)·[Resize](affordance-resize.md)·
[Nudge](affordance-nudge.md) 중에 그리드나 가이드에 붙는 손입니다.
수정 키를 누르면 붙지 않습니다.

```ts
import { /* TBD */ } from "@interactive-os/json-document-affordance";
```

닫는 손:
- 이동·리사이즈 중 스냅
- 수정 키로 스냅 해제
- 회전 15° 스냅은 장르 Intent (Object)

호스트는 가이드 기하를 가집니다. 어포던스는 붙임/해제 손을 닫습니다.

근거: 캔버스·슬라이드 편집기 관례. CSS predefined 커서는 없음.
