# Domain cards

보편적인 어포던스를 도메인 필드에 연결하는 조합이다. 문의는 MessageThread와 별도
답변 작성기, 업무는 RecordSummary와 실제 완료 조작, 상품은 수량/금액 쌍, 승인은
ChangeComparison, 활동은 ActivityFeed timeline, 결과는 본문과 근거 경계다.
기존 토큰은 공유하지만 같은 박스나 속성 그리드를 강제하지 않는다.

| API | 정보 관계 | 읽기/쓰기/행동 | 피할 사용 |
|---|---|---|---|
| InquiryCard | title/body/customer/status/priority | children에 기존 EditableText, 실제 저장 | 본문을 짧은 속성 그리드에 넣기 |
| TaskCard | title/summary/assignee/due/status/priority | 상태는 읽기; actions는 실제 허용 명령 | 상태값만 보고 전이 추측 |
| ProductCard | title/identifier/category/quantity/price/note | 단위·통화로 읽기; 입력 정책은 Host | 여러 상품 비교를 카드로 대체 |
| ApprovalCard | title/change/requester/requestedAt/status | 실제 권한과 명령을 actions에 주입 | 모든 요청에 승인 버튼 만들기 |
| ActivityCard | title(행동)/actor/dateTime/timeLabel/subject/detail | 발생 기록 읽기 | 기록을 속성 입력으로 수정 |
| EvidenceCard | title/body/source | 실제 근거 읽기와 후속 행동 | 출처/신뢰도 창작 |

공통 DomainCardProps는 title/identifier/status/children/actions를 받는다. 제목/상태는
RecordSummary, 본문과 맥락은 해당 어포던스, actions는 관련 행동 영역이다.
status와 인물·날짜는 기존 API를 주입한다. unread/completed/overdue/changed는 실제 사실이며 표시가 행동을 대신하지 않는다. 헤더의 제목을 별도 heading으로 반복하지
않는다. ProductCard.quantity는 `{value:number|null,unit:string}`, price는
`{value:number|null,currency:string}`이며 0과 미정을 구분한다. note는 본문이다.
ActivityCard.dateTime과 timeLabel은 실제 발생 시각과 Host가 정한 표시이며 기한과
혼동하지 않는다. EvidenceCard.empty는 결과가 null/undefined일 때 표시한다.

