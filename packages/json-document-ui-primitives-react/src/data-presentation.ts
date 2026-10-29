/** Presentation contracts, not a business schema or automatic component picker.
 * Hosts map actual domain field roles to these contracts; types alone do not choose UI.
 * A scalar presentation, edit transition, record list, table and workspace are different scopes.
 * API names describe the concrete Usage; legacy aliases are not additional capabilities.
 */
export const dataPresentationCatalog = [
  {id:"title",data:"대상의 이름",schemaRoles:["title"],read:{api:"PageHeader / 제목 slot",components:["page-header","heading"]},write:{api:"Field",components:["input"]},entry:"명시적인 제목 수정",commit:"명시적 저장 또는 제품이 정한 즉시 반영"},
  {id:"description",data:"요청 내용·긴 설명",schemaRoles:["description","body"],read:{api:"contentPresentation.body",components:["text"]},write:{api:"Field (multiline)",components:["textarea"]},entry:"읽기 본문에서 편집 명령",commit:"저장·취소; 읽기와 작성 중 상태 구분"},
  {id:"identifier",data:"업무·주문 식별자",schemaRoles:["identifier"],read:{api:"contentPresentation.caption",components:["caption"]},write:null,entry:"일반적으로 읽기 전용; 번호 검색은 Search",commit:"식별자 변경은 별도 도메인 명령"},
  {id:"status",data:"업무 처리 상태",schemaRoles:["status"],read:{api:"StatusBadge",components:["status-badge"]},write:{api:"Choice",components:["select"]},entry:"상태 표시 옆 변경 명령",commit:"제품의 상태 전이·권한 검증 후 반영"},
  {id:"priority",data:"처리 우선순위",schemaRoles:["priority"],read:{api:"PriorityIndicator",components:["priority-indicator"]},write:{api:"Choice",components:["select"]},entry:"표시에서 선택으로 전환",commit:"순서가 있는 도메인 등급을 보존"},
  {id:"severity",data:"영향도·심각도",schemaRoles:["severity"],read:{api:"StatusBadge + 의미 아이콘",components:["status-badge"]},write:{api:"Choice",components:["select"]},entry:"영향도 등급 변경",commit:"심각도는 영향, 우선순위는 처리 순서; 서로 추론하지 않음"},
  {id:"person",data:"담당자·작성자·승인자 관계",schemaRoles:["assignee","author","approver"],read:{api:"PersonIdentity",components:["person-identity"]},write:{api:"PeoplePicker",components:["people-picker"]},entry:"이름 옆 담당자 변경",commit:"인물 ID를 관계 필드에 반영; 이름 문자열과 ID 구분"},
  {id:"date",data:"마감일·예약일·발생일",schemaRoles:["dueDate","scheduledDate","occurredAt"],read:{api:"DateDisplay",components:["date-display"]},write:{api:"DatePicker (@interactive-os/json-document-calendar)",components:["date-picker","date-field","datetime-field"]},entry:"읽기 날짜 옆 수정 명령",commit:"시간대·기한 의미·날짜 단위를 보존"},
  {id:"date-range",data:"시작·종료가 연결된 기간",schemaRoles:["dateRange"],read:{api:"DateRangeDisplay",components:["date-range-display"]},write:{api:"DateRangePicker (@interactive-os/json-document-calendar)",components:["date-range-picker"]},entry:"기간 수정",commit:"시작·종료를 함께 검증"},
  {id:"quantity",data:"수량·재고·단위가 있는 수치",schemaRoles:["quantity","stock"],read:{api:"QuantityDisplay",components:["quantity-display"]},write:{api:"NumberField",components:["number-field"]},entry:"숫자 표시에서 입력으로 전환",commit:"0과 빈 값 구분; 단위·범위 보존"},
  {id:"money",data:"통화를 포함한 금액",schemaRoles:["money","price"],read:{api:"MoneyDisplay",components:["money-display"]},write:{api:"NumberField (통화·정밀도 정책)",components:["number-field"]},entry:"금액 수정",commit:"통화·소수 정밀도는 도메인 소유; 일반 숫자만으로 선택하지 않음"},
  {id:"category",data:"분류·유형",schemaRoles:["category","type"],read:{api:"Tag",components:["tag"]},write:{api:"Choice",components:["select"]},entry:"분류 변경",commit:"한 분류의 ID를 변경; 여러 분류는 tags 계약"},
  {id:"tags",data:"여러 분류·태그",schemaRoles:["tags"],read:{api:"TagGroup",components:["tag-group"]},write:{api:"TagPicker",components:["tag-picker"]},entry:"여러 분류의 포함·제외",commit:"선택 ID 배열 보존; 빌더는 selectedIds 문서 옵션 저장, Database 다중 관계 바인딩은 미지원"},
  {id:"properties",data:"한 대상의 속성 묶음",schemaRoles:["properties"],read:{api:"RecordFacts",components:["record-facts","detail-list"]},write:{api:"RecordFacts + 기존 입력",components:["record-facts"]},entry:"필드별 수정; 전체를 항상 입력창으로 만들지 않음",commit:"각 필드의 실제 명령·저장 정책 사용"},
  {id:"collection",data:"대상 목록 탐색·선택",schemaRoles:["collection","recordList"],read:{api:"IssueRow 목록",components:["record-list"]},write:{api:"Field (선택 대상의 이름)",components:["input"]},entry:"선택과 값 변경을 구분",commit:"레코드별 권한·ID·같은 행의 필드 관계 보존"},
  {id:"comparison",data:"같은 필드로 여러 대상 비교",schemaRoles:["comparison","table"],read:{api:"DatabaseHand (readOnly)",components:["table"]},write:{api:"DatabaseHand",components:["table"]},entry:"비교할 행과 셀 선택",commit:"한 행의 필드 관계를 유지; 표의 정본 편집·검증 사용"},
  {id:"activity",data:"시간순 변경·댓글 기록",schemaRoles:["activity","events"],read:{api:"ActivityFeed",components:["activity-feed"]},write:{api:"CommentComposer",components:["comment-composer"]},entry:"새 기록 제출; 과거 기록을 일반 속성처럼 수정하지 않음",commit:"실제 작성자·시각·대상으로 생성"},
  {id:"result",data:"실행 결과·AI 브리핑",schemaRoles:["result","briefing"],read:{api:"ContentCard + 결과 본문",components:["card"]},write:null,entry:"수정 가능한 결과인지 도메인이 결정",commit:"생성은 Command와 실행 port; 읽기 결과를 자동 입력창으로 만들지 않음"},
] as const;
export type DataPresentationRole = typeof dataPresentationCatalog[number]["id"];
export function getDataPresentation(role: DataPresentationRole) {return dataPresentationCatalog.find(entry=>entry.id===role)!;}
