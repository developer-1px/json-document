import { applyUIBuilderMaterials, applyUIBuilderConfiguration, createUIBuilderEditor, readUIBuilderProject, type UIBuilderField, type UIBuilderSkillDefinition } from "@interactive-os/json-document-editing";
import { createUIComponentObject, type UIComponentBinding, type UIComponentKind } from "@interactive-os/json-document-object-document";

const approaches = [{id: "plan", name: "진행 계획 작성"}, {id: "draft", name: "답변 초안 작성"}, {id: "questions", name: "확인 질문 정리"}];
const fields: readonly UIBuilderField[] = [
  {id: "key", name: "업무 번호", type: "text", options: [], sample: "auto"},
  {id: "title", name: "업무", type: "title", options: [], sample: "sentence"},
  {id: "description", name: "요청 내용", type: "text", options: [], sample: "sentence"},
  {id: "briefing", name: "브리핑", type: "text", options: [], sample: "sentence"},
  {id: "approach", name: "처리 방향", type: "select", options: approaches, sample: "auto"},
  {id: "result", name: "실행 결과", type: "text", options: [], sample: "sentence"},
  {id: "state", name: "처리 상태", type: "text", options: [], sample: "auto"},
];
const tasks = [
  {id: "task-101", key: "TEAM-101", title: "내보낸 CSV에서 한글이 깨져요", description: "고객 지원팀에서 전달한 업무입니다. Windows Excel로 고객 목록 CSV를 열면 이름이 깨지지만 웹에서는 정상입니다. 이번 주 고객 보고 전까지 확인과 안내가 필요합니다."},
  {id: "task-102", key: "TEAM-102", title: "금요일 배포 내용을 정리해주세요", description: "검색 속도 개선, 대시보드 필터 저장, 알림 누락 수정이 금요일 배포 예정입니다. 고객 공지 초안과 배포 전 확인할 항목을 정리해주세요. 정확한 배포 시각은 아직 확정되지 않았습니다."},
  {id: "task-103", key: "TEAM-103", title: "브리핑 화면을 더 쉽게 만들기", description: "새 사용자가 업무 선택 후 무엇을 눌러야 할지 모르고 있습니다. 브리핑 → 방향 선택 → 실행 흐름을 명확히 하고, 실행한 결과가 어느 업무에 속하는지 확인할 수 있도록 개선해주세요."},
];
/** Product fixture assembled exclusively with the public builder APIs. No task-specific UI renderer. */
export function createBriefingExample() {
  const editor = createUIBuilderEditor({profile: "canvas/1", width: 1200, height: 1400, objects: []});
  const ensure = (result: {ok: boolean}) => {if (!result.ok) throw new Error("업무 브리핑 예제를 만들지 못했습니다.");};
  ensure(applyUIBuilderMaterials(editor, [{type: "table.save", id: "tasks", name: "업무", fields},
    {type: "action.save", action: {id: "brief", name: "업무 브리핑", description: "선택한 업무를 요약하고 처리 방향별 결과를 설명합니다. MOCK 응답입니다.", inputs: fields.slice(0, 3), outputs: [fields[3]!], execution: {skill: "mock.brief", tableId: "tasks", prompt: "요청을 요약하고 세 처리 방향을 비교해 주세요.", inputFieldIds: ["key", "title", "description"], outputFieldIds: ["briefing", "result", "state"], requiredFieldIds: ["title", "description"]}}},
    {type: "action.save", action: {id: "execute", name: "선택한 방향 실행", description: "브리핑과 선택한 방향에 맞는 결과물을 작성합니다. 외부 업무 변경 없이 MOCK 결과를 저장합니다.", inputs: [fields[3]!, fields[4]!], outputs: [fields[5]!], execution: {skill: "mock.work", tableId: "tasks", prompt: "선택한 처리 방향으로 업무를 진행하고 결과물을 작성해 주세요.", inputFieldIds: ["key", "title", "description", "briefing", "approach"], outputFieldIds: ["result", "state"], requiredFieldIds: ["briefing", "approach"]}}},
  ]));
  const table = readUIBuilderProject(editor.snapshot.value).tables[0]!;
  ensure(applyUIBuilderMaterials(editor, [{type: "table.data", id: table.id, data: {...table.data, records: tasks.map(({id, ...task}) => ({id, values: {...task, briefing: "", approach: "plan", result: "", state: "브리핑 전"}}))}}]));
  const binding = (target: UIComponentBinding["target"], fieldId: string, mode: UIComponentBinding["mode"] = "value"): UIComponentBinding => ({target, mode, tableId: "tasks", fieldId, recordId: ""});
  const componentIds: Record<string, string> = {};
  const add = (id: string, kind: UIComponentKind, text: string, x: number, y: number, width: number, height: number, bindings: readonly UIComponentBinding[] = [], actionId = "", detail = "", items: readonly string[] = []) => {
    const object = createUIComponentObject(kind, {x, y}, {text, detail, items});
    if (object.kind !== "embedded-document") throw new Error("컴포넌트를 확인해 주세요.");
    ensure(editor.dispatch({type: "object.create", object: {...object, id, width, height, document: {...object.document as object, bindings, ...(actionId ? {actionId} : {})}}}));
    componentIds[id] = readUIBuilderProject(editor.snapshot.value).objects.at(-1)!.id;
  };
  add("page-title", "heading", "오늘의 업무 브리핑", 40, 40, 950, 60);
  add("intro", "text", "업무를 고르면, 복잡한 정리는 AI에게. 방향을 선택하고 결과를 확인하세요.", 40, 112, 1080, 48);
  add("task-list", "list", "받은 업무", 40, 196, 280, 340, [binding("items", "title", "list")]);
  add("mock-note", "text", "MOCK · Jira 예시 업무 3건\n외부 서비스에는 반영되지 않아요.", 40, 558, 280, 100);
  add("task-key", "text", "", 360, 190, 230, 32, [binding("text", "key")]);
  add("task-state", "text", "", 820, 190, 330, 32, [binding("text", "state")]);
  add("task-title", "heading", "", 360, 240, 790, 96, [binding("text", "title")]);
  add("task-description", "text", "", 360, 354, 790, 110, [binding("text", "description")]);
  add("brief-button", "button", "1. AI 브리핑 받기", 360, 486, 240, 48, [], "brief");
  add("briefing", "card", "업무 요약과 제안", 360, 558, 790, 274, [binding("detail", "briefing")]);
  add("approach", "select", "2. 어떻게 진행할까요?", 360, 862, 480, 92, [binding("value", "approach")], "", "", approaches.map(a => a.name));
  add("execute-button", "button", "3. 선택한 방향으로 실행", 864, 894, 286, 48, [], "execute");
  add("result", "card", "실행 결과", 360, 984, 790, 350, [binding("detail", "result")]);
  const item = (name: string, size: "fill" | "hug" = "fill") => ({objectId: componentIds[name]!, size});
  ensure(applyUIBuilderConfiguration(editor, {flow: {rows: [
    {columns: [{weight: 1, items: [item("page-title"), item("intro")]}]},
    {columns: [{weight: 1, items: [item("task-list"), item("mock-note")]}, {weight: 3, items: [item("task-key", "hug"), item("task-state", "hug"), item("task-title"), item("task-description"), item("brief-button", "hug"), item("briefing"), item("approach"), item("execute-button", "hug"), item("result")]}]},
  ]}}));
  return createUIBuilderEditor(readUIBuilderProject(editor.snapshot.value));
}

