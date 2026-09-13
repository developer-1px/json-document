# Sheet Hand

`@interactive-os/json-document-sheet`는 Hands 위치에서 셀 선택·편집 모드·키보드 이동·클립보드와 행/열 조작을 조합합니다. 문서, selection, History는 `SheetEditor`가 소유합니다.

```tsx
import { createSheetEditor } from '@interactive-os/json-document-editing';
import { SheetHand } from '@interactive-os/json-document-sheet';
const editor = createSheetEditor({columns: [{id: 'a', label: 'A'}], rows: [{id: '1', cells: {a: 'Hello'}}]});
<SheetHand editor={editor} />;
```

[Sheet Usage](/demo/sheet)와 [Bear](/applications/bear)는 같은 Hand를 소비합니다. Bear의 Markdown React adapter는 각 변경을 원문 교체로 번역하고 TextEditor의 Undo/Redo를 사용합니다.

- 클릭: 셀 선택. Shift+클릭/방향키: 범위 확장. Mod+클릭: 불연속 범위.
- 방향키: 셀 이동. Tab/Shift+Tab: 다음/이전 셀. 표 경계에서는 기본 Tab 흐름.
- F2/더블클릭: 편집. Enter는 아래 profile 정책을 따릅니다. 입력 중 방향키는 문자열 안에서 이동.
- 편집 중 Enter: 확정 후 아래 셀. Escape: 취소. Tab: 확정 후 다음 셀.
- 복사/잘라내기/붙여넣기: Sheet의 정본 TSV 및 structured clipboard 계약.
- 행/열 추가·삭제: 단일 History transaction. `editor.structure`의 capability가 헤더 행과 최소 열 수 제한을 제공합니다. `headerRow` prop은 제목 행의 표현만 결정합니다.

현재 Markdown 연결은 최상위 GFM 표에 적용됩니다. 셀의 inline Markdown을 원문으로 편집하며, 줄바꿈은 공백으로, 구분자 pipe는 escape하여 표 구조를 유지합니다. 수식 계산이나 파일 가져오기는 이 Hand의 기능이 아닙니다.

편집 여부에 관계없이 액션은 같은 위치의 아이콘으로 표시합니다. 입력창은 셀의 기존 글꼴·여백을 사용하며, 편집 진입·입력·취소는 표의 열 너비나 행 높이를 바꾸지 않습니다. 확정된 새 내용에 따른 표 크기 조정은 문서 변경으로 반영됩니다.

편집 초안은 Affordance의 `createRenameSession`, React 관찰은 `useRenameSession`, 키의 의미는 `cellEditingAffordance`, 입력 UI는 `Field`를 사용합니다. 확정 거절 시 초안과 위치를 유지합니다.

## 문서 표와 기존 Sheet의 입력 정책

`profile="spreadsheet-grid"`가 기본값입니다. Enter/Shift+Enter는 세로 이동, F2/더블클릭은 편집 시작입니다. `profile="document-table"`에서는 Enter로 편집을 시작합니다. 편집 중 Enter/Tab은 확정 후 이동하며 사각 선택은 유지됩니다. Sheet의 Ctrl+Enter는 초안을 선택된 셀들에 한 번에 채웁니다. Shift+Space/Control+Space로 행/열을 선택할 수 있습니다.

포인터 드래그, 행/열 헤더 선택, 채우기 핸들을 제공합니다. 채우기 핸들을 드래그하면 값 패턴을 반복하고 클릭 또는 키보드 활성화는 아래 한 행에 반복합니다. 수식 자동 보정 및 숫자 수열 생성은 이 Hand의 기본 채우기 계약에 포함되지 않습니다.

크기를 저장할 수 있는 editor에서는 행/열 경계 리사이즈를 제공합니다. 경계 핸들은 키보드로도 조작할 수 있으며 미리보기 후 확정할 때만 History에 기록합니다. GFM editor는 이 capability를 제공하지 않습니다.

`renderEditor`는 포맷 소유 편집기를 받을 수 있습니다. Markdown 소비자는 `MarkdownCellEditor`를 연결하므로 편집 전후 서식도 유지합니다. 단순 문자열은 기존 Field를 사용합니다. `renderCell`은 읽기 표현이며, 맞는 포맷의 `renderEditor`와 함께 사용합니다.

독립 Sheet 애플리케이션은 `coordinateHeaders`를 설정해 저장된 필드 label 대신 현재 순서의 A/B/C 헤더를 표시합니다. 열 삽입/삭제 후에도 좌표가 연속됩니다. 기본값은 필드 label을 유지하므로 문서 표와 기존 예제의 의미를 보존합니다. 실제 조합은 `/applications/sheet`에서 확인합니다.
