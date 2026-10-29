import type { UIComponentObject } from "@interactive-os/json-document-object-document";
import type { DatabaseDocument, DatabaseFilter } from "./database.js";
import { projectDatabaseTable } from "./database.js";
import { createDatabaseView } from "./database-view.js";
import { applyUIBuilderMaterials, readUIBuilderProject, type UIBuilderProject } from "./ui-builder-materials.js";
import { setUIBuilderInput, type UIBuilderRecordSelection } from "./ui-builder-runtime.js";
import type { ObjectEditor } from "./object.js";
export type UIBuilderRuntimeValues = Readonly<Record<string, string | number | boolean>>;
export interface UIBuilderCollectionProjection { readonly tableId: string; readonly name: string; readonly document: DatabaseDocument; readonly fieldIds: readonly string[]; readonly selectedRecordId: string | null; readonly selectionOutsideQuery?: boolean; }
/** Search/filter controls build a canonical Database view; no consumer-local query implementation. */
export function resolveUIBuilderTableData(project: UIBuilderProject, tableId: string, values: UIBuilderRuntimeValues = {}): DatabaseDocument | undefined {
  const table = project.tables.find(table => table.id === tableId);
  if (!table) return undefined;
  const sourceView = table.data.views[0]!;
  const rules: DatabaseFilter[] = [];
  let query = "";
  for (const raw of project.objects) {
    const object = raw as UIComponentObject;
    const p = object.document.props ?? {};
    if (p.targetTableId !== tableId) continue;
    const value = values[object.id] ?? object.document.value ?? "";
    if (value === "" || value === "전체") continue;
    const field = table.fields.find(field => field.id === p.fieldId);
    if (object.document.component === "search") {
      if (field) rules.push({id: object.id, propertyId: field.id, operator: "contains", value: String(value)});
      else query = String(value);
    } else if (["select", "filter-bar"].includes(object.document.component) && field) {
      rules.push({id: object.id, propertyId: field.id, operator: "equals", value: field.type === "select" ? field.options.find(option => option.name === value || option.id === value)?.id ?? value : value});
    }
  }
  const view = {...sourceView, projection: {...sourceView.projection, search: query || sourceView.projection.search, filter: {...sourceView.projection.filter, items: [...sourceView.projection.filter.items, ...rules]}}};
  const data = {...table.data, views: [view]};
  const recordIds = projectDatabaseTable(data, view.id).recordIds;
  const records = new Map(data.records.map(row => [row.id, row]));
  return {...data, records: recordIds.map(id => records.get(id)!)};
}
/** A collection keeps one record's fields together and follows shared row selection. */
export function resolveUIBuilderCollection(project: UIBuilderProject, object: UIComponentObject, selection: UIBuilderRecordSelection = {}, values: UIBuilderRuntimeValues = {}): UIBuilderCollectionProjection | undefined {
  const connection = object.document.collection;
  if (!connection) return undefined;
  const table = project.tables.find(table => table.id === connection.tableId);
  const data = resolveUIBuilderTableData(project, connection.tableId, values);
  if (!table || !data) return undefined;
  const propertyIds = data.schema.properties.map(property => property.id);
  const view = createDatabaseView(`${object.id}:collection`, table.name, propertyIds, "personal", {hiddenPropertyIds: propertyIds.filter(id => !connection.fieldIds.includes(id))});
  const selectedRecordId = selection[table.id] ?? data.records[0]?.id ?? null;
  const selectionOutsideQuery = !!selectedRecordId && table.data.records.some(record => record.id === selectedRecordId) && !data.records.some(record => record.id === selectedRecordId);
  return {tableId: table.id, name: table.name, document: {...data, records: ["detail-list", "record-card"].includes(object.document.component) ? table.data.records : data.records, views: [view]}, fieldIds: connection.fieldIds, selectedRecordId, selectionOutsideQuery};
}
/** Unbound input values are valid saved UI state; bound input writes the canonical table cell. */
export function setUIBuilderComponentValue(editor: ObjectEditor, object: UIComponentObject, value: string | number | boolean, selection: UIBuilderRecordSelection = {}) {
  if (object.document.bindings?.some(binding => binding.target === "value")) return setUIBuilderInput(editor, object, typeof value === "number" ? String(value) : value, selection);
  return editor.dispatch({type: "object.update", objectId: object.id, changes: {document: {...object.document, value}}});
}
/** Merge displayed collection cells into the full table, preserving rows hidden by search/filter. */
export function commitUIBuilderCollection(editor: ObjectEditor, object: UIComponentObject, document: DatabaseDocument) {
  const project = readUIBuilderProject(editor.snapshot.value);
  const table = project.tables.find(table => table.id === object.document.collection?.tableId);
  if (!table) return {ok: false as const, reason: "연결한 테이블을 찾을 수 없습니다."};
  const fields = new Set(object.document.collection!.fieldIds);
  const updates = new Map(document.records.map(record => [record.id, record]));
  return applyUIBuilderMaterials(editor, [{type: "table.data", id: table.id, data: {...table.data, records: table.data.records.map(record => {
    const update = updates.get(record.id);
    return update ? {...record, values: {...record.values, ...Object.fromEntries(Object.entries(update.values).filter(([id]) => fields.has(id)))}} : record;
  })}}]);
}
