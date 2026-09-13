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
- Enter/F2/더블클릭: 편집. 입력 중 방향키는 문자열 안에서 이동.
- 편집 중 Enter: 확정 후 아래 셀. Escape: 취소. Tab: 확정 후 다음 셀.
- 복사/잘라내기/붙여넣기: Sheet의 정본 TSV 및 structured clipboard 계약.
- 행/열 추가·삭제: 단일 History transaction. `editor.structure`의 capability가 헤더 행과 최소 열 수 제한을 제공합니다. `headerRow` prop은 제목 행의 표현만 결정합니다.

현재 Markdown 연결은 최상위 GFM 표에 적용됩니다. 셀의 inline Markdown을 원문으로 편집하며, 줄바꿈은 공백으로, 구분자 pipe는 escape하여 표 구조를 유지합니다. 수식 계산이나 파일 가져오기는 이 Hand의 기능이 아닙니다.

편집 여부에 관계없이 액션은 같은 위치의 아이콘으로 표시합니다. 입력창은 셀의 기존 글꼴·여백을 사용하며, 편집 진입·입력·취소는 표의 열 너비나 행 높이를 바꾸지 않습니다. 확정된 새 내용에 따른 표 크기 조정은 문서 변경으로 반영됩니다.

편집 초안은 Affordance의 `createRenameSession`, React 관찰은 `useRenameSession`, 키의 의미는 `cellEditingAffordance`, 입력 UI는 `Field`를 사용합니다. 확정 거절 시 초안과 위치를 유지합니다.