/** Delayed deterministic fixtures exercise running, cancellation, schema validation and persistence. */
export const briefingMockSkills: readonly UIBuilderSkillDefinition[] = [
  {id: "mock.brief", name: "업무 분석 (MOCK)", description: "예시 업무를 요약하고 세 가지 처리 방향을 제안합니다.", run: async ({input, signal}) => {
    await new Promise(resolve => setTimeout(resolve, 900));
    if (signal.aborted) throw new Error("실행을 취소했습니다.");
    return {briefing: `요청: ${input.title}\n\n${input.description}\n\n진행 계획 작성 — 확인할 내용과 실행 순서를 정리합니다.\n답변 초안 작성 — 요청자에게 보낼 설명을 준비합니다.\n확인 질문 정리 — 진행 전에 필요한 정보를 추립니다.`, result: "", state: "방향 선택"};
  }},
  {id: "mock.work", name: "업무 진행 (MOCK)", description: "선택한 방향의 예시 결과를 저장합니다. Jira 변경이나 메시지 전송은 하지 않습니다.", run: async ({input, signal}) => {
    await new Promise(resolve => setTimeout(resolve, 1300));
    if (signal.aborted) throw new Error("실행을 취소했습니다.");
    const title = String(input.title);
    const result = input.approach === "draft" ? `안녕하세요. “${title}” 요청을 확인했습니다.\n\n현재 전달해주신 내용을 기준으로 범위와 재현 조건을 확인하고 있습니다. 확인한 사실과 추가로 필요한 내용을 정리한 뒤 진행 일정과 함께 공유드리겠습니다.\n\n확인할 요청: ${input.description}\n\n이 초안은 아직 전송되지 않았습니다.` : input.approach === "questions" ? `“${title}” 진행 전 확인할 질문\n\n1. 완료가 필요한 정확한 날짜와 우선순위는 무엇인가요?\n2. 현재 문제를 확인할 수 있는 자료나 재현 환경이 있나요?\n3. 완료 여부를 판단할 담당자와 기준은 무엇인가요?\n\n질문 목록을 작성했습니다. 외부 메시지는 전송하지 않았습니다.` : `“${title}” 진행 계획\n\n1. 범위 확인 — 요청 내용과 완료 기준을 정리합니다.\n2. 근거 수집 — 재현 환경, 관련 변경과 자료를 확인합니다.\n3. 작업 진행 — 가장 작은 단위로 수정 또는 초안을 작성합니다.\n4. 검증 — 요청의 완료 기준에 맞춰 결과를 확인합니다.\n5. 공유 — 결과와 남은 질문을 요청자에게 전달합니다.\n\n계획 초안을 작성했습니다. 실제 외부 작업은 시작하지 않았습니다.`;
    return {result: `[MOCK 결과 · ${input.key} · ${approaches.find(a => a.id === input.approach)?.name ?? "업무 진행"}]\n\n${result}`, state: "MOCK 완료"};
  }},
];
