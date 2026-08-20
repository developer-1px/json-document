# Escape

TBD.

Escape는 진행 중인 손과 임시 UI를 버리는 손입니다. Escape 키는 메뉴·대화·
드래그를 닫고, `pointercancel`은 포인터 제스처를 중단합니다.

```ts
import { escapeAffordance } from "@interactive-os/json-document-affordance";

function onKeyDown(event: KeyboardEvent) {
  if (escapeAffordance(event) === "cancel") {
    setMenu(null);
    drag = null;
  }
}

function onPointerCancel(event: PointerEvent) {
  if (escapeAffordance(event) === "cancel") drag = null;
}
```

호스트는 무엇이 열려 있는지를 가집니다. 버리는 손은 보통 호스트 화면
상태입니다. 문서 값은 바꾸지 않습니다.

닫는 손:
- Escape: 메뉴, 대화, 드래그, Rename 중단
- pointercancel / lostpointercapture: 포인터 제스처 중단

근거: [APG Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [Pointer Events](https://www.w3.org/TR/pointerevents/)
