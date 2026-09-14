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

## 연속 입력과 구조 capability

`selection.navigate`는 `previous`/`next`/`up`/`down`으로 활성 셀을 이동합니다. 사각 범위 안에서는 Tab 순서(가로)와 Enter 순서(세로)로 순환합니다. `selection.ranges`는 유지되고 `selection.focus`는 그 안에서 독립적으로 움직입니다. 기존 anchor는 primary 범위의 anchor이며 focus는 더 이상 항상 primary 끝점과 같지 않습니다. 단순 셀 선택은 기존처럼 둘이 일치합니다.

`cell.commit`에 `preserveSelection:true`를 지정하면 연속 입력 중 선택을 유지합니다. `selection.row`, `selection.column`, `selection.range`는 헤더 및 드래그 선택의 명령입니다. 선택만 바꾸는 명령은 문서 History를 추가하지 않습니다.

`range.fill`은 source 사각형의 값 패턴을 target 사각형에 반복하고 한 번의 History transaction으로 확정합니다. `column.resize`와 `row.resize`는 각각 `width`와 `height`를 문서에 저장합니다. `editor.capabilities.resize`가 false면 UI와 직접 Intent 모두 이 작업을 허용하지 않습니다. Markdown adapter는 GFM에 크기 저장 문법이 없으므로 resize를 지원하지 않습니다.

`sheetNavigationTarget`은 위 연속 입력의 좌표 투영 API이며 순환 순서는 Selection의 `traverseGrid`에 위임합니다.

## 기본 Sheet 애플리케이션

`sheet.rename` Intent는 문서의 `name`을 History에 포함해 변경합니다. `structure.minimumRows`와 `minimumColumns`로 빈 축으로 인한 편집 불능을 방지합니다. `sheetSelectionSummary(editor)`는 활성 셀의 A1 좌표 및 선택/입력 셀 수를 제공합니다. `/applications/sheet`는 이 API와 SheetHand 및 Web 로컬 저장을 조합합니다.

## 내장 표와 부모 History

`createProjectedSheetEditor({source, read, write, sheet, mapSelection})`는 부모 source에서 표 값을 읽고, 표 명령의 결과만 부모에 기록합니다. 선택 이동은 부모를 쓰지 않습니다. Undo/Redo는 부모에게 위임합니다. `mapSelection`은 Markdown처럼 직렬화 후 위치 기반 ID가 바뀌는 형식에서 사용합니다.

`createObjectSheetEditor(parent, objectId)`는 Object의 `embedded-document` / `sheet/1` payload에 연결합니다. `createCanvasSheet(bounds, {rows?, columns?})`는 기본 4행·3열의 표 객체 초안을 생성합니다. `object.document` Intent는 내장 문서 값만 변경하므로 바깥 객체의 위치와 선택을 보존합니다. Markdown과 Canvas 모두 같은 projection lifecycle을 소비하며 개별 어댑터에는 읽기·쓰기·ID 변환만 남습니다.

`parseSheetClipboardText(text)`는 외부 탭 구분 표를 SheetClipboard로 읽습니다. CRLF, 인용부호로 감싼 탭/줄바꿈과 이중 인용부호를 처리하고 짧은 행은 빈 셀로 보충합니다. 닫히지 않은 인용부호는 거절합니다.