[React Usage](/demo/ui-primitives#design-system-domain-cards)는 답변 저장/취소,
업무 시작, 입고 기록, 승인/반려, 근거 Popover를 MOCK 정책으로 조작한다.
[JSON Usage](/applications/ui-builder?example=domain-cards)는 같은 공개 렌더러와
record-card 필드 역할 계약을 통해 여섯 도메인·답변·수량·결정을 연결한다.

ContentCard.header는 제목과 상태/식별자를 이미 조합한 정본 헤더를 주입하는 슬롯이다.
header를 주입하면 title 기본 헤더를 반복하지 않는다. 내부 surface/inset은 한 겹이다.

InquiryCard.unread는 읽지 않은 문의 인디케이터다. TaskCard.completed/overdue는
완료·기한 초과의 실제 사실이고 onCompletedChange가 있을 때만 Check가 활성 조작이다.
ApprovalCard.comparison은 ComparedField[]이며 실제 before/after를 읽는다. changed는
내용 변경 사실이다. 과거 레코드에 이 필드가 없으면 단서를 창작하지 않는다.
[보편 어포던스와 경계 선택 계약](record-affordances.md)을 참고한다.


## 정본 조합 경계

도메인 API는 기존 사용자를 위한 필드·문구 매핑이며 공통 구조는 `RecordDetail`, `RecordSummary`, `RecordContext`, `RecordFacts`가 소유한다. Inquiry의 `presentation`은 correspondence(기본) / conversation이다. 문의라는 도메인 이름으로 대화 버블을 강제하지 않는다. [정본 API](record-affordances.md)를 직접 조합해 다른 도메인도 표현할 수 있다.

## 인물·일정·파일과 경계 선택

| 조합 | 요소가 그 자리에 있는 이유 | 경계 |
| --- | --- | --- |
| PersonCard | 이름이 식별의 중심, 직무·소속은 바로 아래 맥락, 연락처는 별도 확인 정보, 행동은 실제 필요할 때만 주입 | 정체성은 간격, 연락처 앞은 선; 외곽선·면 생략 |
| EventCard | 시간으로 먼저 판단한 뒤 제목, 장소·참석자를 확인하고 일정에 응답 | 옅은 면으로 독립 일정 한 단위; 외곽선 중복 생략 |
| FileCard | 파일명으로 식별, 본문으로 내용 판단, 형식·크기로 취급 방법 확인, 작성자·수정일로 출처 확인 | 외곽선은 문서 경계, 내부 선은 내용과 작성 맥락의 경계 |

PersonCardProps는 DomainCardProps와 name(Avatar 접근성 이름), src?, role?, organization?, contact?를 받습니다.
EventCardProps는 schedule(필수), location?, participants?, agenda?를 받습니다. 일시의 포맷과 시간대는 Host가 DateDisplay에 전달합니다.
FileCardProps는 format?, size?, updated?, preview?, owner?를 받습니다. 파일이나 연락 기능을 창작하지 않고 actions에 실제 기능만 주입합니다.

ContentCard.boundary는 outline(기본, 독립 콘텐츠의 외곽선) / surface(옅은 배경의 독립 콘텐츠)입니다. 기존 배경·경계·곡률·간격 토큰을 사용합니다. 경계가 필요 없으면 ContentCard를 감싸지 않고 RecordDetail/ContentGroup으로 조합합니다. 내부의 보조 정보 경계는 RecordDetail.supplementary가 소유합니다. 표면과 선을 도메인마다 다시 구현하지 않습니다.

React Usage의 인물·파일은 컨트롤 없는 읽기 조합입니다. 소개·내용은 본문으로 직접 읽으며 별도 열기 버튼을 만들지 않습니다. 일정 참석/취소와 업무·입고·승인은 카탈로그 수명의 MOCK입니다. JSON의 record-card도 presentation=person/event/file과 해당 실제 fieldId 역할로 같은 공개 컴포넌트를 사용합니다. 필수 역할과 허용 역할은 Object Document의 uiDomainCardCatalog가 소유합니다. 이 확장의 JSON 렌더 경로는 브라우저로 별도 검증하지 않았습니다.

## 콘텐츠와 컨트롤의 실제 Usage

카드 예제를 먼저 보여주고 구조·메시지 표현 전환 실험은 뒤에 배치합니다. 콘텐츠의 이름·본문·속성은 실제 읽는 순서로 유지하고, controls가 없으면 actions 영역도 렌더하지 않습니다. PersonCard/FileCard의 actions API는 필요한 소비자를 위해 유지하되 카탈로그에서 강제로 채우지 않습니다.

업무 시작은 대기 상태에서만 제공하며 진행 상태는 StatusBadge로 읽습니다. 완료 Check는 그 업무에 연결합니다. 상품의 입고 수량 입력과 입고 명령은 기존 Toolbar 안에서 하나의 조작 그룹으로 묶고 보이는 입력 라벨을 제공합니다. 재고 수량과 입고 수량은 각각 콘텐츠 값과 입력 값입니다. 기존 카드의 선·면·간격 토큰은 변경하지 않습니다.

Chrome에서 일정 응답, 업무 시작 후 버튼 제거와 상태 표시, 입고 후 재고 0→5, 승인 후 상태 변경을 확인했습니다. 서버 연결은 MOCK이며 자동 검사는 shared-worktree-dev 흐름에 따라 실행하지 않았습니다.

### 게슈탈트 기준 조립

예제끼리의 경계와 예제 내부의 콘텐츠·컨트롤 관계를 구분합니다. 카탈로그는 Grid 셀의 가로·세로 구분선과 셀 inset을 소유하고, 개별 컴포넌트는 자체 콘텐츠·속성·행동의 조합을 소유합니다. 모든 상세의 행동 앞에 일정 간격이나 선을 강제하지 않습니다.

## 콘텐츠별 단서와 읽기 영역

| 콘텐츠 | 구체적인 단서 | 혼동하지 않을 것 |
| --- | --- | --- |
| 인물 | Avatar, 이름·역할·소속, 이메일의 mail 아이콘 | 연락 값을 보고 임의로 온라인·재직 상태를 만들지 않음 |
| 일정 | 달력 아이콘과 실제 일시, 장소 pin·참석자 아이콘, 응답 상태 | 마감과 일정의 의미, 응답 상태와 응답 명령 |
| 파일·첨부 | file 아이콘으로 독립 문서 식별, paperclip으로 첨부 목록 진입; 형식·크기·작성자·수정일 | 파일 자체와 다른 콘텐츠에 속한 첨부 관계 |
| 문의 | unread 점, 접수 상태, 발신자, 받은 본문·첨부와 답변 초안 | 읽음과 업무 처리 완료 |
| 업무 | 완료 Check, flagged 깃발, 기한 초과, 담당자·마감·우선순위 | 중요 표시와 우선순위는 별개; 완료 후 깃발 보존 |
| 상품 | QuantityDisplay의 단위, MoneyDisplay의 통화, 0일 때 재고 없음 | 0과 미정; 0을 임의로 판매 불가라고 단정하지 않음 |
| 승인·기록·결과 | 변경 전후 비교, 변경 사실, 행위자·시각의 timeline, 실제 source | 출처 아이콘을 신뢰도 보증으로 취급하지 않음 |

TaskCard.flagged?: boolean은 읽기 사실이며 실제 변경 명령을 만들지 않습니다. JSON record-card의 task flaggedFieldId는 실제 checkbox 필드만 허용합니다. Canvas는 같은 TaskCard API를 소비합니다. SemanticIcon의 event/location/participants/email/file 키는 각각 CalendarDays/MapPin/Users/Mail/FileText를 사용합니다. 기존 attachment는 Paperclip으로 유지합니다. 인물의 contact가 항상 이메일이라고 추정하지 않으며 Usage가 실제 이메일 값에 icon=email을 조합합니다.

카탈로그의 대상 식별(인물·일정·문서)은 독립 단위 세 열, 업무 처리의 문의·업무는 두 열이고 변경 비교는 두 열을 차지합니다. 수량·활동은 나란히, 결과와 근거는 넓은 읽기 영역입니다. 셀 경계는 Host의 구분선, 컴포넌트 내부의 면·외곽선·본문/근거 경계는 정본의 책임으로 분리합니다. 새 토큰은 추가하지 않았습니다.

Chrome에서 첨부 2개의 실제 파일명·형식·크기, 참석 응답, 업무 완료 후 깃발 보존과 기한 초과 제거, 입고 0→5에 따른 재고 없음 배지 제거를 확인했습니다. JSON flagged 연결 경로는 소스에 반영했으나 별도 브라우저 실행 검증은 하지 않았습니다. 예제는 MOCK이며 자동 검사는 shared-worktree-dev 흐름에 따라 실행하지 않았습니다.

참고: [Apple Reminders의 중요 표시·우선순위 구분](https://support.apple.com/en-qa/guide/reminders/remndc729e28/mac), [Calendar의 초대 대상](https://support.apple.com/en-bh/guide/calendar/icl1016/mac). 이 사례로 웹 배치나 모든 도메인의 시각 규칙을 강제하지 않습니다.
