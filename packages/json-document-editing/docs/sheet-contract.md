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
