# 하나의 Sheet 편집 계약

Sheet Document 패키지가 공통 스키마와 생성 책임을 소유합니다. Editing의 Sheet 타입
export는 같은 타입을 재노출합니다. Bear·Canvas·독립 Sheet에 별도 문서 모델을 두지 않습니다.

`planSheetIntent(document, selection, intent, options)`는 변경 계획과 다음 선택을
계산하며 입력 문서 변경, 구독 알림, History 기록을 하지 않습니다. 내부 공통 명령
해석은 독립 SheetEditor와 부모 문서 연결도 함께 사용합니다. 선택 전이는 빈 operations를
반환하고 구조 정책·크기 저장 지원 여부도 같은 경로에서 검사합니다.

```ts
import {createSheetDocument} from "@interactive-os/json-document-sheet-document";
import {createSheetEditor, planSheetIntent} from "@interactive-os/json-document-editing";
const value = createSheetDocument();
const editor = createSheetEditor(value);
const planned = planSheetIntent(value, editor.snapshot.selection,
  {type: "cell.commit", rowId: "row-1", columnId: "column-1", value: "hello"});
```

`createProjectedSheetEditor`는 read/write/subscribe와 부모 Undo/Redo를 공통 편집 로직에
연결합니다. 임시 자식 편집기나 자식 History를 생성하지 않습니다. 선택은 저장하지 않고
문서 변경은 검증 후 write 한 번으로 전달합니다. 실패한 write는 다음 선택을 적용하지
않습니다. write 구현은 부모 문서에 원자적으로 반영하고 실패 시 원본을 유지해야 합니다.
read는 부모 snapshot.value의 변경에 맞춰 갱신됩니다.

`availability`는 ready/missing/invalid/readonly입니다. read의 null은 누락을 뜻하고,
나머지 값은 Sheet 정본 스키마로 검증합니다. readOnly 정책은 변경을 막되 선택·복사는
허용합니다. SheetHand는 상태를 표시하고 편집 진입을 막으며 열린 draft를 취소합니다.

Markdown 연결은 표와 원문 사이의 변환, Object 연결은 내장 Sheet payload 접근을 소유합니다.
Canvas가 바깥 객체 위치·크기와 활성화 경계를 소유하고 Sheet가 내부 셀과 행·열 편집을
소유합니다. 입력 프로파일은 Affordance, 표현과 편집 필드는 Hand의 계약으로 교체합니다.

Usage: [표 편집](/demo/sheet), [Sheet 앱](/applications/sheet), [Canvas](/demo/canvas).

## View의 문서 연결

`SheetEditor.createView(options)`는 원본 편집기에 연결된 SheetEditor를 반환합니다.
원본은 문서와 History의 단일 소유자이고 View는 선택과 표시 순서를 소유합니다.
View에서 변경하면 구독 중인 다른 View에 동기적으로 반영됩니다. 선택 이동은 원본
문서나 다른 View의 선택을 바꾸지 않습니다. 같은 셀을 다른 View에서 수정한 경우
History 그룹을 분리하여 각각 되돌립니다.

`rowOrder`/`columnOrder`는 표시 우선순위인 고유 ID 배열입니다. 중복·빈 ID는 거절하고,
문서에서 사라진 ID는 제외하며 목록에 없는 새 ID는 문서 순서로 뒤에 붙입니다.
필터링이 아니므로 모든 현재 행·열을 포함합니다. `grid`와 `projectSheetGrid`는 문서
값을 복제하지 않고 표시 순서와 topology를 제공합니다. 초기 순서 옵션은 불변 값으로
사용합니다. 구조 삽입의 index는 문서 index이며 View 정렬 자체를 변경하지 않습니다.

`readOnly`는 변경 실행 경계에서 적용합니다. 자식 View가 부모의 읽기 전용 상태를
해제할 수 없고 Undo/Redo도 차단합니다. 선택·복사는 계속 가능합니다.

Usage: [하나의 표, 두 View](/demo/sheet-views).
