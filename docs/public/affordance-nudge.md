# Nudge

TBD.

Nudge는 고른 대상을 키보드로 조금 옮기는 손입니다. 화살표는 한 단위,
Shift+화살표는 큰 단위입니다. 키를 누르면 반복됩니다. 항목 이웃으로 초점을
옮기는 [Select](affordance-select.md)와 다릅니다.

```ts
import { /* TBD */ } from "@interactive-os/json-document-affordance";
```

닫는 손:
- Arrow: 1 단위
- Shift+Arrow: 큰 단위
- 키 반복

호스트는 단위(px, 칸, 그리드)를 정합니다. 어포던스는 손과 수정 키를 닫습니다.

근거: 캔버스·슬라이드 편집기 관례 (Object 장르 Intent가 단위를 가짐)
