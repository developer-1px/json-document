# Sheet 구조와 Markdown 편집

`SheetEditor.structure`는 현재 선택과 구조 정책에서 실행 가능한 행·열 Intent를 제공합니다. 삭제가 금지되면 해당 action은 `null`입니다. Hand는 헤더나 최소 열 수를 다시 판정하지 않습니다. 같은 정책은 직접 `dispatch`한 Intent에도 적용됩니다.

```ts
import { createSheetEditor, sheetColumnLabel } from '@interactive-os/json-document-editing';
const editor = createSheetEditor({
  columns: [{id: 'a', label: sheetColumnLabel(0)}],
  rows: [{id: 'header', cells: {a: '제목'}}],
}, {structure: {headerRows: 1, minimumColumns: 1}});
editor.dispatch(editor.structure.insertRow);
// row.insert의 row와 column.insert의 column을 생략하면 owner가 ID와 빈 셀을 구성합니다.
```

`sheetColumnLabel`은 0부터 시작하는 열 좌표를 A…Z, AA…로 표현합니다. 사용자 정의 열 label과 ID를 넘기는 기존 Intent는 계속 지원합니다.

`createMarkdownTableEditor(textEditor, position)`는 React 없이 Markdown과 Sheet를 연결합니다. Markdown 문법은 Markdown package를 사용하고, 원문 변경과 Undo/Redo는 TextEditor가 소유합니다. 표 구조는 `headerRows: 1`, `minimumColumns: 1` 정책을 사용합니다.

기존 `@interactive-os/json-document-markdown-react`의 동일 export는 deprecated 재export로 유지합니다. 새 소비자는 Editing package에서 import합니다. [Sheet Usage](/demo/sheet)의 Markdown 탭과 [Bear](/applications/bear)가 이 경로를 사용합니다.
