import { assertUIComponentContent, type UIComponentBinding, type UIComponentObject } from "@interactive-os/json-document-object-document";
import type { UIBuilderRecordSelection } from "./ui-builder-runtime.js";
import type { UIBuilderProject } from "./ui-builder-materials.js";

export interface UIBuilderProjection { readonly object: UIComponentObject; readonly issues: readonly string[]; }
const display = (value: unknown) => typeof value === "boolean" ? value ? "예" : "아니요" : String(value ?? "");
/** Pure live projection. Stored fallback content, geometry and history are never rewritten. */
export function resolveUIBuilderComponent(project: UIBuilderProject, object: UIComponentObject, selection: UIBuilderRecordSelection = {}): UIBuilderProjection {
  assertUIComponentContent(object.document);
  const content = {...object.document};
  let text = object.label;
  const issues: string[] = [];
  for (const binding of content.bindings ?? []) {
    const result = resolveBinding(project, object, {...binding, recordId: binding.recordId || (binding.mode === "value" ? selection[binding.tableId] ?? "" : "")});
    if (result.issue) issues.push(result.issue);
    const value = result.value;
    if (binding.target === "text") text = display(value);
    else if (binding.target === "detail") content.detail = display(value);
    else if (binding.target === "items") content.items = Array.isArray(value) ? value : [];
    else content.value = typeof value === "boolean" || typeof value === "number" || typeof value === "string" ? value : "";
  }
  if (content.actionId && !project.actions.some(a => a.id === content.actionId)) issues.push("연결한 액션을 찾을 수 없습니다.");
  return {object: {...object, label: text, document: content}, issues};
}
function resolveBinding(project: UIBuilderProject, object: UIComponentObject, binding: UIComponentBinding): {value: string | number | boolean | string[]; issue?: string} {
  const missing = (issue: string) => ({value: binding.target === "items" ? [] : "", issue});
  const table = project.tables.find(t => t.id === binding.tableId);
  if (!table) return missing("연결한 테이블을 찾을 수 없습니다.");
  if (binding.mode === "count") {
    if (binding.target === "value" && object.document.component === "checkbox") return missing("체크박스에는 참/거짓 필드를 연결해 주세요.");
    return {value: table.data.records.length};
  }
  const field = table.fields.find(f => f.id === binding.fieldId);
  if (!field) return missing(`${table.name}: 연결한 필드를 찾을 수 없습니다.`);
  const cell = (value: unknown) => field.type === "select" ? field.options.find(option => option.id === value)?.name ?? "" : display(value);
  if (binding.mode === "list") return {value: table.data.records.slice(0, 50).map(row => cell(row.values[field.id]).slice(0, 1000))};
  if (binding.mode === "sum") {
    if (field.type !== "number") return missing("합계에는 숫자 필드가 필요합니다.");
    if (binding.target === "value" && object.document.component === "checkbox") return missing("체크박스에는 참/거짓 필드를 연결해 주세요.");
    const total = table.data.records.reduce((sum, row) => sum + Number(row.values[field.id]), 0);
    return Number.isFinite(total) ? {value: total} : missing("합계가 표시 가능한 범위를 넘었습니다.");
  }
  if (binding.target === "value" && object.document.component === "checkbox" && field.type !== "checkbox") return missing("체크박스에는 참/거짓 필드를 연결해 주세요.");
  const record = binding.recordId ? table.data.records.find(row => row.id === binding.recordId) : table.data.records[0];
  if (!record) return binding.recordId ? missing("연결한 행을 찾을 수 없습니다.") : {value: ""};
  return {value: binding.target === "value" && field.type === "checkbox" ? Boolean(record.values[field.id]) : cell(record.values[field.id]).slice(0, 10000)};
}
