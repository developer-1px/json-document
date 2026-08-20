# Select

Select는 대상을 집는 손입니다. 클릭은 그 대상으로 바꾸고, Shift는
범위를 늘리며, Mod는 토글합니다. 화살표는 이웃으로 옮기고, Shift+화살표는
범위를 늘립니다.

```ts
import {
  pointerSelect,
  resolveAffordanceKey,
} from "@interactive-os/json-document-affordance";

pointerSelect({ shiftKey: true, metaKey: false, ctrlKey: false });
// "extend"

const command = resolveAffordanceKey({
  key: "ArrowDown",
  shiftKey: true,
  metaKey: false,
  ctrlKey: false,
});
// { type: "move", direction: "down", operation: "extend" }
```

호스트는 보이는 키와 장르 Intent만 넘깁니다. keymap을 덮어쓰지 않습니다.
React에서 범위와 커서를 그리려면 `useEditing`의 `onSelect`에
`pointerSelect` 결과를 연결합니다.

Keyboard Adapter는 chord를 command로 바꿉니다. Select는 그 command가
replace인지 extend인지를 닫습니다.

## TBD

```ts
import { selectAllAffordance } from "@interactive-os/json-document-affordance";

selectAllAffordance({ allSelected: false });
// "select-all"

selectAllAffordance({ allSelected: true });
// "clear"
```

- Mod+A Select all 토글
- Home / End / PageUp / PageDown은 `resolveAffordanceKey`의 boundary
- selection follows focus vs focus-only move는 [Focus](affordance-focus.md)
- 글 단어·줄 범위는 [Double-click](affordance-double-click.md)·
  [Triple-click](affordance-triple-click.md)·[Caret](affordance-caret.md)
- 빈 평면의 여러 대상은 [Marquee](affordance-marquee.md)
