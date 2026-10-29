import { resolveUIBuilderCollection, resolveUIBuilderTableData, type UIBuilderCollectionProjection, type UIBuilderRuntimeValues } from "./ui-builder-collections.js";
import { assertUIDomainCardMapping, uiBuilderComponentChildIds, assertUIComponentContent, type UIComponentBinding, type UIComponentObject } from "@interactive-os/json-document-object-document";
import type { UIBuilderRecordSelection } from "./ui-builder-runtime.js";
import type { UIBuilderProject } from "./ui-builder-materials.js";

export interface UIBuilderProjection { readonly object: UIComponentObject; readonly issues: readonly string[]; readonly collection?: UIBuilderCollectionProjection; readonly recordIds?: readonly string[]; readonly selectionMissing: boolean; }
const display = (value: unknown) => typeof value === "boolean" ? value ? "예" : "아니요" : String(value ?? "");
/** Pure live projection. Stored fallback content, geometry and history are never rewritten. */
export function resolveUIBuilderComponent(project: UIBuilderProject, object: UIComponentObject, selection: UIBuilderRecordSelection = {}, values: UIBuilderRuntimeValues = {}): UIBuilderProjection {
  assertUIComponentContent(object.document);
  let content = {...object.document};
  let text = object.label;
  const issues: string[] = [];
  let recordIds: readonly string[] | undefined;
  const selectionTables = [
    ...(content.bindings ?? []).filter(binding => binding.mode === "value" && !binding.recordId).map(binding => binding.tableId),
    ...(["detail-list", "record-card"].includes(content.component) && content.collection ? [content.collection.tableId] : []),
    ...project.actions.filter(action => action.id === content.actionId && action.execution).map(action => action.execution!.tableId),
  ];
  let selectionMissing = selectionTables.some(id => {
    const table = project.tables.find(candidate => candidate.id === id);
    return table !== undefined && (selection[id] === "" || table.data.records.length === 0);
  });
  const childIds = uiBuilderComponentChildIds(object);
  if (!selectionMissing && childIds.length) {
    selectionMissing = childIds.every(id => {
      const child = project.objects.find(candidate => candidate.id === id) as UIComponentObject | undefined;
      return child !== undefined && resolveUIBuilderComponent(project, child, selection, values).selectionMissing;
    });
  }
  for (const binding of content.bindings ?? []) {
    const emptySelection = binding.mode === "value" && !binding.recordId && selection[binding.tableId] === "";
    const result = emptySelection ? {value: binding.target === "value" && object.document.component === "checkbox" ? false : ""} : resolveBinding(project, object, {...binding, recordId: binding.recordId || (binding.mode === "value" ? selection[binding.tableId] ?? "" : "")}, values);
    if (binding.mode === "list") recordIds = resolveUIBuilderTableData(project, binding.tableId, values)?.records.slice(0, 50).map(row => row.id);
    if (result.issue) issues.push(result.issue);
    const value = result.value;
    if (binding.target === "text") text = display(value);
    else if (binding.target === "detail") content.detail = display(value);
    else if (binding.target === "items") content.items = Array.isArray(value) ? value : [];
    else content.value = typeof value === "boolean" || typeof value === "number" || typeof value === "string" ? value : "";
  }
  if (content.actionId && !project.actions.some(a => a.id === content.actionId)) issues.push("연결한 액션을 찾을 수 없습니다.");
  if (values[object.id] !== undefined) content.value = values[object.id];
  if (content.component === "tabs" && Array.isArray(content.props?.pageIds)) {
    const pageIndex = content.props.pageIds.indexOf(content.pageId ?? project.activePageId);
    if (pageIndex >= 0 && content.items[pageIndex] !== undefined) content.value = content.items[pageIndex];
  }
  if (content.component === "sidebar-navigation") content = {...content, props: {...content.props, currentPageId: object.document.pageId ?? project.activePageId}};
  if (["property-editor","record-facts"].includes(content.component) && !content.props?.labels) content = {...content, props: {...content.props, labels: (content.childIds ?? []).map(id => project.objects.find(child => child.id === id)?.label ?? "")}};
  if (content.component === "record-card" && content.collection) {
    const table = project.tables.find(table => table.id === content.collection!.tableId);
    try { assertUIDomainCardMapping(content.props ?? {}, table?.fields ?? [], content.collection.fieldIds); }
    catch (error) { issues.push(error instanceof Error ? error.message : "도메인 카드 연결을 확인해 주세요."); }
  }
  return {object: {...object, label: text, document: content}, issues, selectionMissing, collection: resolveUIBuilderCollection(project, object, selection, values), recordIds};
}
function resolveBinding(project: UIBuilderProject, object: UIComponentObject, binding: UIComponentBinding, values: UIBuilderRuntimeValues): {value: string | number | boolean | string[]; issue?: string} {
  const missing = (issue: string) => ({value: binding.target === "items" ? [] : "", issue});
  const table = project.tables.find(t => t.id === binding.tableId);
  if (!table) return missing("연결한 테이블을 찾을 수 없습니다.");
  if (binding.mode === "count") {
    if (binding.target === "value" && object.document.component === "checkbox") return missing("체크박스에는 참/거짓 필드를 연결해 주세요.");
    return {value: table.data.records.length};
  }
  const data = resolveUIBuilderTableData(project, table.id, values) ?? table.data;
  const field = table.fields.find(f => f.id === binding.fieldId);
  if (!field) return missing(`${table.name}: 연결한 필드를 찾을 수 없습니다.`);
  const cell = (value: unknown) => field.type === "select" ? field.options.find(option => option.id === value)?.name ?? "" : display(value);
  if (binding.mode === "list") return {value: data.records.slice(0, 50).map(row => cell(row.values[field.id]).slice(0, 1000))};
  if (binding.mode === "sum") {
    if (field.type !== "number") return missing("합계에는 숫자 필드가 필요합니다.");
    if (binding.target === "value" && object.document.component === "checkbox") return missing("체크박스에는 참/거짓 필드를 연결해 주세요.");
    const total = table.data.records.reduce((sum, row) => sum + Number(row.values[field.id]), 0);
    return Number.isFinite(total) ? {value: total} : missing("합계가 표시 가능한 범위를 넘었습니다.");
  }
  if (binding.target === "value" && object.document.component === "checkbox" && field.type !== "checkbox") return missing("체크박스에는 참/거짓 필드를 연결해 주세요.");
  const record = binding.recordId ? table.data.records.find(row => row.id === binding.recordId) : table.data.records[0];
  if (!record) return binding.recordId ? missing("연결한 행을 찾을 수 없습니다.") : {value: ""};
  if (binding.target === "value" && object.document.component === "people-picker") return {value:display(record.values[field.id])};
  return {value: binding.target === "value" && field.type === "checkbox" ? Boolean(record.values[field.id]) : binding.target === "value" && field.type === "number" ? typeof record.values[field.id] === "number" ? record.values[field.id] as number : "" : cell(record.values[field.id]).slice(0, 10000)};
}
