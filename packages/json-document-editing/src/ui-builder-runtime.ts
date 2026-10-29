import { isJSONValue, type JSONValue } from "@interactive-os/json-document";
import type { UIComponentObject } from "@interactive-os/json-document-object-document";
import type { ObjectEditor } from "./object.js";
import { acceptsDatabaseValue } from "./database-property-value.js";
import { createEditingId } from "./identity.js";
import { applyUIBuilderMaterials, readUIBuilderProject, type UIBuilderAction, type UIBuilderField } from "./ui-builder-materials.js";

/** Declarative execution: a selected record enters a named skill; only declared fields may change. */
export interface UIBuilderActionExecution extends Record<string, JSONValue> {
  readonly skill: string;
  readonly tableId: string;
  readonly prompt: string;
  readonly inputFieldIds: readonly string[];
  readonly outputFieldIds: readonly string[];
  readonly requiredFieldIds: readonly string[];
}
export interface UIBuilderSkillRequest {
  readonly action: UIBuilderAction;
  readonly recordId: string;
  readonly input: Readonly<Record<string, JSONValue>>;
  readonly outputs: readonly UIBuilderField[];
  readonly signal: {readonly aborted: boolean};
}
/** Host injects real or mock integrations. Results pass schema and stale checks before committing. */
export type UIBuilderSkill = (request: UIBuilderSkillRequest) => Promise<Readonly<Record<string, JSONValue>>>;
export interface UIBuilderSkillDefinition { readonly id: string; readonly name: string; readonly description: string; readonly run: UIBuilderSkill; readonly contract?: {readonly requiredInputFieldIds: readonly string[]; readonly outputFields: readonly {readonly id: string; readonly types: readonly UIBuilderField["type"][]}[]}; }
export type UIBuilderRecordSelection = Readonly<Record<string, string>>;

/** Capture the initial record explicitly so later filtering cannot reinterpret it. */
export function createUIBuilderRecordSelection(project: ReturnType<typeof readUIBuilderProject>): UIBuilderRecordSelection {
  return Object.fromEntries(project.tables.map(table => [table.id, table.data.records[0]?.id ?? ""]));
}

/** Read-only prerequisites shared by execution and its visible command affordance. */
export function resolveUIBuilderActionPrerequisites(project: ReturnType<typeof readUIBuilderProject>, actionId: string, selection: UIBuilderRecordSelection = {}) {
  const execution = project.actions.find(action => action.id === actionId)?.execution;
  if (!execution) return {ok: false as const, reason: "액션에 실행 스킬을 연결해 주세요."};
  const table = project.tables.find(table => table.id === execution.tableId);
  const record = table?.data.records.find(record => record.id === (selection[execution.tableId] ?? table.data.records[0]?.id));
  if (!table || !record) return {ok: false as const, reason: "실행할 업무를 선택해 주세요."};
  const missing = execution.requiredFieldIds.filter(id => record.values[id] === "" || record.values[id] === null || record.values[id] === undefined);
  return missing.length ? {ok: false as const, reason: `${missing.map(id => table.fields.find(field => field.id === id)?.name ?? id).join(", ")}을 먼저 입력해 주세요.`} : {ok: true as const};
}

