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

`diffText(before, after)`는 공통 앞뒤를 제외한 하나의 `{ from, to, insert }` 교체를
반환합니다. `from`/`to`는 이전 문자열의 UTF-16 위치이며 같은 문자열이면 `null`입니다.
`before.slice(0, from) + insert + before.slice(to)`가 `after`를 재현합니다. 이 함수는
선택 보정이나 Markdown 해석을 하지 않으며 Web projection과 History의 변경 추출이 공유합니다.

Markdown 문법은 이 모듈이 해석하지 않습니다. 외부 변경 후 selection은 새 문자열 범위로
clamp하며, 동시 문자열 편집의 semantic rebase는 이 실험의 범위에 없습니다.
네이티브 composition의 commit 경계는 contenteditable binding이 결정합니다.

EditingSession의 기본 History는 묶이지 않은 단일 문자열 replace에서 앞뒤의 같은
부분을 제외한 변경 위치·삭제 문자열·삽입 문자열을 저장합니다. 절약이 없는 작은 교체,
묶음 History, 일반 JSON Patch와 외부 History 연결은 기존 표현을 유지합니다.
Undo/Redo 시점에 현재 문자열에 적용할 정상 JSON Patch replace를 복원하며, JSONDocument
변경 계약과 History 항목 수·선택 복원 순서는 동일합니다.
따라서 장문에서 작은 편집을 반복해도 매 단계의 전체 원문을 History에 보관하지 않습니다.
공통 부분을 찾는 문자열 순회 비용과 현재 문서의 문자열 저장은 남습니다.
`history: "ignore"`로 기록 밖의 변경을 적용할 때에는 기존 Undo/Redo의 전체 replace 의미를
보존하기 위해 먼저 압축 History를 원래 JSON Patch로 복원합니다. 이 경우에는 전체 문자열
보관 비용이 다시 생깁니다. 일반 TextEditor 입력에는 이 경로를 사용하지 않습니다.

[Markdown caret Usage](/demo/markdown-caret)에서 기존 EditingSession의 문자열 적용을 확인합니다.
