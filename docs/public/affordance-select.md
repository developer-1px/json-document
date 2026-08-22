# Select

Select는 대상을 집는 손입니다. 클릭은 그 대상으로 바꾸고, Shift는
범위를 늘리며, Mod는 토글합니다. 화살표는 이웃으로 옮기고, Shift+화살표는
범위를 늘립니다.

```ts
import {
  applyAffordance,
  pointerSelect,
  planeHitAffordance,
} from "@interactive-os/json-document-affordance";

function onPointerDown(event: PointerEvent, itemId: string) {
  applyAffordance(pointerSelect(event), {
    hand: (hand) => {
      if (hand.type === "select") {
        editor.dispatch({ type: "selection.set", itemId, mode: hand.operation });
      }
    },
  });
}

function onPlanePointerDown(event: PointerEvent, hitId: string, selectedIds: ReadonlyArray<string>) {
  applyAffordance(planeHitAffordance({ hitId, selectedIds, ...event }), {
    hand: (hand) => {
      if (hand.type !== "select" || !hand.objectIds) return;
      editor.dispatch({ type: "selection.set", objectIds: hand.objectIds, mode: "replace" });
    },
  });
}
```

호스트는 보이는 키와 장르 Intent만 넘깁니다. keymap을 덮어쓰지 않습니다.
이미 고른 상자를 수정 키 없이 누르면 집합을 유지합니다. 안 고른 상자는
그 상자만으로 바꿉니다.

닫는 손:
- 클릭 replace, 이미 고른 집합 유지
- Shift+click 추가/제거
- Mod+click은 `nestedId`가 있을 때만 자식
- Mod+A `selectAllAffordance`
- 잠긴 객체는 [Not-allowed](affordance-forbid.md)

## TBD

- Home / End / PageUp / PageDown은 `resolveAffordanceKey`의 boundary
- selection follows focus vs focus-only move는 [Focus](affordance-focus.md)
- 글 단어·줄 범위는 [Double-click](affordance-double-click.md)·
  [Triple-click](affordance-triple-click.md)·[Caret](affordance-caret.md)
- 빈 평면의 여러 대상은 [Marquee](affordance-marquee.md)