export function assertUIBuilderActionExecution(value: unknown): asserts value is UIBuilderActionExecution {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("실행 설정을 확인해 주세요.");
  const v = value as Record<string, unknown>;
  if (typeof v.skill !== "string" || !v.skill.trim() || typeof v.tableId !== "string" || !v.tableId || typeof v.prompt !== "string") throw new Error("스킬과 대상 테이블이 필요합니다.");
  for (const key of ["inputFieldIds", "outputFieldIds", "requiredFieldIds"]) {
    const values = v[key];
    if (!Array.isArray(values) || values.some(x => typeof x !== "string" || !x) || new Set(values).size !== values.length) throw new Error("실행 필드 목록을 확인해 주세요.");
  }
  if (!(v.outputFieldIds as string[]).length) throw new Error("결과를 저장할 필드가 필요합니다.");
  if ((v.requiredFieldIds as string[]).some(id => !(v.inputFieldIds as string[]).includes(id))) throw new Error("필수 필드는 입력에 포함되어야 합니다.");
}
/** Validate registered capabilities before saving or executing a skill binding. */
export function assertUIBuilderSkillContract(execution: UIBuilderActionExecution, fields: readonly UIBuilderField[], skill: UIBuilderSkillDefinition) {
  const contract = skill.contract;
  if (!contract) return;
  const missing = contract.requiredInputFieldIds.filter(id => !execution.inputFieldIds.includes(id));
  if (missing.length) throw new Error(`${skill.id}: 필요한 입력 필드 ${missing.join(", ")}를 연결해 주세요.`);
  const expected = contract.outputFields.map(f => f.id);
  if (expected.length !== execution.outputFieldIds.length || expected.some(id => !execution.outputFieldIds.includes(id))) throw new Error(`${skill.id}: 출력 필드는 ${expected.join(", ")}여야 합니다. 현재: ${execution.outputFieldIds.join(", ")}`);
  for (const output of contract.outputFields) {
    const field = fields.find(f => f.id === output.id);
    if (!field || !output.types.includes(field.type)) throw new Error(`${skill.id}: 출력 ${output.id}의 타입은 ${output.types.join(" / ")}이어야 합니다. 현재: ${field?.type ?? "없는 필드"}`);
  }
}
/** Edit the selected row through an input's value binding. Selection is transient; values share project history. */
export function setUIBuilderInput(editor: ObjectEditor, object: UIComponentObject, value: string | boolean, selection: UIBuilderRecordSelection = {}) {
  try {
    const project = readUIBuilderProject(editor.snapshot.value);
    const binding = object.document.bindings?.find(b => b.target === "value" && b.mode === "value");
    if (!binding) throw new Error("입력 값을 데이터 필드에 연결해 주세요.");
    const table = project.tables.find(t => t.id === binding.tableId);
    const field = table?.fields.find(f => f.id === binding.fieldId);
    const rowId = binding.recordId || (selection[binding.tableId] ?? table?.data.records[0]?.id);
    if (!table || !field || !table.data.records.some(r => r.id === rowId)) throw new Error("입력할 데이터 행을 찾을 수 없습니다.");
    const cell = field.type === "number" ? (String(value).trim() ? Number(value) : null) : field.type === "select" && object.document.component !== "people-picker" ? field.options.find(o => o.name === value)?.id ?? value : value;
    if (!acceptsDatabaseValue(field, cell)) throw new Error("필드 타입에 맞는 값을 입력해 주세요.");
    return applyUIBuilderMaterials(editor, [{type: "table.data", id: table.id, data: {...table.data, records: table.data.records.map(r => r.id === rowId ? {...r, values: {...r.values, [field.id]: cell}} : r)}}]);
  } catch (e) { return {ok: false as const, reason: e instanceof Error ? e.message : String(e)}; }
}
/** Execute a registered skill once, then atomically commit its schema-checked output to the original record. */
export async function executeUIBuilderAction(editor: ObjectEditor, actionId: string, skills: readonly UIBuilderSkillDefinition[], selection: UIBuilderRecordSelection = {}, signal: {readonly aborted: boolean} = {aborted: false}) {
  try {
    const before = editor.snapshot.value;
    const project = readUIBuilderProject(before);
    const action = project.actions.find(a => a.id === actionId);
    if (!action?.execution) throw new Error("액션에 실행 스킬을 연결해 주세요.");
    const execution = action.execution;
    const skill = skills.find(s => s.id === execution.skill);
    if (!skill) throw new Error("연결한 실행 스킬을 사용할 수 없습니다.");
    const table = project.tables.find(t => t.id === execution.tableId);
    const recordId = selection[execution.tableId] ?? table?.data.records[0]?.id;
    const record = table?.data.records.find(r => r.id === recordId);
    if (!table || !record) throw new Error("실행할 업무를 선택해 주세요.");
    assertUIBuilderSkillContract(execution, table.fields, skill);
    const fieldIds = [...execution.inputFieldIds, ...execution.outputFieldIds];
    if (fieldIds.some(id => !table.fields.some(f => f.id === id))) throw new Error("실행에 연결한 필드를 찾을 수 없습니다.");
    const prerequisites = resolveUIBuilderActionPrerequisites(project, actionId, selection);
    if (!prerequisites.ok) throw new Error(prerequisites.reason);
    if (signal.aborted) throw new Error("실행을 취소했습니다.");
    const outputs = execution.outputFieldIds.map(id => table.fields.find(f => f.id === id)!);
    const values = await skill.run({action, recordId: record.id, input: JSON.parse(JSON.stringify(Object.fromEntries(execution.inputFieldIds.map(id => [id, record.values[id]!])))), outputs, signal});
    if (signal.aborted) throw new Error("실행을 취소했습니다.");
    if (editor.snapshot.value !== before) throw new Error("실행 중 데이터가 바뀌었습니다. 결과를 저장하지 않았으니 다시 실행해 주세요.");
    if (!isJSONValue(values) || Array.isArray(values) || !values || typeof values !== "object" || Object.keys(values).length !== outputs.length || outputs.some(f => !(f.id in values) || !acceptsDatabaseValue(f, values[f.id]!))) throw new Error(`스킬 결과가 출력 스키마와 일치하지 않습니다. 필요한 출력: ${outputs.map(f => `${f.id} (${f.type})`).join(", ")}. 받은 출력: ${values && typeof values === "object" ? Object.keys(values).join(", ") : typeof values}`);
    const result = applyUIBuilderMaterials(editor, [{type: "table.data", id: table.id, data: {...table.data, records: table.data.records.map(r => r.id === record.id ? {...r, values: {...r.values, ...values}} : r)}}]);
    return result.ok ? {ok: true as const, recordId: record.id, actionId} : result;
  } catch (e) {return {ok: false as const, reason: e instanceof Error ? e.message : String(e)};}
}

