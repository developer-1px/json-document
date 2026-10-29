import { applyUIBuilderConfiguration, applyUIBuilderMaterials, createUIBuilderEditor, readUIBuilderProject, type UIBuilderField } from "@interactive-os/json-document-editing";
import { createUIComponentObject, type UIComponentBinding, type UIComponentContent, type UIComponentKind } from "@interactive-os/json-document-object-document";
import { createBriefingExample } from "./briefing-example";

/** A workbench fixture: existing task actions and canonical UI components, with no private renderer. */
export function createBriefingStudioExample() {
  const seed = readUIBuilderProject(createBriefingExample().snapshot.value);
  const editor = createUIBuilderEditor({ ...seed, width: 1440, height: 1600, objects: [], flow: { rows: [] }, activePageId: "page:main", pages: [{ id: "page:main", name: "브리핑 스튜디오" }, { id: "page:results", name: "실행 결과" }] });
  const ensure = (result: { ok: boolean; reason?: unknown }) => { if (!result.ok) throw new Error(`브리핑 스튜디오를 만들지 못했습니다: ${String(result.reason ?? "변경 오류")}`); };
  const fields: readonly UIBuilderField[] = [...seed.tables[0]!.fields,
    { id: "priority", name: "우선순위", type: "select", options: [{id: "high", name: "높음"}, {id: "normal", name: "보통"}], sample: "auto" },
    { id: "due", name: "마감일", type: "text", options: [], sample: "auto" },
    { id: "note", name: "작업 메모", type: "text", options: [], sample: "sentence" },
  ];
  ensure(applyUIBuilderMaterials(editor, [{type: "table.save", id: "tasks", name: "팀 업무", fields}]));
  const table = readUIBuilderProject(editor.snapshot.value).tables[0]!;
  ensure(applyUIBuilderMaterials(editor, [{type: "table.data", id: "tasks", data: {...table.data, records: table.data.records.map((record, index) => ({...record, values: {...record.values, priority: index === 0 ? "high" : "normal", due: ["2026-10-15", "2026-10-16", "2026-10-19"][index]!, note: ""}}))}}]));
  const ids: Record<string, string> = {};
  const binding = (target: UIComponentBinding["target"], fieldId: string, mode: UIComponentBinding["mode"] = "value"): UIComponentBinding => ({target, mode, tableId: "tasks", fieldId, recordId: ""});
  const add = (id: string, kind: UIComponentKind, text: string, pageId: string, height: number, content: Partial<UIComponentContent> = {}) => {
    const created = createUIComponentObject(kind, {x: 0, y: 0}, {text});
    if (created.kind !== "embedded-document") throw new Error("등록 컴포넌트를 확인해 주세요.");
    ensure(editor.dispatch({type: "object.create", object: {...created, id, width: kind === "button" || kind === "page-link" ? 200 : 1080, height, document: {...created.document, ...content, pageId}}}));
    ids[id] = readUIBuilderProject(editor.snapshot.value).objects.at(-1)!.id;
  };
  const main = "page:main";
  add("studio-title", "title", "브리핑 스튜디오", main, 58);
  add("studio-description", "caption", "팀의 요청을 살펴보고, 다음 행동을 정하세요. MOCK 업무 · 외부 서비스에는 반영되지 않습니다.", main, 24);
  add("task-search", "search", "업무 검색", main, 44, {props: {targetTableId: "tasks", fieldId: "title"}});
  add("task-filter", "select", "처리 상태", main, 76, {items: ["전체", "브리핑 전", "방향 선택", "MOCK 완료", "완료"], value: "전체", props: {targetTableId: "tasks", fieldId: "state"}});
  add("tasks", "table", "팀 업무", main, 230, {collection: {tableId: "tasks", fieldIds: ["key", "title", "state", "priority", "due"]}});
  add("task-key", "caption", "", main, 22, {bindings: [binding("text", "key")]});
  add("task-title", "card", "", main, 160, {bindings: [binding("text", "title"), binding("detail", "description")]});
  add("task-due", "date-picker", "마감일", main, 70, {bindings: [binding("value", "due")]});
  add("task-note", "input", "작업 메모", main, 78, {detail: "확인한 내용이나 다음 행동을 기록하세요", bindings: [binding("value", "note")]});
  add("brief-button", "button", "AI 브리핑 받기", main, 44, {actionId: "brief", tone: "accent"});
  add("briefing", "card", "브리핑과 다음 행동", main, 270, {detail: "업무를 선택하고 AI 브리핑을 받으면, 요청의 핵심과 세 가지 처리 방향이 여기에 나타납니다.", bindings: [binding("detail", "briefing")]});
  add("approach", "select", "처리 방향", main, 82, {items: fields.find(field => field.id === "approach")!.options.map(option => option.name), bindings: [binding("value", "approach")], props: {presentation: "inline"}});
  add("execute-button", "button", "선택한 방향으로 실행", main, 44, {actionId: "execute", tone: "accent"});
  add("results-link", "page-link", "실행 결과 보기", main, 44, {targetPageId: "page:results"});
  const item = (id: string, size: "fill" | "hug" = "fill") => ({objectId: ids[id]!, size});
  ensure(applyUIBuilderConfiguration(editor, {pageId: main, flow: {rows: [
    {columns: [{weight: 1, items: [item("studio-title"), item("studio-description")]}]},
    {columns: [{weight: 3, items: [item("task-search")]}, {weight: 1, items: [item("task-filter")]}]},
    {columns: [{weight: 1, items: [item("tasks")]}]},
    {columns: [{weight: 4, items: [item("task-key"), item("task-title"), item("task-due"), item("task-note"), item("brief-button", "hug")]}, {weight: 5, items: [item("briefing"), item("approach"), item("execute-button", "hug"), item("results-link", "hug")]}]},
  ]}}));
  const results = "page:results";
  add("results-title", "title", "실행 결과", results, 58);
  add("results-caption", "caption", "선택한 업무의 결과입니다. 검토를 마치면 완료로 표시하세요.", results, 24);
  add("results-key", "caption", "", results, 22, {bindings: [binding("text", "key")]});
  add("results-task", "heading", "", results, 54, {bindings: [binding("text", "title")]});
  add("results-state", "caption", "", results, 22, {bindings: [binding("text", "state")]});
  add("result", "card", "작성된 결과", results, 400, {bindings: [binding("detail", "result")]});
  add("complete-button", "button", "업무 완료 표시", results, 44, {actionId: "complete", tone: "accent"});
  add("home-link", "page-link", "브리핑으로 돌아가기", results, 44, {targetPageId: main});
  ensure(applyUIBuilderConfiguration(editor, {pageId: results, flow: {rows: [
    {columns: [{weight: 1, items: [item("results-title"), item("results-caption"), item("results-key"), item("results-task"), item("results-state"), item("result")]}]},
    {columns: [{weight: 1, items: [item("complete-button", "hug")]}, {weight: 1, items: [item("home-link", "hug")]}]},
  ]}}));
  return createUIBuilderEditor(readUIBuilderProject(editor.snapshot.value));
}
