# Select

Select는 대상을 집는 손입니다. 클릭은 그 대상으로 바꾸고, Shift는
범위를 늘리며, Mod는 토글합니다. 화살표는 이웃으로 옮기고, Shift+화살표는
범위를 늘립니다.

```ts
import {
  applyAffordance,
  pointerSelect,
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
```

호스트는 보이는 키와 장르 Intent만 넘깁니다. keymap을 덮어쓰지 않습니다.

## TBD

```ts
function onKeyDown(event: KeyboardEvent) {
  const hand = selectAllAffordance({
    key: event.key,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    allSelected: editor.selectedItemIds.length === ids.length,
  });
  if (hand === "select-all") {
    editor.dispatch({ type: "selection.set", itemIds: ids, mode: "replace" });
  }
  if (hand === "clear") {
    editor.dispatch({ type: "selection.set", itemIds: [], mode: "replace" });
  }
}
```

- Mod+A Select all 토글
- Home / End / PageUp / PageDown은 `resolveAffordanceKey`의 boundary
- selection follows focus vs focus-only move는 [Focus](affordance-focus.md)
- 글 단어·줄 범위는 [Double-click](affordance-double-click.md)·
  [Triple-click](affordance-triple-click.md)·[Caret](affordance-caret.md)
- 빈 평면의 여러 대상은 [Marquee](affordance-marquee.md)
