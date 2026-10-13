import { isJSONValue, type JSONValue } from "@interactive-os/json-document";
import { assertUIBuilderDocument, uiDesignCatalog, type UIDesignId, type CanvasDocument } from "@interactive-os/json-document-object-document";
import type { DatabaseDocument, DatabaseProperty, DatabaseRecord } from "./database.js";
import { createDatabaseView } from "./database-view.js";
import { assertDatabaseDocument } from "./database-validation.js";
import { acceptsDatabaseValue, defaultDatabaseValue } from "./database-property-value.js";
import { createEditingId } from "./identity.js";
import type { ObjectEditor } from "./object.js";
import { assertUIBuilderActionExecution, type UIBuilderActionExecution } from "./ui-builder-runtime.js";

export const uiBuilderSampleKinds = ["auto", "name", "email", "company", "product", "sentence", "date", "url"] as const;
export type UIBuilderSampleKind = typeof uiBuilderSampleKinds[number];
export interface UIBuilderField extends DatabaseProperty { readonly sample: UIBuilderSampleKind; }
export interface UIBuilderTable extends Record<string, JSONValue> {
  readonly id: string;
  readonly name: string;
  readonly fields: readonly UIBuilderField[];
  readonly data: DatabaseDocument;
}
export type UIBuilderAction = Record<string, JSONValue> & {
  readonly execution?: UIBuilderActionExecution;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inputs: readonly DatabaseProperty[];
  readonly outputs: readonly DatabaseProperty[];
}
export interface UIBuilderProject extends CanvasDocument {
  readonly designId: UIDesignId;
  readonly tables: readonly UIBuilderTable[];
  readonly actions: readonly UIBuilderAction[];
}
/** Generator is injected: Editing owns schema reconciliation, never a random-data library. */
export type UIBuilderSampleGenerator = (field: UIBuilderField) => JSONValue;
export type UIBuilderMaterialCommand =
  | { readonly type: "table.save"; readonly id: string; readonly name: string; readonly fields: readonly UIBuilderField[] }
  | { readonly type: "table.remove"; readonly id: string }
  | { readonly type: "table.data"; readonly id: string; readonly data: DatabaseDocument }
  | { readonly type: "table.generate"; readonly id: string; readonly count: number; readonly mode: "append" | "replace" }
  | { readonly type: "action.save"; readonly action: UIBuilderAction }
  | { readonly type: "action.remove"; readonly id: string };

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function named(v: unknown): asserts v is Record<string, unknown> & {id: string; name: string} {
  if (!object(v) || typeof v.id !== "string" || !v.id.trim() || typeof v.name !== "string" || !v.name.trim()) throw new Error("이름과 ID가 필요합니다.");
}
function unique(values: readonly {id: string}[]) {
  if (new Set(values.map(v => v.id)).size !== values.length) throw new Error("ID가 중복되었습니다.");
}
function fields(value: unknown, sample: boolean): asserts value is readonly UIBuilderField[] {
  if (!Array.isArray(value) || value.length > 50) throw new Error("필드는 최대 50개입니다.");
  value.forEach(field => {
    named(field);
    if (!object(field) || !["title", "text", "number", "checkbox", "select"].includes(String(field.type)) || !Array.isArray(field.options)) throw new Error("필드 타입을 확인해 주세요.");
    field.options.forEach(named); unique(field.options);
    if (field.type === "select" && field.options.length === 0) throw new Error("선택 필드에는 항목이 필요합니다.");
    if (sample && !uiBuilderSampleKinds.includes(field.sample as UIBuilderSampleKind)) throw new Error("예시 생성 방식을 확인해 주세요.");
  });
  unique(value);
}
/** Legacy canvas-only documents acquire empty catalogs without losing objects. */
export function readUIBuilderProject(value: unknown): UIBuilderProject {
  assertUIBuilderDocument(value);
  const project = { ...value, designId: value.designId === undefined ? "clean" : value.designId, tables: value.tables === undefined ? [] : value.tables, actions: value.actions === undefined ? [] : value.actions } as UIBuilderProject;
  assertUIBuilderProject(project);
  return project;
}
export function assertUIBuilderProject(value: unknown): asserts value is UIBuilderProject {
  assertUIBuilderDocument(value);
  if (!isJSONValue(value) || !Array.isArray(value.tables) || !Array.isArray(value.actions)) throw new Error("데이터·액션 목록을 확인해 주세요.");
  const project = value as UIBuilderProject;
  if (!uiDesignCatalog.some(entry => entry.id === project.designId)) throw new Error("등록된 디자인을 선택해 주세요.");
  unique(project.tables); unique(project.actions);
  for (const table of project.tables) {
    named(table); fields(table.fields, true);
    if (!table.fields.length || !object(table.data) || !object(table.data.schema) || !Array.isArray(table.data.records) || !Array.isArray(table.data.views) || table.data.views.length !== 1) throw new Error("테이블 스키마가 필요합니다.");
    if (JSON.stringify(table.data.schema.properties) !== JSON.stringify(table.fields)) throw new Error("테이블 필드와 스키마가 일치하지 않습니다.");
    if (table.data.records.length > 1000) throw new Error("프로토타입은 테이블당 1,000행까지 지원합니다.");
    assertDatabaseDocument(table.data);
  }
  for (const action of project.actions) {
    named(action);
    if (typeof action.description !== "string") throw new Error("액션 설명을 확인해 주세요.");
    fields(action.inputs, false); fields(action.outputs, false);
    if (action.execution !== undefined) assertUIBuilderActionExecution(action.execution);
  }
}
function tableData(id: string, properties: readonly UIBuilderField[], records: readonly DatabaseRecord[]): DatabaseDocument {
  // Independent copies keep JSON Document's tree invariant (no aliased nodes).
  return { schema: { properties: JSON.parse(JSON.stringify(properties)) as UIBuilderField[] }, records,
    views: [createDatabaseView(`${id}:view`, "전체", properties.map(p => p.id), "personal", {hiddenPropertyIds: []})] };
}
/** Apply one or more material changes as one parent-document undo step. Invalid batches never commit. */
export function applyUIBuilderMaterials(editor: ObjectEditor, commands: readonly UIBuilderMaterialCommand[], generate?: UIBuilderSampleGenerator) {
  try {
    let project = readUIBuilderProject(editor.snapshot.value);
    for (const command of commands) {
      if (command.type === "action.save") {
        const action = JSON.parse(JSON.stringify({ ...command.action, id: command.action.id || createEditingId("action") })) as UIBuilderAction;
        project = { ...project, actions: project.actions.some(a => a.id === action.id) ? project.actions.map(a => a.id === action.id ? action : a) : [...project.actions, action] };
      } else if (command.type === "action.remove") {
        if (!project.actions.some(a => a.id === command.id)) throw new Error("액션을 찾을 수 없습니다.");
        project = { ...project, actions: project.actions.filter(a => a.id !== command.id) };
      } else {
        const existing = project.tables.find(t => t.id === command.id);
        if (command.type !== "table.save" && !existing) throw new Error("테이블을 찾을 수 없습니다.");
        let table: UIBuilderTable | undefined;
        if (command.type === "table.save") {
          fields(command.fields, true);
          const id = command.id || createEditingId("table");
          const nextFields = JSON.parse(JSON.stringify(command.fields)) as UIBuilderField[];
          const records = (existing?.data.records ?? []).map(row => ({id: row.id, values: Object.fromEntries(nextFields.map(p => [p.id, acceptsDatabaseValue(p, row.values[p.id] ?? null) ? row.values[p.id]! : defaultDatabaseValue(p)]))}));
          table = {id, name: command.name, fields: nextFields, data: tableData(id, nextFields, records)};
        } else if (command.type === "table.data") {
          table = { ...existing!, data: JSON.parse(JSON.stringify(command.data)) as DatabaseDocument };
        } else if (command.type === "table.generate") {
          if (!generate) throw new Error("예시 데이터 생성기가 연결되지 않았습니다.");
          if (!Number.isInteger(command.count) || command.count < 1 || command.count > 1000 || !["append", "replace"].includes(command.mode)) throw new Error("생성할 행 수는 1~1,000 사이여야 합니다.");
          const before = command.mode === "append" ? existing!.data.records : [];
          if (before.length + command.count > 1000) throw new Error("테이블당 최대 1,000행입니다.");
          const added = Array.from({length: command.count}, () => ({id: createEditingId("record"), values: Object.fromEntries(existing!.fields.map(field => [field.id, generate(field)]))}));
          table = {...existing!, data: {...existing!.data, records: [...before, ...added]}};
        } else if (command.type !== "table.remove") throw new Error("지원하지 않는 명령입니다.");
        project = {...project, tables: table ? existing ? project.tables.map(t => t.id === existing.id ? table! : t) : [...project.tables, table] : project.tables.filter(t => t.id !== command.id)};
      }
      assertUIBuilderProject(project);
    }
    return editor.dispatch({type: "document.replace", document: project});
  } catch (error) { return {ok: false as const, reason: error instanceof Error ? error.message : String(error)}; }
}
