# Nudge

TBD.

Nudge는 고른 대상을 키보드로 조금 옮기는 손입니다. 화살표는 한 단위,
Shift+화살표는 큰 단위입니다. 항목 이웃으로 초점을 옮기는
[Select](affordance-select.md)와 다릅니다.

```ts
import { nudgeAffordance } from "@interactive-os/json-document-affordance";

function onKeyDown(event: KeyboardEvent) {
  const hand = nudgeAffordance(event);
  if (!hand) return;
  editor.dispatch({
    type: "object.translate",
    objectIds: editor.selectedObjects.map((object) => object.id),
    dx: hand.dx * unit,
    dy: hand.dy * unit,
  });
}
```

호스트는 단위(px, 칸, 그리드)를 곱합니다. 이동은 json-document로 갑니다.

닫는 손:
- Arrow: 1 단위
- Shift+Arrow: 10 단위
- 키 반복은 호스트 플랫폼 기본

근거: 캔버스·슬라이드 편집기 관례. Object 장르 Intent가 단위를 가짐.
