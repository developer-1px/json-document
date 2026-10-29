# Record presentation

제품의 탐색·속성·결과를 표현하는 정본이다. `design-system.css`를 한 번 import한다.

- `StatusBadge({children, tone?: "neutral" | "active" | "success"})`: 읽기용 상태 표시. 상태 변경은 Choice/Select가 소유한다. 색은 공통 의미 토큰만 소비한다.
- `IssueRow({title, summary?, identifier?, status?, assignee?, updatedAt?, leading?, indicators?, selected?, disabled?, selection?, actions?, onSelect})`: 레코드 열기·일괄 선택·행별 명령을 구분한다. selected/onSelect는 현재 상세에 열린 대상, selection은 `{label, checked, onCheckedChange}` 형태의 일괄 작업 대상이다. actions에는 기존 Menu/Command를 조합하며 주 선택 버튼 밖의 별도 키보드 대상으로 렌더된다. title/summary/metadata에는 읽기 콘텐츠만 둔다. 선택·포커스는 SelectableItem, 체크는 Check 정본을 사용한다.
- `PropertyEditor({label, items})`: `items: {id, label, value: ReactNode}[]`. value에는 읽기용 값 또는 기존 Field/Choice/DatePicker를 주입한다. 편집 상태·저장·데이터 모델은 각 정본과 소비자가 소유한다.
- `ResultPanel({title, children?, empty?, actions?})`: 독립된 실행 결과의 제목·본문·후속 행동. children이 없으면 명시한 empty를 표시한다. 결과가 없는 것을 임의로 성공으로 표시하지 않는다.
- `ProductInspector({heading?, children, footer?, presentation?: "attached" | "floating", open?, onClose?, closeLabel?, ...HTMLAttributes})`: 붙은 사이드 패널과 floating 보조 작업 영역. body만 독립 스크롤하고 header/footer는 유지한다. Host가 위치·높이·너비를 제공한다. modal focus trap을 만들지 않는다. 기존 ProductShell도 같은 API를 사용한다.

[실제 Usage](/demo/ui-primitives#design-system-record-workflow)는 선택 항목·상태·속성 패널·결과를 조합한다.
[빌더 Usage](/applications/ui-builder?example=issue-feed&new=1)는 IssueRow에 레코드 역할을 매핑한다.

카탈로그는 props를 재현하는 fixture이며 일반 제품의 정보 구조를 강제하지 않는다. floating panel의 배치는 Host에서 지정하며 기존 floatingSurface의 경계·곡률·그림자를 재사용한다.

`Check.indeterminate`는 일부 항목만 선택된 사실을 native checkbox와 aria-checked="mixed"에
연결한다. 체크 상태와 현재 열린 대상은 독립적이며 일괄 선택이 업무 완료를 뜻하지 않는다.
`Menu.triggerPresentation`은 기존 Popover와 같은 label/icon 계약이다. 기본은 label이며
icon은 기존 Command의 아이콘 표현·접근성 이름·툴팁을 사용한다. 아이콘 메뉴는
트리거의 끝에 맞추어 열리며 별도 테두리 스타일을 만들지 않는다.
행은 카드로 반복 감싸지 않고 컬렉션의 기존 간격과 필요한 구분선으로 묶는다.


PropertyEditor는 RecordFacts(presentation="list")의 호환 API다. 별도 라벨·값 TSX나 CSS를 소유하지 않는다. ResultPanel은 ContentCard를 호출하는 호환 조합이다. 신규 소비자는 RecordFacts와 ContentCard를 직접 조합한다. [읽기·쓰기 매핑 Usage](data-presentation.md)를 참조한다.

ProductInspector에 `role="dialog"`와 이름을 주면 비모달 레코드 편집 경계로 사용한다. 열릴 때 첫 control로 focus를 옮기고 닫힐 때 원래 target으로 복귀하며 Escape는 onClose에 연결한다. Tab trap과 aria-modal은 만들지 않는다. Database.RecordPanel은 이를 조합하고 resource draft·validation·submit만 소유한다.
