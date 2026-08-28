# Scroll

Scroll은 휠로 보이는 내용을 옮기는 손입니다. 드래그 중 가장자리에 닿으면
자동으로 더 굴러갑니다. [Zoom](affordance-zoom.md)의 Mod+휠과 구분합니다.

```ts
import { applyAffordance, wheelAffordance } from "@interactive-os/json-document-affordance";

function onWheel(event: WheelEvent) {
  applyAffordance(wheelAffordance(event), {
    hand: (hand) => {
      if (hand.type === "translate") scroller.scrollBy(hand.dx, hand.dy);
      if (hand.type === "zoom") setScale(scale * hand.factor);
    },
  });
}
```

이 손은 호스트 overflow입니다. 문서 값은 바꾸지 않습니다.

특정 오브젝트를 원하는 viewport 위치로 보내는 수명은
`createViewportPositionSession`이 소유합니다. 문서 끝에서 해당 위치까지 스크롤할
수 없다면 부족한 trailing scroll range를 임시로 만들고, 뒤의 content가 자라면
같은 layout 주기에 줄입니다. 대상이 viewport를 벗어나거나 사용자가 wheel·pointer로
viewport를 직접 조작하면 control과 임시 range를 함께 해제합니다. Web binding은
`createWebViewportPositionPorts`로 exact target과 선택적인 tail reserve, 사용자
개입을 연결합니다.

```ts
const ports = createWebViewportPositionPorts({
  viewport,
  content,
  findTarget,
  findTailReserve,
  createVisibilityObserver,
});
const session = createViewportPositionSession({ ...ports });
const stopLayout = ports.observeLayout(() => session.layoutChanged());
const stopVisibility = ports.observeTargetVisibility(targetId, (visible) => {
  session.targetVisibilityChanged(visible);
});
const stopUserInteraction = ports.observeUserInteraction(() => {
  session.cancel("user-interaction");
});

session.position(targetId, 96);
```

이미 충분한 scroll range가 있는 제품은 `findTailReserve`를 생략할 수 있습니다.
초기 위치를 즉시 적용하려면 `session.position(targetId, 0, "instant")`를 사용하고,
`complete()`로 능동 이동을 끝낸 뒤에도 layout 재조정 소유권을 유지할 수 있습니다.
Calendar는 이 계약에 `workHourStart` 제품 정책만 주입합니다.

닫는 손:
- wheel (수정 키 없음). 평면에서는 스크롤/팬. 객체 좌표 불변
- 초점 대상이 보이도록 scroll-into-view는 호스트
- Mod+휠은 [Zoom](affordance-zoom.md)

근거: [UI Events wheel](https://www.w3.org/TR/uievents/), [Pointer Events](https://www.w3.org/TR/pointerevents/)

## TBD

- 드래그 중 가장자리 autoscroll
