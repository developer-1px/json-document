# Escape

Escape는 안쪽 손부터 한 겹씩 닫습니다. 끌어 옮기는 중이면 그 손을 버리고,
열린 손이 없으면 고른 것을 지웁니다. `pointercancel`은 포인터 제스처만
중단하고 선택은 건드리지 않습니다.

```ts
import { applyAffordance, escapeAffordance } from "@interactive-os/json-document-affordance";

function onKeyDown(event: KeyboardEvent) {
  applyAffordance(
    escapeAffordance({
      key: event.key,
      grabbing: drag != null || marquee != null,
      selected: editor.selectedIds.length > 0,
    }),
    {
      hand: (hand) => {
        if (hand.type === "cancel") {
          setDrag(null);
          setMarquee(null);
          return;
        }
        if (hand.type === "clear") {
          editor.dispatch({ type: "selection.set", objectIds: [], mode: "replace" });
        }
      },
    },
  );
}
```

호스트는 무엇이 열려 있는지를 가집니다. 버리는 손은 보통 호스트 화면
상태입니다. 선택은 `clear`로 json-document에 갑니다.

닫는 손:
- 제스처가 열려 있으면 `cancel` (드래그, 마키, 팬, 타입어헤드 버퍼, 메뉴, Rename)
- 제스처가 없고 고른 것이 있으면 `clear`
- `pointercancel` / `lostpointercapture`: 항상 `cancel`

근거: [APG Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [Pointer Events](https://www.w3.org/TR/pointerevents/), Finder/Figma/tldraw의 Escape 한 겹 닫기
