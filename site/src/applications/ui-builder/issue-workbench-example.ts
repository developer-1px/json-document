import {
  applyUIBuilderComponentConfiguration, applyUIBuilderConfiguration,
  applyUIBuilderMaterials, applyUIBuilderPages, createUIBuilderEditor,
  readUIBuilderProject, type UIBuilderField,
} from "@interactive-os/json-document-editing";
import {
  createUIComponentObject, type UIComponentBinding, type UIComponentKind,
} from "@interactive-os/json-document-object-document";

/** Local synthetic issue content; composition and editing use canonical Builder APIs. */
export function createIssueWorkbenchExample() {
  const editor = createUIBuilderEditor({profile: "canvas/1", width: 1200, height: 1200, objects: []});
  const ensure = (result: {ok: boolean; reason?: string}) => {
    if (!result.ok) throw new Error(result.reason ?? "이슈 작업 공간 생성 실패");
  };
  const field = (id: string, name: string, type: UIBuilderField["type"] = "text", options: UIBuilderField["options"] = []): UIBuilderField => ({id, name, type, options, sample: "auto"});
  const states = [{id: "open", name: "열림"}, {id: "closed", name: "닫힘"}];
  const assignees = [{id: "none", name: "미배정"}, {id: "mina", name: "민아"}, {id: "jun", name: "준"}, {id: "soyeon", name: "소연"}];
  const fields = [field("title", "제목", "title"), field("key", "이슈 번호"), field("state", "상태", "select", states), field("labels", "라벨"), field("assignee", "담당자", "select", assignees), field("milestone", "마일스톤"), field("body", "본문"), field("author", "작성자"), field("opened", "등록일")];
  ensure(applyUIBuilderMaterials(editor, [{type: "table.save", id: "issues", name: "Atlas 이슈", fields}]));
  const table = readUIBuilderProject(editor.snapshot.value).tables[0]!;
  ensure(applyUIBuilderMaterials(editor, [{type: "table.data", id: table.id, data: {...table.data, records: [
    {id: "issue-214", values: {key: "#214", title: "검색어를 지워도 이전 검색 결과가 남습니다", state: "open", labels: "bug, search", assignee: "mina", milestone: "v0.8", author: "준", opened: "2026-10-13", body: "재현 방법\n1. 문서 목록에서 ‘회의록’을 검색합니다.\n2. 검색 입력을 모두 지웁니다.\n\n현재 동작\n회의록 결과만 계속 표시됩니다. 새로고침하면 전체 목록이 나타납니다.\n\n기대 동작\n검색어가 비면 전체 문서가 즉시 표시되어야 합니다.\n\n환경\nChrome / macOS, 문서 128건"}},
    {id: "issue-213", values: {key: "#213", title: "키보드만으로 이슈 목록에서 상세로 이동하고 다시 선택 위치로 돌아오기", state: "open", labels: "accessibility, enhancement", assignee: "soyeon", milestone: "v0.8", author: "민아", opened: "2026-10-12", body: "키보드 사용자는 상세를 닫을 때 목록 첫 항목으로 돌아갑니다.\n\n선택했던 이슈에 포커스를 복귀시키고, 검색 후에도 선택 위치를 유지할 수 있으면 좋겠습니다.\n\n확인할 조건\n- Tab으로 목록과 상세를 이동\n- 긴 제목의 접근성 이름 유지\n- 필터로 선택 항목이 사라졌을 때의 포커스"}},
    {id: "issue-212", values: {key: "#212", title: "첫 프로젝트의 빈 목록 안내 문구 개선", state: "open", labels: "content, good first issue", assignee: "none", milestone: "", author: "소연", opened: "2026-10-11", body: "프로젝트에 문서가 없을 때 ‘데이터 없음’만 표시됩니다. 사용자가 다음 행동을 이해할 수 있도록 첫 문서를 만드는 방법을 짧게 안내해 주세요.\n\n아직 담당자와 마일스톤이 정해지지 않았습니다."}},
    {id: "issue-211", values: {key: "#211", title: "공유 링크에서 선택한 페이지가 유지되지 않음", state: "closed", labels: "bug, navigation", assignee: "jun", milestone: "v0.7", author: "민아", opened: "2026-10-10", body: "페이지 ID가 포함된 링크로 들어와도 첫 페이지가 열렸습니다.\n\n해결\nURL의 페이지를 초기 선택으로 사용하도록 수정했습니다. 뒤로 가기에서도 같은 선택이 복원됩니다."}},
    {id: "issue-210", values: {key: "#210", title: "긴 문서 제목 줄바꿈 지원", state: "closed", labels: "ui", assignee: "soyeon", milestone: "v0.7", author: "준", opened: "2026-10-09", body: "목록에서 긴 제목이 다른 열을 가렸습니다. 제목이 내용에 맞게 줄바꿈되도록 수정했습니다."}},
    {id: "issue-209", values: {key: "#209", title: "Markdown 붙여넣기에서 체크리스트 보존", state: "open", labels: "enhancement, editor", assignee: "none", milestone: "Backlog", author: "준", opened: "2026-10-08", body: "체크리스트를 붙여넣으면 일반 텍스트로 변환됩니다.\n\n입력 예\n- [x] 설계 검토\n- [ ] 구현\n- [ ] 사용자 확인\n\n체크 여부와 항목 순서를 보존하는 편집 동작이 필요합니다."}},
  ]}}]));
  ensure(applyUIBuilderPages(editor, [{type: "page.rename", id: "page:main", name: "이슈 작업 공간"}, {type: "page.create", id: "page:issue-table", name: "전체 이슈"}, {type: "page.select", id: "page:main"}]));
  const ids: Record<string, string> = {};
  let y = 0;
  const add = (name: string, kind: UIComponentKind, text: string, items: readonly string[] = [], bindings: readonly UIComponentBinding[] = []) => {
    const draft = createUIComponentObject(kind, {x: 0, y}, {text, items, detail: ""});
    if (draft.kind !== "embedded-document") throw new Error("컴포넌트 생성 실패");
    y += draft.height + 24;
    ensure(editor.dispatch({type: "object.create", object: {...draft, document: {...draft.document as object, pageId: readUIBuilderProject(editor.snapshot.value).activePageId}}}));
    const id = readUIBuilderProject(editor.snapshot.value).objects.at(-1)!.id;
    ids[name] = id;
    if (bindings.length) ensure(applyUIBuilderConfiguration(editor, {connections: [{objectId: id, bindings, actionId: ""}]}));
    return id;
  };
  const bind = (target: UIComponentBinding["target"], fieldId: string): UIComponentBinding => ({target, tableId: table.id, fieldId, mode: "value", recordId: ""});
  const item = (name: string, size: "fill" | "hug" = "fill") => ({objectId: ids[name]!, size});
  const connect = (name: string, fieldIds: readonly string[], editable = false) => ensure(applyUIBuilderComponentConfiguration(editor, [{objectId: ids[name]!, collection: {tableId: table.id, fieldIds}, ...(editable ? {props: {editable: true}} : {})}]));
  add("project", "heading", "Atlas / Issues");
  add("sample", "caption", "로컬 샘플 프로젝트 · 변경 내용 자동 저장");
  add("search", "search", "이슈 검색");
  ensure(applyUIBuilderComponentConfiguration(editor, [{objectId: ids.search!, props: {targetTableId: table.id}}]));
  add("filter", "select", "상태 필터", ["전체", "열림", "닫힘"]);
  ensure(applyUIBuilderComponentConfiguration(editor, [{objectId: ids.filter!, props: {targetTableId: table.id, fieldId: "state", presentation: "inline"}}]));
  add("list", "record-list", "이슈 목록");
  connect("list", ["title", "key", "state", "labels"]);
  ensure(applyUIBuilderComponentConfiguration(editor, [{objectId: ids.list!, props: {presentation: "feed"}}]));
  add("key", "caption", "", [], [bind("text", "key")]);
  add("title", "heading", "", [], [bind("text", "title")]);
  add("rename", "popover", "제목 수정");
  add("title-input", "input", "이슈 제목", [], [bind("value", "title")]);
  ensure(applyUIBuilderComponentConfiguration(editor, [{objectId: ids.rename!, childIds: [ids["title-input"]!]}]));
  add("body", "editable-text", "본문", [], [bind("value", "body")]);
  add("state", "select", "상태", states.map(option => option.name), [bind("value", "state")]);
  add("assignee", "select", "담당자", assignees.map(option => option.name), [bind("value", "assignee")]);
  add("labels", "input", "라벨", [], [bind("value", "labels")]);
  add("milestone", "input", "마일스톤", [], [bind("value", "milestone")]);
  add("provenance", "detail-list", "등록 정보");
  connect("provenance", ["author", "opened"]);
  add("all", "page-link", "전체 이슈를 표로 관리");
  ensure(applyUIBuilderPages(editor, [{type: "page-link.target", id: ids.all!, targetPageId: "page:issue-table"}]));
  ensure(applyUIBuilderConfiguration(editor, {flow: {rows: [
    {columns: [{weight: 1, items: [item("project"), item("sample")]}]},
    {columns: [{weight: 3, items: [item("search")]}, {weight: 2, items: [item("filter")]}]},
    {columns: [{weight: 2, items: [item("list")]}, {weight: 3, items: [item("key", "hug"), item("title"), item("rename", "hug"), item("body"), item("state"), item("assignee"), item("labels"), item("milestone"), item("provenance"), item("all", "hug")]}]},
  ]}}));
  const group = (name: string, label: string, members: string[]) => {
    add(name, "group", label);
    ensure(applyUIBuilderComponentConfiguration(editor, [{objectId: ids[name]!, childIds: members.map(member => ids[member]!)}]));
  };
  group("workspace-header", "프로젝트", ["project", "sample"]);
  group("list-header", "이슈 탐색", ["search", "filter"]);
  group("detail-header", "선택 이슈", ["key", "title", "rename"]);
  group("detail-body", "이슈 내용", ["body", "all"]);
  group("properties", "이슈 속성", ["state", "assignee", "labels", "milestone", "provenance"]);
  add("workspace", "record-workspace", "이슈 작업 공간");
  ensure(applyUIBuilderComponentConfiguration(editor, [{objectId: ids.workspace!, props: {tableId: table.id}, childIds: ["workspace-header", "list-header", "list", "detail-header", "detail-body", "properties"].map(name => ids[name]!)}]));
  ensure(applyUIBuilderConfiguration(editor, {flow: {rows: [{columns: [{weight: 1, items: [item("workspace")]}]}]}}));
  ensure(applyUIBuilderPages(editor, [{type: "page.select", id: "page:issue-table"}]));
  add("table-title", "title", "전체 이슈");
  add("table", "table", "Atlas / Issues");
  connect("table", ["title", "key", "state", "labels", "assignee", "milestone"], true);
  add("back", "page-link", "이슈 작업 공간으로 돌아가기");
  ensure(applyUIBuilderPages(editor, [{type: "page-link.target", id: ids.back!, targetPageId: "page:main"}]));
  ensure(applyUIBuilderConfiguration(editor, {flow: {rows: [{columns: [{weight: 1, items: [item("table-title"), item("table"), item("back", "hug")]}]}]}}));
  ensure(applyUIBuilderPages(editor, [{type: "page.select", id: "page:main"}]));
  return createUIBuilderEditor(readUIBuilderProject(editor.snapshot.value));
}
