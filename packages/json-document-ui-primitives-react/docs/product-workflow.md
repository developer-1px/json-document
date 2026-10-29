# Product workflow catalog

공통 design-system.css와 의미 토큰을 사용하는 제품 컴포넌트다. 기존 API를 그대로
사용하는 검색(Search), 상태 변경(Choice), 날짜 입력(DatePicker), 읽기/편집(EditableText),
주요 행동(Command), 목록·상세(RecordWorkspace), 비모달 패널(ProductInspector)은
중복 구현하지 않는다.

| 콘텐츠·행동 | 정본 API | 경계 |
|---|---|---|
| 페이지·선택 대상 헤더 | PageHeader | title/description/identifier/status/actions/level/titleRole |
| 사이드 탐색 | SidebarNavigation | groups/currentId; href 또는 명시적 onNavigate |
| 적용 필터 | FilterBar | filters/remove/reset/resultCount; 실제 쿼리는 데이터 소유자 |
| 업무 항목 | IssueRow | 제목/요약/상태/담당자/시간; SelectableItem 선택 |
| 읽기 상태 | StatusBadge | neutral/active/success/attention |
| 우선순위 | PriorityIndicator | low/normal/high와 실제 label |
| 사람 식별 | Avatar, PersonIdentity | name/src; 이미지 실패 시 이니셜 |
| 사람 검색·선택 | PeoplePicker | people/value/onValueChange; Popover/useListbox |
| 읽기 날짜 | DateDisplay | value/children/overdue; Host가 날짜 의미와 표시 결정 |
| 속성 묶음 | RecordFacts | list/grid; items의 label/value; 기존 입력 주입 |
| 속성·보조 영역 | ProductInspector | attached/floating, header/body/footer/open/close |
| 작업 메모 제출 | CommentComposer | 명시적 onSubmit; 실패 시 draft 유지 |
| 설명이 있는 방향 선택 | Choice | option.description; 기존 radio 키보드 |
| 진행·취소·실패·재시도 | ExecutionFeedback | state/label/onCancel/onRetry |
| 오류·상태 안내 | InlineAlert | info/error/success; 복구 actions |
| 독립 콘텐츠 | ContentCard | title/body/empty/actions; 일반 section과 구분 |
| 독립 결과 | ContentCard 조합 | 실제 결과 본문과 후속 행동; ResultPanel은 호환 API |
| 단계 상태 | Stepper | 실제 steps와 pending/current/complete |
| 실제 변경 기록 | ActivityFeed | actor/action/dateTime/timeLabel/detail |
| 빈 결과·첫 사용 | EmptyState | 원인과 다음 행동; 로딩과 구분 |
| 일시적 확인 | Toast | message/onDismiss; Host가 위치·수명 결정 |

API는 위 props와 공개 TypeScript interface를 함께 제공한다. 사용자 문자열은 React
텍스트이며 임의 HTML/CSS/code로 평가하지 않는다. ActivityFeed는 입력한 기록만
표시한다. Stepper는 읽기용이며 이동이나 실행 capability를 만들지 않는다.

