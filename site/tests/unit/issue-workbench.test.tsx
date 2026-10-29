import {expect, it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createIssueWorkbenchExample} from "../../src/applications/ui-builder/issue-workbench-example";
import {createUIBuilderEditor, readUIBuilderProject, resolveUIBuilderComponent, resolveUIBuilderTableData, setUIBuilderComponentValue} from "@interactive-os/json-document-editing";
import {UIComponentSurface, type UIComponentInteraction} from "@interactive-os/json-document-canvas";
import type {UIComponentObject} from "@interactive-os/json-document-object-document";

it("issue selection maps title, body and state to one record and persists edits on restore", () => {
  const editor = createIssueWorkbenchExample();
  let project = readUIBuilderProject(editor.snapshot.value);
  expect(project.pages.map(page => page.name)).toEqual(["이슈 작업 공간", "전체 이슈"]);
  expect(project.tables[0]!.data.records).toHaveLength(6);
  const bound = (field: string, target = "value") => project.objects.find(raw => (raw as UIComponentObject).document.bindings?.some(binding => binding.fieldId === field && binding.target === target)) as UIComponentObject;
  const selection = {issues: "issue-212"};
  expect(resolveUIBuilderComponent(project, bound("title", "text"), selection).object.label).toBe("첫 프로젝트의 빈 목록 안내 문구 개선");
  expect(resolveUIBuilderComponent(project, bound("assignee"), selection).object.document.value).toBe("미배정");
  expect(resolveUIBuilderComponent(project, bound("milestone"), selection).object.document.value).toBe("");
  expect(setUIBuilderComponentValue(editor, bound("body"), "첫 문서 만들기를 안내해 주세요.", selection).ok).toBe(true);
  expect(setUIBuilderComponentValue(editor, bound("state"), "닫힘", selection).ok).toBe(true);
  project = readUIBuilderProject(createUIBuilderEditor(JSON.parse(JSON.stringify(editor.snapshot.value))).snapshot.value);
  expect(project.tables[0]!.data.records.find(row => row.id === "issue-212")!.values).toMatchObject({state: "closed", body: "첫 문서 만들기를 안내해 주세요."});
  expect(project.tables[0]!.data.records.find(row => row.id === "issue-214")!.values.state).toBe("open");
});
it("real search and status filter preserve record identity; all connected components render", () => {
  const project = readUIBuilderProject(createIssueWorkbenchExample().snapshot.value);
  const objects = project.objects as readonly UIComponentObject[];
  const search = objects.find(object => object.document.component === "search")!;
  const filter = objects.find(object => object.document.props?.targetTableId && object.document.component === "select")!;
  expect(resolveUIBuilderTableData(project, "issues", {[search.id]: "키보드", [filter.id]: "열림"})!.records.map(row => row.id)).toEqual(["issue-213"]);
  expect(resolveUIBuilderTableData(project, "issues", {[filter.id]: "닫힘"})!.records.map(row => row.id)).toEqual(["issue-211", "issue-210"]);
  expect(resolveUIBuilderTableData(project, "issues", {[search.id]: "존재하지 않는 이슈"})!.records).toHaveLength(0);
  const interaction: UIComponentInteraction = {busy: false, selectedItem: 0, onAction: () => {}, onValueChange: () => {}, onSelectItem: () => {}, onNavigate: () => {}, onPropsChange: () => {}, onSelectRecord: () => {}, onCollectionChange: () => {}};
  for (const object of objects) {
    const projection = resolveUIBuilderComponent(project, object, {issues: "issue-213"});
    expect(projection.issues).toEqual([]);
    const html = renderToStaticMarkup(<UIComponentSurface object={projection.object} collection={projection.collection} interaction={interaction} renderChildren={() => null}/>);
    expect(html).not.toContain("연결할 데이터 컬렉션을 선택하세요");
  }
  const body = objects.find(object => object.document.bindings?.some(binding => binding.fieldId === "body"))!;
  expect(resolveUIBuilderComponent(project, body, {issues: ""}).object.document.value).toBe("");
  const list = objects.find(object => object.document.component === "record-list")!;
  const empty = resolveUIBuilderComponent(project, list, {issues: ""}, {[search.id]: "존재하지 않는 이슈"});
  expect(renderToStaticMarkup(<UIComponentSurface object={empty.object} collection={empty.collection} interaction={interaction}/>)).toContain("표시할 항목이 없습니다.");
  const links = objects.filter(object => object.document.component === "page-link");
  expect(links.map(object => object.document.targetPageId)).toEqual(["page:issue-table", "page:main"]);
}, 30000);

it("runtime search moves the detail selection and disables editing for empty results", async () => {
  const {render, screen, fireEvent, cleanup} = await import("@testing-library/react");
  const {UIBuilderRuntimeHand} = await import("@interactive-os/json-document-ui-builder");
  try {
    render(<UIBuilderRuntimeHand editor={createIssueWorkbenchExample()} skills={[]}/>);
    const search = screen.getByRole("searchbox", {name: "이슈 검색"});
    fireEvent.change(search, {target: {value: "키보드"}});
    expect(screen.getByRole("heading", {level: 2, name: "키보드만으로 이슈 목록에서 상세로 이동하고 다시 선택 위치로 돌아오기"})).toBeDefined();
    expect(screen.getByRole("region", {name: "본문"}).textContent).toContain("키보드 사용자는");
    expect(screen.queryByRole("textbox", {name: "본문"})).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "본문 편집"}));
    expect((screen.getByRole("textbox", {name: "본문"}) as HTMLTextAreaElement).value).toContain("키보드 사용자는");
    fireEvent.click(screen.getByRole("button", {name: "취소"}));
    fireEvent.change(search, {target: {value: "없는 이슈입니다"}});
    expect(screen.queryByRole("region", {name: "본문"})).toBeNull();
    expect(screen.getAllByRole("status").some(element => element.textContent?.includes("표시할 항목이 없습니다."))).toBe(true);
    fireEvent.change(search, {target: {value: ""}});
    expect(screen.getByRole("region", {name: "본문"}).textContent).toContain("재현 방법");
    fireEvent.click(screen.getByRole("radio", {name: "닫힘"}));
    expect(screen.getByRole("region", {name: "본문"}).textContent).toContain("페이지 ID가 포함된 링크");
    fireEvent.click(screen.getByRole("button", {name: "전체 이슈를 표로 관리"}));
    expect(screen.getByRole("heading", {name: "전체 이슈"})).toBeDefined();
    fireEvent.click(screen.getByRole("button", {name: "이슈 작업 공간으로 돌아가기"}));
    expect(screen.getByRole("region", {name: "본문"})).toBeDefined();
  } finally {cleanup();}
}, 30000);
