import { assertUIComponentContent, assertUIFlowLayout, type UIFlowLayout, arrangeUIComponents, uiDesignCatalog, type UIComponentBinding, type UIComponentObject, type UIDesignId, type UILayoutId } from "@interactive-os/json-document-object-document";
import type { ObjectEditor } from "./object.js";
import { readUIBuilderProject, assertUIBuilderProject } from "./ui-builder-materials.js";
import { resolveUIBuilderComponent } from "./ui-builder-bindings.js";

export interface UIBuilderConnection {
  readonly objectId: string;
  readonly bindings: readonly UIComponentBinding[];
  /** Empty string disconnects the action. */
  readonly actionId: string;
}
export interface UIBuilderConfiguration {
  readonly connections?: readonly UIBuilderConnection[];
  readonly designId?: UIDesignId;
  readonly flow?: UIFlowLayout;
  /** Empty objectIds explicitly arranges the whole page. */
  readonly layout?: {readonly id: UILayoutId; readonly objectIds: readonly string[]};
}
/** Attach IDs, select a visual recipe, or explicitly arrange objects in one undo step. */
export function applyUIBuilderConfiguration(editor: ObjectEditor, change: UIBuilderConfiguration) {
  try {
    let project = readUIBuilderProject(editor.snapshot.value);
    const seen = new Set<string>();
    for (const connection of change.connections ?? []) {
      if (!connection || typeof connection.objectId !== "string" || typeof connection.actionId !== "string" || seen.has(connection.objectId)) throw new Error("연결할 요소를 확인해 주세요.");
      seen.add(connection.objectId);
      const original = project.objects.find(o => o.id === connection.objectId) as UIComponentObject | undefined;
      if (!original) throw new Error("연결할 요소를 찾을 수 없습니다.");
      const {bindings: _, actionId: __, ...content} = original.document;
      const next = {...original, document: {...content, bindings: JSON.parse(JSON.stringify(connection.bindings)), ...(connection.actionId ? {actionId: connection.actionId} : {})}};
      assertUIComponentContent(next.document);
      const projected = resolveUIBuilderComponent(project, next as UIComponentObject);
      if (projected.issues.length) throw new Error(projected.issues.join(" "));
      project = {...project, objects: project.objects.map(o => o.id === next.id ? next as UIComponentObject : o)};
    }
    if (change.designId !== undefined) {
      if (!uiDesignCatalog.some(d => d.id === change.designId)) throw new Error("등록된 디자인을 선택해 주세요.");
      project = {...project, designId: change.designId};
    }
    if (change.flow !== undefined) {
      assertUIFlowLayout(change.flow);
      const ids = change.flow.rows.flatMap(row => row.columns.flatMap(column => column.items.map(item => item.objectId)));
      if (ids.length !== project.objects.length || ids.some(id => !project.objects.some(o => o.id === id))) throw new Error("현재 요소 전체를 자동 흐름에 포함해 주세요.");
      project = {...project, flow: JSON.parse(JSON.stringify(change.flow)) as UIFlowLayout};
    }
    if (change.layout) {
      const {id, objectIds} = change.layout;
      if (!Array.isArray(objectIds) || new Set(objectIds).size !== objectIds.length || objectIds.some(key => !project.objects.some(o => o.id === key))) throw new Error("정리할 요소를 확인해 주세요.");
      const scope = objectIds.length ? project.objects.filter(o => objectIds.includes(o.id)) : project.objects;
      const arranged = new Map(arrangeUIComponents(scope, id, project.width).map(o => [o.id, o]));
      project = {...project, objects: project.objects.map(o => arranged.get(o.id) ?? o)};
    }
    assertUIBuilderProject(project);
    return editor.dispatch({type: "document.replace", document: project});
  } catch (error) { return {ok: false as const, reason: error instanceof Error ? error.message : String(error)}; }
}
