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

`profile="spreadsheet-grid"`가 기본값입니다. Mac에서는 `spreadsheet-mac` 정책이 자동 적용되어 Enter로 편집을 시작합니다. 다른 플랫폼에서는 Enter/Shift+Enter는 세로 이동, F2/더블클릭은 편집 시작입니다. `profile="spreadsheet-mac"`으로 명시하거나 `GridEditingProfile` 객체로 정책을 고정할 수도 있습니다. `profile="document-table"`에서는 Enter로 편집을 시작합니다. 편집 중 Enter/Tab은 확정 후 이동하며 사각 선택은 유지됩니다. Sheet의 Ctrl+Enter는 초안을 선택된 셀들에 한 번에 채웁니다. Shift+Space/Control+Space로 행/열을 선택할 수 있습니다.

포인터 드래그, 행/열 헤더 선택, 채우기 핸들을 제공합니다. 채우기 핸들을 드래그하면 값 패턴을 반복하고 클릭 또는 키보드 활성화는 아래 한 행에 반복합니다. 수식 자동 보정 및 숫자 수열 생성은 이 Hand의 기본 채우기 계약에 포함되지 않습니다.

크기를 저장할 수 있는 editor에서는 행/열 경계 리사이즈를 제공합니다. 경계 핸들은 키보드로도 조작할 수 있으며 미리보기 후 확정할 때만 History에 기록합니다. GFM editor는 이 capability를 제공하지 않습니다.

`renderEditor`는 포맷 소유 편집기를 받을 수 있습니다. Markdown 소비자는 `MarkdownCellEditor`를 연결하므로 편집 전후 서식도 유지합니다. 단순 문자열은 기존 Field를 사용합니다. `renderCell`은 읽기 표현이며, 맞는 포맷의 `renderEditor`와 함께 사용합니다.

독립 Sheet 애플리케이션은 `coordinateHeaders`를 설정해 저장된 필드 label 대신 현재 순서의 A/B/C 헤더를 표시합니다. 열 삽입/삭제 후에도 좌표가 연속됩니다. 기본값은 필드 label을 유지하므로 문서 표와 기존 예제의 의미를 보존합니다. 실제 조합은 `/applications/sheet`에서 확인합니다.

`profile`에는 기본 이름 또는 Affordance의 `GridEditingProfile` 값을 전달할 수 있습니다. `SheetCellEditorProps.initialSelection`을 포맷 편집기가 소비하므로 직접 타이핑의 첫 글자가 전체 선택되어 다음 글자에 덮이지 않습니다. `onDeactivate`는 초안이 없는 Escape에서 호출됩니다. Canvas는 이를 바깥 객체 포커스에 연결하고 Bear는 기존 `onExit` 경계를 유지합니다.

표 클립보드는 Web의 `sheetClipboardRepresentations`로 내부 JSON과 외부 텍스트를 함께 처리합니다. 행열 헤더 선택 후에는 활성 셀로 포커스를 넘겨 키보드 이동을 이어갑니다. 확대·축소된 DOM/SVG에 있을 때 리사이즈는 Web의 layout 좌표 변환을 소비합니다.

## 공유 문서와 독립 View

```live-demo
/demo/sheet-views
```

[두 View Usage](/demo/sheet-views)는 하나의 SheetEditor에서 `createView()`를 두 번 호출합니다.
값·변경·History는 원본 편집기가 소유하고, 선택·편집 draft·포커스·스크롤과 표시 순서는
각 View/Hand에 남습니다. Host가 문서를 복제하거나 양방향 subscribe 동기화를 구현하지 않습니다.

```ts
const source = createSheetEditor(document);
const left = source.createView();
const right = source.createView({rowOrder: ["gamma", "beta", "alpha"], columnOrder: ["owner", "status", "name"]});
// <SheetHand editor={left} profile="spreadsheet-grid" />
// <SheetHand editor={right} profile="document-table" />
```

Hand는 `editor.grid`의 행·열 순서를 렌더하고 모든 명령은 같은 topology를 사용합니다.
행·열 순서는 ID 목록이며 삭제된 ID는 빠지고 새 ID는 문서 순서로 뒤에 붙습니다.
필터·정렬 식·병합 셀·원격 참조 저장 형식은 이 계약에 포함하지 않습니다.

## Sheet Hands 지원 조합 · RC 범위

| 책임 | 정본과 지원 계약 |
| --- | --- |
| Schema | Sheet Document의 공통 스키마, 행·열 ID, JSON 셀, 크기 검증 |
| Topology / Selection | Editing의 GridTopology와 ID 기반 직사각형 범위, View별 독립 선택 |
| Intent / Planning | SheetIntent와 planSheetIntent; 표시 순서에서 문서 ID로 적용 |
| Clipboard | primary 직사각형, 현재 View 순서, native JSON/외부 TSV |
| History | 원본 문서/부모 편집기가 한 번 기록; View 사이의 편집 그룹 분리 |
| Readonly | 선택·복사는 허용; 수정·붙여넣기·잘라내기·구조·Undo/Redo 차단 |
| Affordance | document-table의 Enter 편집, spreadsheet-grid의 Enter 이동 |
| Hand | 동일 SheetHand와 renderCell/renderEditor 슬롯; 편집 전후 형태 유지 |

독립 Sheet, Markdown 표 편집기, Canvas 내장 표 편집기에서 같은 `createView` 계약을
사용할 수 있습니다. 별도로 저장된 Markdown과 Canvas 문서가 자동으로 같은 데이터가
되는 것은 아닙니다. Markdown의 행·열 ID는 현재 위치에서 투영되므로 영속 ID 참조
프로파일을 제공한다는 의미가 아닙니다. Markdown 구조 변경을 가로질러 같은 논리 셀을
추적하는 영속 ID 계약은 제공하지 않습니다. 전체 Official Hands SDK의 Stable 선언도 아닙니다.
