# Undo

Undo는 값과 선택을 함께 되돌리는 손입니다. Mod+Z는 undo, Mod+Shift+Z는
redo입니다. 버튼은 `canUndo` / `canRedo`를 읽어 꺼집니다.

```ts
import {
  applyAffordance,
  historyAffordance,
} from "@interactive-os/json-document-affordance";

let commands = {
  undo: { name: "undo" as const, disabled: true },
  redo: { name: "redo" as const, disabled: true },
};
applyAffordance(historyAffordance({
  canUndo: editor.snapshot.canUndo,
  canRedo: editor.snapshot.canRedo,
}), {
  hand: (hand) => {
    if (hand.type === "history") commands = { undo: hand.undo, redo: hand.redo };
  },
});

<button
  disabled={commands.undo.disabled}
  onClick={() => editor.undo()}
>
  Undo
</button>
```

History 기록 자체는 Editing이 가지고, 어포던스는 그 손을 닫습니다.

## TBD

```ts
function onKeyDown(event: KeyboardEvent) {
  const command = resolveAffordanceKey(event);
  if (command?.type === "redo") editor.redo();
}
```

- Mod+Y redo 변종
- 연속 입력의 묶음 단위
- 협업 replica에서 내 기여만 되돌리기는 Collaboration History
