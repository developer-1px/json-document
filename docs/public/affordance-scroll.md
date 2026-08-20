# Scroll

TBD.

Scroll은 휠로 보이는 내용을 옮기는 손입니다. 드래그 중 가장자리에 닿으면
자동으로 더 굴러갑니다. [Zoom](affordance-zoom.md)의 Mod+휠과 구분합니다.

```ts
import {
  wheelAffordance,
  autoscrollAffordance,
} from "@interactive-os/json-document-affordance";

function onWheel(event: WheelEvent) {
  const hand = wheelAffordance(event);
  if (hand.type === "scroll") scroller.scrollBy(0, hand.dy);
  if (hand.type === "zoom") setScale(hostZoom(scale, hand.delta));
}

function onPointerMove(event: PointerEvent) {
  const auto = autoscrollAffordance({
    x: event.clientX,
    y: event.clientY,
    width: scroller.clientWidth,
    height: scroller.clientHeight,
    edge: 16,
  });
  if (auto) scroller.scrollBy(auto.dx, auto.dy);
}
```

이 손은 호스트 overflow입니다. 문서 값은 바꾸지 않습니다.

닫는 손:
- wheel (수정 키 없음)
- 드래그 중 가장자리 autoscroll
- 초점 대상이 보이도록 scroll-into-view는 호스트

근거: [UI Events wheel](https://www.w3.org/TR/uievents/), [Pointer Events](https://www.w3.org/TR/pointerevents/)
