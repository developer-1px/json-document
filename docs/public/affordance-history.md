# 되돌리기

되돌리기는 값과 선택을 함께 되돌리는 손입니다. Mod+Z는 undo, Mod+Shift+Z는
redo입니다. 버튼은 `canUndo` / `canRedo`를 읽어 꺼집니다.

```ts
import { historyAffordance } from "@interactive-os/json-document-affordance";

const commands = historyAffordance({ canUndo: true, canRedo: false });
commands.undo.disabled; // false
commands.redo.disabled; // true
```

`resolveAffordanceKey`가 `undo` / `redo` command를 내면 호스트는
`editor.undo()` / `editor.redo()`만 호출합니다. History 기록 자체는
Editing이 가지고, 어포던스는 그 손을 닫습니다.
