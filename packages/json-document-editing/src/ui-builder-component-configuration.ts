import type { JSONValue } from "@interactive-os/json-document";
import { assertUIComponentContent, uiComponentCatalog, uiComponentCompositionRecipes, type UIComponentObject } from "@interactive-os/json-document-object-document";
import { assertUIBuilderProject, readUIBuilderProject } from "./ui-builder-materials.js";
import type { ObjectEditor } from "./object.js";

export interface UIBuilderComponentConfiguration {
  readonly objectId: string;
  /** Complete approved props. Omission preserves previous configuration. */
  readonly props?: Record<string, JSONValue>;
  readonly childIds?: readonly string[];
  /** null explicitly disconnects collection projection. */
  readonly collection?: {readonly tableId: string; readonly fieldIds: readonly string[]} | null;
}
/** Manual controls and agents publish validated properties/composition in the same undo step. */
export function applyUIBuilderComponentConfiguration(editor: ObjectEditor, changes: readonly UIBuilderComponentConfiguration[]) {
  try {
    const project = readUIBuilderProject(editor.snapshot.value);
    const updates = new Map<string, UIComponentObject>();
    for (const change of changes) {
      if (!change || Object.keys(change).some(key => !["objectId", "props", "childIds", "collection"].includes(key)) || updates.has(change.objectId)) throw new Error("중복되거나 알 수 없는 컴포넌트 설정입니다.");
      const original = project.objects.find(object => object.id === change.objectId) as UIComponentObject | undefined;
      if (!original) throw new Error("설정할 컴포넌트를 찾을 수 없습니다.");
      const document = {...original.document};
      if (change.props !== undefined) document.props = JSON.parse(JSON.stringify(change.props));
      if (change.childIds !== undefined) document.childIds = [...change.childIds];
      if (change.collection === null) delete document.collection;
      else if (change.collection !== undefined) document.collection = JSON.parse(JSON.stringify(change.collection));
      assertUIComponentContent(document);
      updates.set(change.objectId, {...original, document});
    }
    const next = {...project, objects: project.objects.map(object => updates.get(object.id) ?? object)};
    assertUIBuilderProject(next);
    return editor.dispatch({type: "document.replace", document: next});
  } catch (error) { return {ok: false, code: "ui-builder.invalid-component-configuration", reason: error instanceof Error ? error.message : String(error)}; }
}
export function createUIBuilderComponentConfigurationTools(editor: ObjectEditor) {
  let observed: unknown;
  return [
    {name: "read_ui_builder_component_catalog", description: "Read every canonical visual capability, category, source, allowed property schema, defaults and composition recipes. Map meaningful data fields to supported slots before constructing screens. Hooks and style handles are recipes, not mock leaf controls. Read before configuring.", parameters: {type: "object", properties: {}, required: [], additionalProperties: false}, execute(args: unknown) {
      if (!args || typeof args !== "object" || Array.isArray(args) || Object.keys(args).length) return {ok: false, code: "ui-builder.invalid-arguments"};
      observed = editor.snapshot.value;
      return {ok: true, catalog: uiComponentCatalog, recipes: uiComponentCompositionRecipes, document: editor.snapshot.value};
    }},
    {name: "configure_ui_builder_components", description: "Call read_ui_builder_component_catalog immediately before this tool, including after any other mutation; reading read_ui_builder_catalogs does not establish this tool's snapshot. Atomically configure approved component props, flat childIds composition and multi-field collection mappings. For table/detail-list/record-list/record-card use collection: {tableId, fieldIds}; those are existing material table/field IDs, not props or bindings. Only listed components change. Omitted fields preserve previous values; null collection disconnects; empty childIds removes composition. Props are complete replacements and must follow the component catalog whitelist. Read again after another tool changes the project. One batch is one undo.", parameters: {type: "object", properties: {changes: {type: "array", maxItems: 100, items: {type: "object", properties: {objectId: {type: "string"}, props: {type: "object", additionalProperties: true}, childIds: {type: "array", items: {type: "string"}, uniqueItems: true}, collection: {anyOf: [{type: "null"}, {type: "object", properties: {tableId: {type: "string"}, fieldIds: {type: "array", items: {type: "string"}, minItems: 1, uniqueItems: true}}, required: ["tableId", "fieldIds"], additionalProperties: false}]}}, required: ["objectId"], additionalProperties: false}}}, required: ["changes"], additionalProperties: false}, execute(args: unknown) {
      if (observed === undefined) return {ok: false, code: "ui-builder.read-required"};
      if (observed !== editor.snapshot.value) return {ok: false, code: "ui-builder.stale-document"};
      const value = args as {changes?: UIBuilderComponentConfiguration[]};
      if (!value || Object.keys(value).some(key => key !== "changes") || !Array.isArray(value.changes) || value.changes.length > 100) return {ok: false, code: "ui-builder.invalid-arguments"};
      const result = applyUIBuilderComponentConfiguration(editor, value.changes);
      if (result.ok) observed = editor.snapshot.value;
      return result;
    }},
  ];
}