[통합 Usage](/demo/ui-primitives#design-system-product-workflow)는 MOCK 업무로 검색,
선택, 담당자 검색, 필터 초기화, 브리핑 실패/재시도/성공/취소, 메모와 활동을 조작한다.
업무별 활동 기록은 서로 분리한다.
MOCK 응답 버튼은 작업 화면 밖의 fixture 완료 포트이며 실행 시간이나 결과를 조작하는
숨은 타이머가 없다. 실제 제품에서는 서버 요청의 결과를 state로 전달한다.

PeoplePicker는 검색 입력 후 후보 listbox에서 ArrowDown/Up 및 Enter로 선택한다.
Popover의 Escape와 포커스 복귀를 사용한다. disabled는 Popover trigger를 막는다.
설명이 있는 Choice는 기존 radio keyboard를 보존한다.

Search.inputProps는 기존 입력의 onKeyDown/aria-controls/aria-activedescendant 연결을 허용합니다. PeoplePicker는 검색 입력에서 ArrowDown/Up·Enter를 useListbox로 전달하며 검색 문자 입력을 가로채지 않습니다.

CommentComposer.identity는 업무별 작성 초안을 구분한다. 다른 업무로 이동하면 해당 업무의 초안을 표시하고 돌아오면 이전 미제출 내용이 복원된다. submit 성공 시 제출한 업무의 초안만 비우고 오류는 해당 업무에 유지한다.

## 초기 브라우저 확인 범위

통합 MOCK 화면에서 검색 결과 없음·조건 초기화·필터 제거, 담당자 검색 입력의
ArrowDown/Enter 선택, 실행 실패·재시도·취소·성공, 단계 변경, 메모 제출, 업무별
활동 분리와 미제출 초안 복원을 확인했다. 실제 서버 요청은 이 fixture의 범위가
아니며 반환된 실행 상태는 공개 API로 연결한다. 모바일 viewport·다크 테마·전체
기존 소비자 회귀는 이번 shared-worktree 실험에서 확인하지 않았다.

## 콘텐츠 표면의 선택과 조합

연속 읽기/쓰기는 contentPresentation.group, 독립 콘텐츠/과업은 ContentCard,
선택할 대상 요약은 IssueRow, 보조 속성/작업은 ProductInspector를 사용한다.
ContentCard는 제목·본문·행동·빈 상태를 소유하고 선택/이동 동작은 주입한 컨트롤이
소유한다. 본문과 행동은 각각 한 번 렌더된다. 본문 gap은 group(16px), 제목과
본문은 related(8px), 본문과 행동은 group(16px)이며 inset은 한 겹만 사용한다.
[동일 데이터의 실제 Usage](/demo/ui-primitives#design-system-content)를 비교한다.
빌더 card는 끝의 actionCount 자식을 actions에 전달한다. 같은 책임의 별도 박스
구현을 만들지 않는다.

[도메인 카드](domain-cards.md)는 문의/업무/상품/승인/활동/결과의 필드 관계를 기존 표면으로 조합합니다.

[보편 어포던스와 경계](record-affordances.md)는 메시지·작업·변경·이력을 같은 박스로 평탄화하지 않는 계약과 아이콘/배지/인디케이터의 역할을 정의합니다.


## 작업 단계에 따른 중심

`PageHeader.titleRole`은 `section`(기본, 기존 content-heading) 또는 `primary`(기존 content-title)로 제목의 정보 위계를 선택합니다. HTML 제목 수준은 `level`로 별도로 정합니다. 새 크기·간격·색 토큰을 만들지 않습니다. 긴 primary 제목은 단어와 줄의 균형을 보존하며 행동 슬롯은 제목 옆에 유지합니다.

통합 Usage의 요청 단계는 선택한 요청과 다음 행동, 결과 단계는 작성된 문서와 기록 행동에 집중합니다. `RecordWorkspace`의 같은 상세 슬롯을 사용하고 원래 요청은 공개 `DisclosureButton`으로 다시 확인합니다. 보조 속성과 빈 메모 입력은 필요할 때 펼칩니다. 요청 내용·결과·활동·초안은 다른 업무로 전환해도 서로 섞이지 않습니다. 여기의 요청 응답과 기록은 MOCK 정책이며 실제 서버나 AI 생성 성능을 입증하지 않습니다.

결과는 추가 카드로 아래에 쌓지 않습니다. 실제 읽기 순서를 가진 계획은 기존 ordered content list로, 답변 초안은 연속 본문으로 표현합니다. 작성 중인 업무에는 실제 run 상태 인디케이터를, 결과가 있는 업무에는 문서 아이콘을 표시합니다. 업무 완료 상태로 오해할 check를 추가하지 않습니다.


## 2026-10-15 스크린샷 검토

같은 MOCK 입력과 2560×1267 화면에서 변경 전·요청 읽기·결과 읽기를 촬영해 비교했습니다. 요청과 결과가 하나의 주 제목과 다음 행동으로 읽히고, 속성·미제출 메모·원래 요청·활동이 필요한 때만 펼쳐지는지 확인했습니다. 1280px 결과 화면과 600/390px 상세 화면도 확인했습니다. 발견한 단계 번호 누락, 제목의 한 글자 줄바꿈, 행동 슬롯의 아래 밀림, 세로 목록의 남은 오른쪽 경계를 정본에서 수정했습니다.

실제 Chrome에서 실패·재시도·취소, 두 업무의 독립 요청, 결과 종류의 보존, 계획/답변 기록, 펼친 원래 요청, 업무·단계 전환 후 메모 초안 복원과 활동 건수/펼침을 확인했습니다. 서버와 AI 생성은 MOCK이며 저장은 fixture 수명 안의 상태입니다. 작은 화면의 바깥 사이트 탐색 메뉴가 길게 펼쳐지는 문제는 제품 작업 영역과 별개의 미해결 사항입니다. 전체 소비자 회귀와 자동 검사는 실행하지 않았습니다.

### 후속 10회 시각 검토

| 회차 | 실제 화면에서 확인한 대상 | 판단과 반영 |
| --- | --- | --- |
| 1 | 요청 읽기 | 제목·본문·다음 행동의 위계 유지 |
| 2 | 속성 패널을 연 긴 제목 | PageHeader 제목과 상태 배지가 별도 줄로 분리되지 않게 하고 첫 기준선 정렬 |
| 3 | 빈 메모 입력 | CommentComposer의 기존 Field에 label과 같은 placeholder 제공; 접근성 이름 유지 |
| 4 | 검색 결과 없음 | 복구 행동과 기존 선택 상세 보존 유지 |
| 5 | 작성 중 | 실제 진행 표식과 취소 유지 |
| 6 | 실패 | 중복 생성 버튼 없이 재시도 한 곳 유지 |
| 7 | 계획 결과 | 번호와 단계 제목·설명의 읽기 순서 유지 |
| 8 | 기록 후 활동 펼침 | 원문은 명시적으로 펼칠 때만 반복; 기본 접힘 유지 |
| 9 | 답변 초안 | 대화 말풍선 없이 연속 본문 유지; 원래 요청·메모·활동을 group 간격으로 묶음 |
| 10 | 390px 상세 | 문서 가로 넘침 없음 확인; 바깥 카탈로그 탐색이 화면을 많이 차지하는 문제는 잔존 |

보조 공개 영역끼리는 기존 group(16px), 결과 본문과 보조 영역 사이는 region(32px)을 사용합니다. 토큰이나 공개 옵션을 추가하지 않았습니다. Chrome 스크린샷은 `/tmp/json-document-design-review/convergence-10`에 보관했습니다. 이번 확인은 위 MOCK 상태와 해당 화면에 한정하며 전체 소비자 회귀를 뜻하지 않습니다.
