# 데이터 표현과 읽기·쓰기

UI Primitives의 첫 선택 기준은 데이터의 의미와 사용자 과업이다. `string`이라서
Field를, `date`라서 DatePicker를 항상 표시하지 않는다. 수정 권한은 현재 편집 상태와
다르다. 기본은 읽기이고 수정이 허용된 값만 승인된 어포던스로 편집에 진입한다.

## 정본 API

`dataPresentationCatalog`는 데이터 의미·schemaRoles·읽기 API·쓰기 API·빌더 component
ID·진입 방식·반영 정책을 선언한다. `getDataPresentation(role: DataPresentationRole)`로
같은 계약을 읽는다. UI를 자동 생성하거나 도메인 스키마를 정의하는 모델이 아니다.
Host는 실제 도메인의 관계·단위·권한을 읽어 계약에 매핑한다. 타입만으로 의미를 추론하지 않는다.

`FieldPresentation({label, mode: "read" | "edit", read, edit, onEditRequest?})`는 같은
필드의 표현 경계다. read와 edit는 실제 정본 컴포넌트를 주입한다. onEditRequest가
없으면 읽기 전용이고 수정 버튼이 없다. 편집 진입 시 입력을, 읽기 복귀 시 수정
trigger를 포커스한다. draft·검증·저장 명령은 입력 및 도메인 소유자가 맡는다.

| 데이터 의미 | 스키마 역할 | 읽기 | 쓰기 | 반영 |
|---|---|---|---|---|
| 대상 이름 | title | PageHeader / heading | Field | 명시적 저장 또는 제품 정책 |
| 긴 설명 | description/body | contentPresentation.body | Field multiline | 저장·취소 흐름은 EditableText 조합 |
| 번호 | identifier | 보조 식별자 | 일반 수정 없음 | 별도 도메인 명령 |
| 처리 상태 | status | StatusBadge | Choice | 상태 전이·권한 검증 |
| 우선순위 | priority | PriorityIndicator | Choice | 처리 순서 보존 |
| 심각도 | severity | StatusBadge + 의미 아이콘 | Choice | 실제 영향도; 우선순위와 분리 |
| 인물 관계 | assignee/author/approver | PersonIdentity | PeoplePicker | 실제 person ID |
| 업무 날짜 | dueDate/scheduledDate/occurredAt | DateDisplay | Calendar DatePicker/Field | 시간대·날짜 의미 |
| 기간 | dateRange | DateRangeDisplay | Calendar DateRangePicker | 두 값을 함께 검증 |
| 수량 | quantity/stock | QuantityDisplay | NumberField | 0·빈 값·범위 구분 |
| 금액 | money/price | MoneyDisplay | NumberField + precision/unit | 정밀도·통화 보존; 자동 반올림 없음 |
| 분류 | category/type | Tag | Choice | 단일 선택 |
| 복수 분류 | tags | TagGroup | TagPicker | 선택 ID 배열; 문서 옵션 저장 |
| 대상 속성 | properties | RecordFacts | RecordFacts + 기존 입력 | 필드별 정책 |
| 목록 탐색 | collection/recordList | IssueRow 목록 | 선택 대상 Field | 선택 ID 유지 |
| 같은 필드 비교 | comparison/table | DatabaseHand readOnly | DatabaseHand | 같은 행의 관계·표 편집 정본 |
| 변경 기록 | activity/events | ActivityFeed | CommentComposer | 새 기록 추가; 과거 기록 보존 |
| 실행 결과 | result/briefing | ContentCard + 결과 본문 | 생성 명령 또는 허용된 수정 | 실제 실행 상태 |

NumberField는 정확한 직접 입력, ValueInput은 상대적 증감·범위 선택이다. NumberField는 빈 값(null)과 0을 구분하고 잘못된 초안을 보존한다. min/max/precision을 벗어난 값은 반영하지 않는다. unit과 통화 정밀도 정책은 도메인이 주입한다. 현재 Database 숫자 필드는 null을 저장하지 않으므로 바인딩된 숫자는 필수 입력으로 검증하고 빈 값으로 0을 저장하지 않는다.

TagGroup은 읽기, TagPicker는 포함·제외 조작이다. 빌더 TagPicker는 props.options.items의 {id,label}와 selectedIds 문서 옵션을 저장한다. Database 다중 관계 바인딩이나 미디어/Rich Content까지 지원한다고 설명하지 않는다. 인물 후보는 props.people.items의 실제 ID와 이름을 구분하며 동명이인은 description으로 구별한다.

날짜 입력의 정본과 API는 [Calendar date controls](../../json-document-calendar/docs/date-controls.md)에
있다. 값을 기록하는 모델·관계·명령은 해당 Document/Editing 소유자에 유지한다.

