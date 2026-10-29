import { getUIBuilderRootObjects } from "./ui-builder-composition.js";
import { assertUIComponentContent, assertUIFlowLayout, type UIFlowLayout, arrangeUIComponents, resolveUIFlowLayout, uiDesignCatalog, type UIComponentBinding, type UIComponentObject, type UIDesignId, type UILayoutId } from "@interactive-os/json-document-object-document";
import type { ObjectEditor } from "./object.js";
import { readUIBuilderProject, assertUIBuilderProject } from "./ui-builder-materials.js";
import { getUIBuilderPageObjects } from "./ui-builder-pages.js";
import { resolveUIBuilderComponent } from "./ui-builder-bindings.js";

export interface UIBuilderConnection {
  readonly objectId: string;
  readonly bindings: readonly UIComponentBinding[];
  /** Empty string disconnects the action. */
  readonly actionId: string;
}
export interface UIBuilderConfiguration {
  /** Reorder existing children without adding, removing or reparenting them. */
  readonly childOrders?: readonly {readonly objectId: string; readonly slot: "childIds" | "toolbarIds" | "inspectorIds"; readonly objectIds: readonly string[]}[] | undefined;
  readonly connections?: readonly UIBuilderConnection[];
  readonly designId?: UIDesignId;
  readonly flow?: UIFlowLayout;
  /** Scope flow publication to the displayed page without changing the start page. */
  readonly pageId?: string;
  /** Empty objectIds explicitly arranges the active page. */
  readonly layout?: {readonly id: UILayoutId; readonly objectIds: readonly string[]};
}
/** Attach IDs, select a visual recipe, or explicitly arrange objects in one undo step. */
export function applyUIBuilderConfiguration(editor: ObjectEditor, change: UIBuilderConfiguration) {
  try {
    let project = readUIBuilderProject(editor.snapshot.value);
    const orders = new Set<string>();
    const pageIds = new Set(getUIBuilderPageObjects(project, change.pageId).map(object => object.id));
    for (const order of change.childOrders ?? []) {
      const key = `${order.objectId}:${order.slot}`;
      if (orders.has(key) || !pageIds.has(order.objectId) || !["childIds", "toolbarIds", "inspectorIds"].includes(order.slot)) throw new Error("현재 페이지의 자식 순서를 확인해 주세요.");
      orders.add(key);
      const parent = project.objects.find(object => object.id === order.objectId) as UIComponentObject;
      const existing = order.slot === "childIds" ? parent.document.childIds ?? [] : parent.document.props?.[order.slot] ?? [];
      if (!Array.isArray(existing) || !Array.isArray(order.objectIds) || existing.length !== order.objectIds.length || new Set(order.objectIds).size !== order.objectIds.length || order.objectIds.some(id => !existing.includes(id))) throw new Error("자식 순서 변경은 기존 요소를 모두 한 번씩 포함해야 합니다.");
      if (parent.document.component === "record-workspace" && order.slot === "childIds" && order.objectIds.some((id, index) => id !== existing[index])) throw new Error("작업 공간의 역할 순서는 유지하고 각 영역 안의 요소를 정리해 주세요.");
      const document = order.slot === "childIds" ? {...parent.document, childIds: [...order.objectIds]} : {...parent.document, props: {...parent.document.props, [order.slot]: [...order.objectIds]}};
      project = {...project, objects: project.objects.map(object => object.id === parent.id ? {...parent, document} : object)};
    }
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
      const pageObjects = getUIBuilderRootObjects(getUIBuilderPageObjects(project, change.pageId) as readonly UIComponentObject[]);
      if (ids.length !== pageObjects.length || ids.some(id => !pageObjects.some(o => o.id === id))) {
        const missing=pageObjects.filter(object=>!ids.includes(object.id)).map(object=>`${object.label || object.document.component} (${object.id})`);
        const unexpected=ids.filter(id=>!pageObjects.some(object=>object.id===id));
        throw new Error(`현재 페이지의 rootObjectIds를 정확히 한 번씩 배치해 주세요.${missing.length ? ` 누락: ${missing.join(", ")}.` : ""}${unexpected.length ? ` 최상위에 놓을 수 없는 ID: ${unexpected.join(", ")}. 중첩 자식은 기존 부모 안에 유지하세요.` : ""} 기존 행·열을 보존하며 이 누락·초과만 수정해 다시 적용하세요.`);
      }
      const pageIds = new Set(pageObjects.map(object => object.id));
      const otherFlow = resolveUIFlowLayout(getUIBuilderRootObjects(project.objects as readonly UIComponentObject[]).filter(object => !pageIds.has(object.id)), project.flow);
      project = {...project, flow: JSON.parse(JSON.stringify({rows: [...otherFlow.rows, ...change.flow.rows]})) as UIFlowLayout};
    }
    if (change.layout) {
      const {id, objectIds} = change.layout;
      if (!Array.isArray(objectIds) || new Set(objectIds).size !== objectIds.length || objectIds.some(key => !project.objects.some(o => o.id === key))) throw new Error("정리할 요소를 확인해 주세요.");
      const scope = objectIds.length ? project.objects.filter(o => objectIds.includes(o.id)) : getUIBuilderPageObjects(project);
      const arranged = new Map(arrangeUIComponents(scope, id, project.width).map(o => [o.id, o]));
      project = {...project, objects: project.objects.map(o => arranged.get(o.id) ?? o)};
    }
    assertUIBuilderProject(project);
    return editor.dispatch({type: "document.replace", document: project});
  } catch (error) { return {ok: false as const, reason: error instanceof Error ? error.message : String(error)}; }
}
