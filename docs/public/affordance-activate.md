# Activate

Activate는 대상의 기본 동작을 실행하는 손입니다. `pointer` 커서가 이
손을 가리킵니다. Enter와 기본 클릭은 같은 손입니다. Listbox에서 Space는
[Select](affordance-select.md)의 toggle입니다.

```ts
import {
  activateAffordance,
  resolveAffordanceKey,
} from "@interactive-os/json-document-affordance";

function onPointerDown(event: PointerEvent, itemId: string) {
  if (activateAffordance(event) === "activate") hostOpen(itemId);
}

function onKeyDown(event: KeyboardEvent) {
  if (activateAffordance(event) === "activate") hostOpen(focusKey);
  const command = resolveAffordanceKey(event);
  if (command?.type === "toggle") {
    editor.dispatch({ type: "selection.set", itemId: focusKey, mode: "toggle" });
  }
}
```

호스트는 기본 동작이 무엇인지 정합니다. 목록 toggle은 json-document 선택으로,
열기는 호스트 Intent로 갑니다.

닫는 손:
- 기본 클릭 (`detail` 1)
- Enter
- Space는 장르 Intent: 버튼은 activate, 목록은 toggle
- 평면 Enter / 더블클릭: 그룹이면 한 단계 들어가기, 텍스트면 편집

근거: [APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [CSS UI cursor `pointer`](https://www.w3.org/TR/css-ui-4/#cursor), Figma double-click or Enter = child
