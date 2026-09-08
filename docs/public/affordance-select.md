# Select

Select는 대상을 집는 손입니다. 클릭은 그 대상으로 바꾸고, Shift는
범위를 늘리며, Mod는 토글합니다. 화살표는 이웃으로 옮기고, Shift+화살표는
범위를 늘립니다.

```ts
import {
  applyAffordance,
  editingCommandFromWebKeyboardStroke,
  pointerSelect,
  planeHitAffordance,
  selectAllAffordance,
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

const editing = useEditing({
  // selection과 topology는 Host가 주입합니다.
  keyboard: {
    resolve: editingCommandFromWebKeyboardStroke,
    focusKey: () => editor.focusKey,
    neighbor: (key, command) => neighborFromProductTopology(key, command),
  },
});

function onSelectAll(event: KeyboardEvent) {
  applyAffordance(selectAllAffordance(event, {
    allSelected: editor.selectedItemIds.length === items.length,
  }, { repeat: "preserve" }), {
    hand: (hand) => {
      if (hand.type !== "select-all") return;
      editor.dispatch({ type: "selection.select-all" });
      event.preventDefault();
    },
  });
}
```

호스트는 보이는 키와 장르 Intent만 넘깁니다. keymap을 덮어쓰지 않습니다.
이미 고른 상자를 수정 키 없이 누르면 집합을 유지합니다. 안 고른 상자는
그 상자만으로 바꿉니다.

## API Reference

### `editingCommandFromWebKeyboardStroke(stroke)`

`WebKeyboardStroke`를 `useEditing`의 keyboard port가 받는
`WebKeyboardCommand | null`로 투영합니다. Web keymap과 Affordance hand의
공통 해석만 소유하며, 현재 focus와 다음 이웃을 결정하는 topology는 Host가
`focusKey`와 `neighbor`로 주입합니다.

### `selectAllAffordance(stroke, state, { repeat })`

기본 편집 Usage는 `repeat: "preserve"`를 선택합니다. Mod+A를 반복해도
`select-all`을 보내며 전체 선택을 해제하지 않습니다. 옵션 생략 또는
`repeat: "toggle"`은 기존 `allSelected ? clear : select-all` 동작입니다.
Document·Order·Tree·Sheet의 `selection.select-all`은 대상 전체를 한 번의
선택 전이로 만듭니다. Tree는 visible topology, Sheet는 선언한 행·열을 사용합니다.
빈 대상은 빈 선택이 되고, 선택 변경은 문서 Undo/Redo 기록을 추가하거나 지우지 않습니다.
실제 Demo는 Web의 `isWebEditingHostTarget`으로 내부 text field의 Mod+A를 보존합니다.

Usage와 Source: [Order](/demo/order), [Tree](/demo/tree), [Sheet](/demo/sheet), [Document](/demo).

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

## Live Demo

```live-demo
/widgets/listbox
```

```live-demo
/widgets/grid
```

```live-demo
/widgets/document
```
