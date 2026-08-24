# Undo

Undo는 값과 선택을 함께 되돌리는 손입니다. Mod+Z는 undo, Mod+Shift+Z는
redo입니다. 버튼은 `canUndo` / `canRedo`를 읽어 꺼집니다.

```ts
import {
  historyAffordance,
} from "@interactive-os/json-document-affordance";

const commands = historyAffordance({
  canUndo: editor.snapshot.canUndo,
  canRedo: editor.snapshot.canRedo,
}).hand;

<button
  disabled={commands.undo.disabled}
  onClick={() => editor.undo()}
>
  Undo
</button>
```

History 기록 자체는 Editing이 가지고, 어포던스는 그 손을 닫습니다.

## API Reference

### `historyAffordance(snapshot)`

`canUndo`와 `canRedo`를 받아 항상 `history` hand를 반환합니다. 반환형
`HistoryAffordanceResult`의 `hand.undo`와 `hand.redo`는 각각 `name`과
`disabled`를 가지므로 버튼 상태에 직접 사용할 수 있습니다. History 기록과
실행은 Editing/Host가 계속 소유합니다.

## TBD

```ts
function onKeyDown(event: KeyboardEvent) {
  const command = editingCommandFromWebKeyboardStroke(event);
  if (command?.type === "redo") editor.redo();
}
```

- Mod+Y redo 변종
- 연속 입력의 묶음 단위
- 협업 replica에서 내 기여만 되돌리기는 Collaboration History

## Live Demo

```live-demo
/widgets/toolbar
```