/** Append an authored record to an existing activity stream in one undoable document update.
 * The composer supplies an explicit target/actor; the command owns record identity and time.
 */
export function appendUIBuilderActivity(editor:ObjectEditor, composerId:string, body:string) {
  try {
    const project=readUIBuilderProject(editor.snapshot.value);
    const composer=project.objects.find(object=>object.id===composerId) as UIComponentObject | undefined;
    if (composer?.document.component!=="comment-composer" || !body.trim() || body.length>10000) throw new Error("작성할 기록을 확인해 주세요.");
    const {targetId,actor}=composer.document.props??{};
    const target=project.objects.find(object=>object.id===targetId) as UIComponentObject | undefined;
    if (typeof actor!=="string" || !actor.trim() || target?.document.component!=="activity-feed") throw new Error("기록 대상과 작성자를 연결해 주세요.");
    const stored=target.document.props?.entries;
    const entries=stored && typeof stored==="object" && !Array.isArray(stored) && "items" in stored && Array.isArray(stored.items) ? stored.items : [];
    const now=new Date();
    const entry={id:createEditingId("activity"),actor,action:"메모를 남겼습니다.",dateTime:now.toISOString(),timeLabel:now.toLocaleString("ko-KR"),detail:body.trim()};
    const next={...target,document:{...target.document,props:{...target.document.props,entries:{items:[...entries,entry]}}}};
    return editor.dispatch({type:"document.replace",document:{...project,objects:project.objects.map(object=>object.id===target.id?next:object)}});
  } catch(error) {return {ok:false as const,reason:error instanceof Error?error.message:String(error)};}
}
