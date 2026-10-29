/** Semantic role maps for one record. Field IDs are data references, never styling props. */
export const uiDomainCardCatalog = [
  {id:"person", label:"인물", api:"PersonCard", purpose:"이름과 역할로 사람을 식별하고 연락 맥락을 확인한다", required:["title"], roles:["title","role","organization","contact","status","identifier"], reason:"이름·직무·소속은 간격으로 묶고 연락처는 구분선 아래 둔다. 인물 식별에 장식용 외곽선이나 면을 더하지 않는다."},
  {id:"event", label:"일정", api:"EventCard", purpose:"언제 어디서 누구와 만나는지 확인한다", required:["title","schedule"], roles:["title","schedule","timeLabel","location","participants","agenda","status","identifier"], reason:"일시를 제목 앞에 두고 독립 일정 단위는 옅은 면으로 표현한다. 장소와 참석자는 같은 일정의 병렬 속성이다. 참석 응답은 실제 연결된 행동만 제공한다."},
  {id:"file", label:"파일", api:"FileCard", purpose:"문서를 식별하고 내용과 작성 맥락을 확인한다", required:["title"], roles:["title","format","size","updated","timeLabel","preview","owner","status","identifier"], reason:"독립 문서의 외곽선과 본문·작성 맥락 사이 구분선을 구별한다. 파일 형식·크기는 보조 정보다. 실제 파일 경로가 없으면 다운로드를 만들지 않는다."},
  {id: "inquiry", label: "문의", api: "InquiryCard", purpose: "문의의 내용과 맥락을 읽고 답변한다", required: ["title", "body"], roles: ["title", "body", "customer", "status", "priority", "unread", "identifier"], reason: "수신 메시지와 답변 작성기를 구분한다. unread는 실제 checkbox 필드일 때만 읽지 않음 인디케이터로 표시한다. 답변 초안은 전송된 메시지로 표현하지 않는다."},
  {id: "task", label: "업무", api: "TaskCard", purpose: "누가 언제 무엇을 해야 하는지 판단한다", required: ["title"], roles: ["title", "summary", "assignee", "due", "timeLabel", "status", "priority", "completed", "overdue", "flagged", "identifier"], reason: "컴팩트한 작업 요약/행으로 제목·진행과 담당자·기한을 구분한다. completed/overdue/flagged는 실제 checkbox 필드의 사실이다. flagged는 우선순위나 완료 상태와 별개다. 상태 값으로 가능한 전이를 추측하지 않는다."},
  {id: "product", label: "상품", api: "ProductCard", purpose: "한 상품의 재고·가격과 입고 맥락을 확인한다", required: ["title"], roles: ["title", "category", "quantity", "price", "note", "status", "identifier"], reason: "수량과 금액은 실제 단위·통화로 표시하고 입고 메모는 본문으로 읽는다. 여러 상품의 동일 필드 비교는 table을 쓴다."},
  {id: "approval", label: "승인 요청", api: "ApprovalCard", purpose: "변경 요청을 이해하고 허용된 결정을 내린다", required: ["title", "change", "requester"], roles: ["title", "change", "requester", "requestedAt", "timeLabel", "status", "before", "after", "changed", "identifier"], reason: "실제 before/after가 있으면 변경 전/후 비교를 주 내용으로 표현하고 없으면 요청 설명만 읽는다. changed는 실제 checkbox 필드일 때만 표시한다. 승인·반려는 실제 권한/액션이 있을 때만 자식 행동을 연결한다."},
  {id: "activity", label: "활동", api: "ActivityCard", purpose: "누가 무엇을 언제 변경했는지 이해한다", required: ["title", "actor", "dateTime"], roles: ["title", "actor", "dateTime", "timeLabel", "subject", "body", "identifier"], reason: "title은 실제 행동, actor와 시각은 발생한 사실이다. 타임라인 이벤트로 표현하며 기록을 일반 입력으로 수정하지 않는다. 연속 이력은 activity-feed presentation=timeline을 쓴다."},
  {id: "result", label: "근거 있는 결과", api: "EvidenceCard", purpose: "결과와 실제 근거를 확인하고 후속 작업으로 이어간다", required: ["title", "body"], roles: ["title", "body", "source", "status", "identifier"], reason: "읽기 문서의 결과 본문과 근거 영역을 구분한다. 근거가 없으면 source를 생략하며 신뢰도나 출처를 만들지 않는다."},
] as const;
export type UIDomainCardPresentation = typeof uiDomainCardCatalog[number]["id"];
export const uiDomainCardFieldRoles = [...new Set<string>(uiDomainCardCatalog.flatMap(entry => [...entry.roles] as string[]))];

/** Validate the actual schema before publication; palette drafts may remain unconnected. */
export function assertUIDomainCardMapping(props: Readonly<Record<string, unknown>>, fields: readonly {readonly id: string; readonly type: string}[], fieldIds: readonly string[]): void {
  const entry = uiDomainCardCatalog.find(entry => entry.id === props.presentation);
  if (!entry) throw new TypeError("도메인 카드의 표현 목적을 선택해 주세요.");
  const mapped = new Map(fields.map(field => [field.id, field]));
  for (const role of uiDomainCardFieldRoles) {
    const id = props[`${role}FieldId`];
    if (id === undefined) continue;
    if (!(entry.roles as readonly string[]).includes(role)) throw new TypeError(`${entry.label} 카드에는 ${role} 역할이 없습니다.`);
    if (typeof id !== "string" || !mapped.has(id) || !fieldIds.includes(id)) throw new TypeError(`${role} 역할을 컬렉션의 실제 필드 ID에 연결해 주세요.`);
    if (["unread", "completed", "overdue", "changed", "flagged"].includes(role) && mapped.get(id)?.type !== "checkbox") throw new TypeError(`${role} 인디케이터는 실제 checkbox 필드여야 합니다.`);
    if (["quantity", "price"].includes(role) && mapped.get(id)?.type !== "number") throw new TypeError(`${role} 역할은 수치 필드여야 합니다.`);
  }
  for (const role of entry.required) if (!props[`${role}FieldId`]) throw new TypeError(`${entry.label} 카드의 ${role} 필드를 연결해 주세요.`);
  if (!!props.beforeFieldId !== !!props.afterFieldId) throw new TypeError("변경 전/후 필드를 함께 연결해 주세요.");
  if (props.quantityFieldId && typeof props.unit !== "string") throw new TypeError("수량의 실제 단위를 명시해 주세요. 무단위는 빈 문자열입니다.");
  if (props.priceFieldId && (typeof props.currency !== "string" || !/^[A-Z]{3}$/.test(props.currency))) throw new TypeError("가격의 실제 ISO 통화 코드를 명시해 주세요.");
}
