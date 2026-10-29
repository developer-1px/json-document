# Record affordances

같은 색·타이포·간격을 공유하더라도 읽기·탐색·대화·변경·이력을 같은 박스로
표현하지 않는다. [실제 Usage](/demo/ui-primitives#design-system-domain-cards).

| 공개 API | 실제 관계·행동 | 경계 |
|---|---|---|
| ContentGroup | 가까운 공통 부모의 related/group/region 관계 | 기존 8/16/32 간격 |
| RecordSummary | 이름·종류·상태·맥락을 빠르게 읽기 | 간격, 선택은 IssueRow가 소유 |
| MessageThread | 실제 송수신 메시지와 별도 작성기 | 메시지 배경, 작성 단계의 선 |
| ChangeComparison | 실제 항목별 before/after | 같은 기준의 행·열과 선 |
| ActivityFeed presentation=timeline | 시간순 사건 | 아이콘 노드와 시간 연결선 |
| SemanticIcon | 대상 종류·행동·맥락 | 기존 Lucide 자산·16px |
| StateIndicator | unread/changed/running/overdue/complete 사실 | 접근성 이름과 작은 모양 |

SemanticIcon.kind는 등록된 의미 키만 받는다. label이 없으면 장식으로 aria-hidden이며
독립 의미가 있으면 label을 제공한다. StateIndicator는 label이 필수이고 role=img와
동일한 title을 가진다. 인디케이터가 버튼·전이·새로운 사실을 만들지 않는다.
StatusBadge.icon은 상태 이름을 빠르게 식별하는 기존 아이콘을 주입한다.
PriorityIndicator는 상태와 구분되는 Flag 아이콘과 실제 등급·문구를 사용한다.

RecordSummaryProps: title/leading/status/indicators/summary/metadata/headingLevel.
IssueRow의 leading/indicators도 같은 RecordSummary를 소비한다.
ThreadMessage: id/sender/body/direction, 선택적 dateTime/timeLabel. MessageThread는
messages와 선택적 children(작성기)을 받으며 초안을 outgoing 메시지로 위장하지 않는다.
ComparedField: id/label/before/after. ChangeComparison은 fields와 접근성 label을 받는다.
ContentGroup은 label/relationship/children을 받는다. 박스와 선은 기존 ContentCard 및
contentPresentation.divider로 조합한다. relationship 기본은 group이다.

경계 선택: 같은 대상을 이어 읽으면 간격, 독립 대상·과업이면 카드, 한 작업 내
동등한 단계 구분이면 선, 실제 시간 흐름이면 timeline이다. 같은 구획의 박스·선·
inset을 반복하지 않는다. MessageThread 소비자는 기존 chat-bubble.css도 import한다.

브라우저 확인은 실제 공개 API와 MOCK 데이터에 한정한다. 아이콘의 의미가 없는
자리에 추가하거나, 없는 읽음 상태·카운터·신뢰도를 창작하지 않는다.

ChangeComparison의 항목 열은 짧은 이름이고 두 값 열은 같은 비교 폭을 사용한다.
상태·메타 정보는 별도 근거 없이 같은 뜻의 아이콘과 아바타를 중복하지 않는다.


## 도메인 중립적인 구성

`RecordDetail({header, children, supplementary, actions})`는 상세의 제목·작업 본문·보조 정보·행동 위치를 소유한다. 읽기와 쓰기는 해당 본문에 공개 데이터 표현 또는 입력 API를 조합하며 상세가 별도 저장·편집 동작을 구현하지 않는다. `RecordSummary`는 요약 구조이며 컬렉션의 선택·정렬을 소유하지 않는다.

`RecordContext({icon?, label?, children?})`는 실제 맥락을 한 줄에 연결한다. 빈 값은 생략하고 아이콘은 등록 의미가 있을 때만 지정한다. `RecordFacts({items})`의 항목은 `{id,label,value}`이며 하나의 대상의 짝지은 속성이다. 값에는 날짜·수량·금액 등 실제 의미에 맞는 공개 표현을 조합한다. 여러 대상의 비교는 테이블이 담당한다.

`MessageThread.presentation`은 `conversation`(기본값, 실제 대화 버블) 또는 `correspondence`(본문과 답장)이다. 방향만으로 문의를 채팅으로 환원하지 않는다. 기존 `InquiryCard`는 correspondence를 기본으로 사용하는 필드 매핑 조합이다. Task/Approval/Activity/Evidence도 `RecordDetail`, Product는 독립 `ContentCard`와 `RecordFacts`를 사용한다. 도메인별 레이아웃·CSS를 복제하지 않는다.

Usage: [실제 슬롯과 옵션 비교](../../../site/src/routes/ui-primitives-catalog/DomainCardsSpecimen.tsx). 라이브 카탈로그 `/demo/ui-primitives#design-system-domain-cards`에서 같은 메시지 관계와 읽기·편집을 전환한다. Source는 이 패키지의 `src/record-affordances.tsx`와 연결된다.

## 콘텐츠와 조작의 지각적 구분

RecordDetail과 ContentCard는 actions 슬롯을 제공하지만 모든 조합의 콘텐츠·행동 간격을 32px로 강제하거나 매번 구분선을 추가하지 않습니다. 대상 옆 완료 체크, 값 옆 편집, 독립 행동 그룹은 실제 관계에 따라 조립합니다.

카탈로그의 Grid 셀 경계는 Host의 예제 배치 책임입니다. DomainCardsSpecimen은 예제 사이 가로선과 두 열 사이 세로선으로 샘플의 소속을 구분합니다. 샘플 내부의 면·외곽선·출처 구분선과는 별개이며, 카탈로그 배치를 고치려고 정본 컴포넌트 전체에 간격과 선을 강제하지 않습니다.

SemanticIcon은 event(CalendarDays), location(MapPin), participants(Users), email(Mail), file(FileText) 의미 키도 제공합니다. file은 독립 문서이고 attachment(Paperclip)는 다른 콘텐츠와의 첨부 관계입니다. 의미가 텍스트에 이미 있으면 아이콘은 장식으로 두고, 단독으로 정보를 전달하면 label을 제공합니다.


RecordFacts는 label과 presentation("grid" | "list", 기본 grid)을 받는다. grid는 요약 속성, list는 속성별 라벨·값 행이다. 좁은 list는 같은 정본 CSS에서 한 열로 바뀐다. PropertyEditor와 detail-list 어댑터는 이 API를 소비하며 별도 속성 목록을 구현하지 않는다.

각 RecordFact의 선택적인 `actions: ReactNode`는 그 값에 적용되는 변경·이동 명령을
연결한다. value는 읽기 표현을 유지하고 기존 Choice/Command/Menu를 actions에 조합한다.
정본은 라벨·값·명령의 정렬만 소유하며 검증·저장·상태 전이는 값의 소유자가 담당한다.
[속성 변경 Usage](/demo/ui-primitives#design-system-record-workflow)에서 상태 표시와
변경 컨트롤을 구별하고 같은 레코드의 목록·상세가 함께 바뀌는 것을 확인할 수 있다.
