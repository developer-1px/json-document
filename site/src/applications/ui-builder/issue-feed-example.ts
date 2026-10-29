import { applyUIBuilderConfiguration, applyUIBuilderMaterials, createUIBuilderEditor, readUIBuilderProject, type UIBuilderField } from "@interactive-os/json-document-editing";
import { createUIComponentObject, type UIComponentBinding, type UIComponentContent, type UIComponentKind } from "@interactive-os/json-document-object-document";
import { createBriefingStudioExample } from "./briefing-studio-example";

/** A workbench fixture: existing task actions and canonical UI components, with no private renderer. */
export function createIssueFeedExample() {
  const seed = readUIBuilderProject(createBriefingStudioExample().snapshot.value);
  const editor = createUIBuilderEditor({ ...seed, width: 1440, height: 1600, objects: [], flow: { rows: [] }, activePageId: "page:main", pages: [{ id: "page:main", name: "업무 피드" }, { id: "page:results", name: "처리 결과" }] });
  const ensure = (result: { ok: boolean; reason?: unknown }) => { if (!result.ok) throw new Error(`업무 피드를 만들지 못했습니다: ${String(result.reason ?? "변경 오류")}`); };
  const fields: readonly UIBuilderField[] = [...seed.tables[0]!.fields,
    ...[ ["summary", "요약"], ["owner", "담당자"], ["team", "팀"], ["updated", "업데이트"] ].map(([id, name]) => ({id: id!, name: name!, type: "text" as const, options: [], sample: "sentence" as const})),
  ];
  ensure(applyUIBuilderMaterials(editor, [{type: "table.save", id: "tasks", name: "팀 업무", fields}]));
  const table = readUIBuilderProject(editor.snapshot.value).tables[0]!;
  const issues = [
    ["task-101", "TEAM-101", "CSV 내보내기에서 한글이 깨져요", "Windows Excel에서 고객 목록을 열면 이름이 깨집니다.", "고객 지원팀에서 전달했습니다. Windows Excel로 고객 목록 CSV를 열면 이름이 깨지지만 웹에서는 정상입니다. 이번 주 고객 보고 전까지 재현 조건과 인코딩을 확인하고 안내해야 합니다.", "대기", "김민지", "고객 경험", "높음", "2026-10-15", "오늘 10:24"],
    ["task-102", "TEAM-102", "금요일 배포 공지를 준비해주세요", "검색 개선과 알림 수정 내용을 고객에게 안내합니다.", "검색 속도 개선, 대시보드 필터 저장, 알림 누락 수정이 금요일 배포 예정입니다. 고객 공지 초안과 배포 전 확인 항목을 정리해주세요. 배포 시각은 아직 미정입니다.", "진행", "이준호", "플랫폼", "높음", "2026-10-16", "오늘 09:48"],
    ["task-103", "TEAM-103", "신규 사용자 브리핑 흐름 개선", "업무 선택 다음에 해야 할 행동이 분명하지 않습니다.", "새 사용자가 업무를 선택한 뒤 무엇을 눌러야 할지 모르고 있습니다. 브리핑, 방향 선택, 실행 단계를 쉽게 이해하도록 개선하고 결과가 어느 업무에 속하는지도 보여주세요.", "대기", "박서연", "제품 디자인", "보통", "2026-10-19", "어제 17:30"],
    ["task-104", "TEAM-104", "알림 중복 발송 조건 확인", "동시에 갱신한 업무에서 같은 알림을 두 번 받았습니다.", "두 명이 같은 업무의 상태를 동시에 변경했을 때 알림이 중복으로 발송됩니다. 관련 로그와 재시도 조건을 확인하고 중복 방지 기준을 제안해주세요.", "검토", "최지훈", "플랫폼", "높음", "2026-10-16", "어제 16:12"],
    ["task-105", "TEAM-105", "도움말 검색어 정리", "지원 문의에서 자주 쓰는 표현을 도움말에 반영합니다.", "최근 지원 문의에 등장한 내보내기, 필터 저장, 알림 설정 표현을 기존 도움말 제목과 비교해 검색어를 정리해주세요. 문서 공개 전에 지원팀 검토가 필요합니다.", "완료", "정유진", "고객 경험", "보통", "2026-10-14", "어제 14:05"],
    ["task-106", "TEAM-106", "대시보드 필터 저장 오류", "새로고침하면 팀 필터가 전체로 돌아갑니다.", "팀 대시보드에서 담당 팀 필터를 저장한 뒤 새로고침하면 전체 업무가 표시됩니다. 저장한 필터와 실제 조회 조건을 비교하고 재현 과정을 기록해주세요.", "진행", "이준호", "플랫폼", "보통", "2026-10-20", "어제 11:42"],
  ];
  ensure(applyUIBuilderMaterials(editor, [{type: "table.data", id: "tasks", data: {...table.data, records: issues.map(([id, key, title, summary, description, state, owner, team, priority, due, updated]) => ({id: id!, values: {key: key!, title: title!, summary: summary!, description: description!, state: state!, owner: owner!, team: team!, priority: priority === "높음" ? "high" : "normal", due: due!, updated: updated!, approach: "plan", note: "", briefing: state === "대기" ? "" : `요청: ${title}\n\n${summary}\n\n범위를 확인하고 근거를 모은 뒤 작은 단위로 진행합니다. 검토할 담당자와 완료 기준을 먼저 합의하세요.`, result: ["검토", "완료"].includes(state!) ? `[MOCK 결과 · ${key}]\n\n1. 관련 조건과 자료를 확인합니다.\n2. 재현 과정을 기록하고 수정 후보를 비교합니다.\n3. 담당 팀과 검증 기준을 공유합니다.\n\n이 결과는 예시이며 외부 서비스에는 반영되지 않았습니다.` : ""}}))}}]));
  const ids: Record<string, string> = {};
  const binding = (target: UIComponentBinding["target"], fieldId: string, mode: UIComponentBinding["mode"] = "value"): UIComponentBinding => ({target, mode, tableId: "tasks", fieldId, recordId: ""});
  const add = (id: string, kind: UIComponentKind, text: string, pageId: string, height: number, content: Partial<UIComponentContent> = {}) => {
    const created = createUIComponentObject(kind, {x: 0, y: 0}, {text});
    if (created.kind !== "embedded-document") throw new Error("등록 컴포넌트를 확인해 주세요.");
    ensure(editor.dispatch({type: "object.create", object: {...created, id, width: kind === "button" || kind === "page-link" ? 200 : 1080, height, document: {...(created.document as UIComponentContent), ...content, pageId}}}));
    ids[id] = readUIBuilderProject(editor.snapshot.value).objects.at(-1)!.id;
  };
  const main = "page:main";
  add("studio-title", "title", "업무 인박스", main, 58);
  add("studio-description", "caption", "MOCK 데이터", main, 24);
  add("task-search", "search", "업무 검색", main, 44, {props: {targetTableId: "tasks", fieldId: "title"}});
  add("task-filter", "select", "상태 필터", main, 76, {items: ["전체", "대기", "진행", "검토", "완료"], value: "전체", props: {targetTableId: "tasks", fieldId: "state", presentation: "inline"}});
  add("tasks", "record-list", "업무 목록", main, 680, {collection: {tableId: "tasks", fieldIds: ["title", "summary", "key", "state", "owner", "updated"]}, props: {presentation: "feed", titleFieldId: "title", summaryFieldId: "summary", identifierFieldId: "key", statusFieldId: "state", assigneeFieldId: "owner", updatedAtFieldId: "updated"}});
  add("task-key", "caption", "", main, 22, {bindings: [binding("text", "key")]});
  add("task-title", "card", "", main, 160, {bindings: [binding("text", "title"), binding("detail", "description")]});
  add("task-description", "detail-list", "업무 속성", main, 140, {collection: {tableId: "tasks", fieldIds: ["team", "owner", "priority"]}});
  add("task-state", "select", "상태", main, 76, {items: ["대기", "진행", "검토", "완료"], bindings: [binding("value", "state")], props: {presentation: "inline"}});
  add("task-due", "date-picker", "마감일", main, 70, {bindings: [binding("value", "due")]});
  add("task-controls", "toolbar", "속성 조작", main, 80, {childIds: [ids["task-state"]!, ids["task-due"]!]});
  add("task-note", "textarea", "작업 메모", main, 112, {detail: "확인한 내용이나 다음 행동을 기록하세요", bindings: [binding("value", "note")]});
  add("brief-button", "button", "AI 브리핑 받기", main, 44, {actionId: "brief", tone: "accent"});
  add("briefing", "card", "브리핑과 다음 행동", main, 270, {props: {emptyMessage: "브리핑을 생성하면 요청의 핵심과 처리 방향을 확인할 수 있습니다."}, detail: "업무를 선택하고 AI 브리핑을 받으면, 요청의 핵심과 세 가지 처리 방향이 여기에 나타납니다.", bindings: [binding("detail", "briefing")]});
  add("approach", "select", "처리 방향", main, 82, {items: fields.find(field => field.id === "approach")!.options.map(option => option.name), bindings: [binding("value", "approach")], props: {presentation: "inline"}});
  add("execute-button", "button", "선택한 방향으로 실행", main, 44, {actionId: "execute", tone: "accent"});
  add("results-link", "page-link", "실행 결과 보기", main, 44, {targetPageId: "page:results"});
  const item = (id: string, size: "fill" | "hug" = "fill") => ({objectId: ids[id]!, size});
  ensure(applyUIBuilderConfiguration(editor, {pageId: main, flow: {rows: [
    {columns: [{weight: 1, items: [item("studio-title"), item("studio-description")]}]},
    {columns: [{weight: 2, items: [item("task-search"), item("task-filter"), item("tasks")]}, {weight: 3, items: [item("task-key"), item("task-title"), item("task-description"), item("task-controls"), item("task-note"), item("brief-button", "hug"), item("briefing"), item("approach"), item("execute-button", "hug"), item("results-link", "hug")]}]},
  ]}}));
  const results = "page:results";
  add("results-title", "title", "처리 결과", results, 58);
  add("results-caption", "caption", "선택한 업무의 결과입니다. 검토를 마치면 완료로 표시하세요.", results, 24);
  add("results-key", "caption", "", results, 22, {bindings: [binding("text", "key")]});
  add("results-task", "heading", "", results, 54, {bindings: [binding("text", "title")]});
  add("results-state", "caption", "", results, 22, {bindings: [binding("text", "state")]});
  add("result", "card", "작성된 결과", results, 400, {props: {emptyMessage: "아직 작성된 결과가 없습니다. 업무 피드에서 처리 방향을 선택하고 결과를 작성하세요."}, bindings: [binding("detail", "result")]});
  add("complete-button", "button", "업무 완료 표시", results, 44, {actionId: "complete", tone: "accent"});
  add("home-link", "page-link", "업무 피드로 돌아가기", results, 44, {targetPageId: main});
  ensure(applyUIBuilderConfiguration(editor, {pageId: results, flow: {rows: [
    {columns: [{weight: 1, items: [item("results-title"), item("results-caption"), item("results-key"), item("results-task"), item("results-state"), item("result")]}]},
    {columns: [{weight: 1, items: [item("complete-button", "hug")]}, {weight: 1, items: [item("home-link", "hug")]}]},
  ]}}));
  return createUIBuilderEditor(readUIBuilderProject(editor.snapshot.value));
}
