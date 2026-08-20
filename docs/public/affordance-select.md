# 고르기

고르기는 대상을 집는 손입니다. 클릭은 그 대상으로 바꾸고, Shift는
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

Keyboard Adapter는 chord를 command로 바꿉니다. 고르기는 그 command가
replace인지 extend인지를 닫습니다.

## TBD

- Mod+A 모두 고르기 토글
- Home / End / PageUp / PageDown
- 초점 따라 선택 vs 초점만 이동
- 글 단어·줄 범위는 [두 번 누르기](affordance-double-click.md)·
  [세 번 누르기](affordance-triple-click.md)·[캐럿](affordance-caret.md)
- 빈 평면의 여러 대상은 [쓸어 담기](affordance-marquee.md)