[Usage](/demo/ui-primitives#design-system-data-presentation)에서 같은 업무 제목·마감일·
상태·담당자를 읽고 수정·저장·취소한다. 날짜는 읽기에서 input으로 보이지 않고,
번호는 읽기 전용이다. 이 표도 dataPresentationCatalog를 직접 소비한다.

빌더 에이전트는 Host가 `createUIBuilderCatalogTools(editor, {dataPresentations})`에
같은 공개 카탈로그를 주입해 읽는다. Editing 패키지는 React primitive에 의존하지 않는다.

## 실제 컴포넌트 비교 카탈로그

18개 매핑 행마다 실제 읽기·쓰기 컴포넌트를 나란히 렌더링합니다. 샘플을 수정하면
같은 행의 읽기 표현도 갱신됩니다. 읽기 전용 식별자·결과에는 가짜 입력을 제공하지
않습니다. 상단 mode 예제는 저장·취소를, 하단 비교 예제는 표현 차이를 보여줍니다.
기존 Product workflow와 Record workflow의 담당자도 읽기를 기본으로 사용하고
수정 진입→선택/입력→저장·취소로 전환합니다.

## 카탈로그 페이지 탐색

카탈로그는 전체 샘플을 길게 펼치지 않고 상단 범주 탭과 데이터 의미 탐색으로
구성합니다. 데이터 표현에서는 검색·의미 선택 후 해당 역할의 실제 읽기/쓰기 비교,
진입·반영 기준, 저장·취소 예제를 보여줍니다. 범주 전환 시 예제 상태는 유지됩니다.
선택 의미는 `?data=person`처럼 URL에 보존하며 범주는 기존 section hash를 사용합니다.

## 카탈로그 상세의 읽기 구조

데이터 표현 Usage는 탐색과 상세를 세로 경계로 구분합니다. 탐색은 이름과 설명 / 상태와 관계 / 시간과 수치 / 정보 묶음으로 나눕니다. 역할과 컴포넌트 매핑의 정본은 dataPresentationCatalog이며, 이 그룹은 사이트 탐색 정책입니다.

상세는 의미·스키마 역할 → 읽기/쓰기 비교 → 실제 편집 흐름 → 적용 기준 순서입니다. 비교 영역은 선으로 양쪽을 구분하며 좁은 화면에서는 위아래로 배치합니다. 컴포넌트 이름은 각 예제의 보조 정보입니다. 기존 FieldPresentation의 편집·저장·취소 계약을 유지하고, 같은 fixture 값을 비교와 편집 흐름이 공유합니다. 서로 다른 상태 저장소 때문에 값과 StatusBadge tone이 달라지는 조합을 없앴습니다. 상태/제목/날짜/인물의 편집 흐름이 지원됩니다. 역할을 전환하면 해당 샘플은 초기화되며 실제 제품 데이터 저장을 뜻하지 않습니다.

Chrome에서 쓰기 상태 변경→읽기와 편집 흐름 동기화, 취소 시 기존 값 유지, 저장 후 양쪽 값 동기화, 제목 편집과 검색 결과 없음/복구를 확인했습니다. 1280px에서 문서 가로 넘침이 없음을 확인했습니다. 자동 검사는 shared-worktree-dev 흐름에 따라 실행하지 않았습니다.


## 구현과 조합의 경계

- `PropertyEditor`는 호환 API이며 `RecordFacts(presentation="list")`로 위임한다. 속성 목록의 TSX·반응형 CSS는 RecordFacts 한 곳이 소유한다. `detail-list`의 컬렉션 어댑터도 같은 API를 사용한다.
- `ResultPanel`/`result-panel`은 기존 문서의 ContentCard 조합 이름이다. 신규 생성에는 `card`와 결과 본문을 연결한다. 별도 표면 종류로 세지 않는다.
- `CommentComposer` 빌더 ID는 `comment-composer`다. `targetId`로 기존 `activity-feed`, `actor`로 작성자를 지정한다. Editing의 `appendUIBuilderActivity`가 새 ID·실제 시각으로 entries.items에 추가하며 원래 기록을 보존한다. DB 행 생성이나 외부 서비스 댓글 전송과는 다른 문서 내 기록 계약이다.
- 목록 탐색, 표 비교, 작업 공간은 다른 범위다. collection 예시는 목록 선택과 선택 대상 수정, comparison 예시는 실제 DatabaseHand 셀 편집을 시연한다. RecordWorkspace는 상위 화면 조합에서 사용한다.

[직접 숫자 입력 Usage](/demo/ui-primitives?data=quantity#design-system-data-presentation) · [태그 Usage](/demo/ui-primitives?data=tags#design-system-data-presentation) · [표 비교 Usage](/demo/ui-primitives?data=comparison#design-system-data-presentation) · [빌더 직렬화 Usage](/applications/ui-builder?example=catalog)

EditableText는 FieldPresentation의 heading 슬롯·편집 진입·포커스 복귀를 사용한다. draft·identity 변경·저장/취소는 EditableText가 소유한다. 전환용 pencil과 focus lifecycle을 다시 구현하지 않는다.
