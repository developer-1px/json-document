## 문자열 편집

`createTextEditor(document, pointer = "")`는 JSONDocument의 string target을 편집합니다.
target이 처음부터 string이 아니면 `TypeError`를 던집니다.
`text`는 현재 원문이며, `snapshot`/`subscribe`는 기존 EditingSession의
selection·history 상태입니다.

- `select({ anchor, focus })`: 방향 있는 UTF-16 선택. 범위를 clamp하며 history를 만들지 않습니다.
- `replace(value, selection)`: 전체 원문과 편집 후 선택을 하나의 transaction으로 기록합니다.
  target이 사라지면 `text.target-unavailable`로 거절합니다. 같은 문자열이면 selection만 바꿉니다.
- `insert(text)`: 선택 범위를 literal text로 교체하고 끝으로 caret을 옮깁니다. 빈 문자열은 삭제입니다.
- `copy()`: 선택한 원문의 substring을 반환합니다.
- `undo()`/`redo()`: 원문과 transaction 이전/이후 선택을 함께 복원합니다.
- `clampTextSelection(value, selection)`: UTF-16 surrogate pair를 가르지 않도록 선택을 보정합니다.

Markdown 문법은 이 모듈이 해석하지 않습니다. 외부 변경 후 selection은 새 문자열 범위로
clamp하며, 동시 문자열 편집의 semantic rebase는 이 실험의 범위에 없습니다.
네이티브 composition의 commit 경계는 contenteditable binding이 결정합니다.

[Markdown caret Usage](/demo/markdown-caret)에서 기존 EditingSession의 문자열 적용을 확인합니다.
