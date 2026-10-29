import type { JSONValue } from "@interactive-os/json-document";
import type { CanvasDocument, CanvasObject, CanvasObjectDraft, ObjectDraft, ObjectBounds } from "./object-model.js";
import { assertUIComponentBindings, type UIComponentBinding, type UIBindingTarget } from "./ui-binding.js";
import { assertCanvasDocument } from "./object-validation.js";

/** Closed component vocabulary. Rendering is owned by Canvas, never supplied as code. */
export { uiComponentCatalog } from "./ui-component-catalog.js";
import { uiComponentCatalog, assertUIComponentProperties, recordWorkspaceSlotProperties } from "./ui-component-catalog.js";
export type UIComponentKind = typeof uiComponentCatalog[number]["id"];
export type UIComponentContent = Record<string, JSONValue> & {
  readonly props?: Record<string, JSONValue>;
  readonly childIds?: readonly string[];
  readonly collection?: { readonly tableId: string; readonly fieldIds: readonly string[] };
  readonly bindings?: readonly UIComponentBinding[];
  readonly actionId?: string;
  readonly pageId?: string;
  readonly targetPageId?: string;
  readonly value?: string | number | boolean;
  readonly component: UIComponentKind;
  readonly detail: string;
  readonly items: readonly string[];
  readonly tone: "default" | "accent" | "quiet";
}
export const uiComponentDocumentType = "ui-component/1";
export interface UIComponentObject extends ObjectDraft { readonly id: string; readonly kind: "embedded-document"; readonly documentType: string; readonly document: UIComponentContent; }

/** Canonical child references, including named shell slots. */
/** Named workspace references preserve slot meaning when optional regions are absent. */
export function uiComponentSlotIds(content: UIComponentContent): readonly (string | undefined)[] {
  if (content.component !== "record-workspace") return [];
  const named = recordWorkspaceSlotProperties.map(key => typeof content.props?.[key] === "string" && content.props[key] ? String(content.props[key]) : undefined);
  return named.some(Boolean) ? named : recordWorkspaceSlotProperties.map((_, index) => content.childIds?.[index]);
}
export function uiBuilderComponentChildIds(object: UIComponentObject): readonly string[] {
  const content = object.document;
  const props = content.props ?? {};
  const children = content.component === "record-workspace" && recordWorkspaceSlotProperties.some(key => props[key]) ? uiComponentSlotIds(content).filter((id): id is string => !!id) : content.childIds ?? [];
  return [...children, ...[props.toolbarIds, props.inspectorIds].flatMap(value => Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [])];
}
/** One reference mapper serves duplication and removal; valid legacy slots become named. */
export function mapUIComponentChildren(content: UIComponentContent, map: (id: string) => string | undefined): UIComponentContent {
  const next = {...content};
  const props = {...content.props};
  if (content.component === "record-workspace") {
    if ((content.childIds?.length ?? 0) > recordWorkspaceSlotProperties.length) throw new Error("작업 공간의 여섯 영역을 이름으로 연결해 주세요.");
    uiComponentSlotIds(content).forEach((id, index) => {
      const key = recordWorkspaceSlotProperties[index]!;
      const mapped = id ? map(id) : undefined;
      if (mapped) props[key] = mapped; else delete props[key];
    });
    delete next.childIds;
  } else if (content.childIds) next.childIds = content.childIds.flatMap(id => {const mapped = map(id); return mapped ? [mapped] : [];});
  for (const key of ["toolbarIds", "inspectorIds"]) if (Array.isArray(props[key])) props[key] = props[key].flatMap(id => {const mapped = map(String(id)); return mapped ? [mapped] : [];});
  if (content.props || Object.keys(props).length) next.props = props;
  return next;
}

export function assertUIComponentContent(value: unknown): asserts value is UIComponentContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid component content.");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(key => !["component", "detail", "items", "tone", "bindings", "actionId", "value", "pageId", "targetPageId", "props", "childIds", "collection"].includes(key))
    || !uiComponentCatalog.some(item => item.id === v.component)
    || typeof v.detail !== "string" || v.detail.length > 10000
    || !Array.isArray(v.items) || v.items.length > 50 || v.items.some(item => typeof item !== "string" || item.length > 1000)
    || !["default", "accent", "quiet"].includes(v.tone as string)) throw new TypeError("Unknown component or invalid properties.");
  assertUIComponentProperties(v.component as UIComponentKind, v.props);
  if (v.component === "record-workspace" && Array.isArray(v.childIds) && v.childIds.length && recordWorkspaceSlotProperties.some(key => (v.props as Record<string, JSONValue> | undefined)?.[key])) throw new TypeError("작업 공간의 이름 참조와 순서 참조를 혼용하지 마세요.");
  if (v.childIds !== undefined && (!Array.isArray(v.childIds) || v.childIds.some(id => typeof id !== "string" || !id) || new Set(v.childIds).size !== v.childIds.length)) throw new TypeError("자식 요소 ID를 확인해 주세요.");
  if (Array.isArray(v.childIds) && v.childIds.length && !["page-header", "empty-state", "inline-alert", "filter-bar", "record-facts", "property-editor", "result-panel", "record-workspace", "group", "card", "record-card", "product-shell", "product-canvas", "product-inspector", "toolbar", "toolbar-group", "toolbar-layout", "toolbar-region", "contextual-controls", "popover", "dialog", "disclosure", "chat-bubble", "file-drop"].includes(String(v.component))) throw new TypeError("이 컴포넌트는 내부 자식 요소를 지원하지 않습니다.");
  if (v.collection !== undefined && !["table", "detail-list", "record-list", "record-card"].includes(String(v.component))) throw new TypeError("컬렉션은 표 또는 레코드 목록에 연결할 수 있습니다.");
  if (v.collection !== undefined) {
    const collection = v.collection as Record<string, unknown>;
    if (!collection || typeof collection !== "object" || Object.keys(collection).some(key => !["tableId", "fieldIds"].includes(key)) || typeof collection.tableId !== "string" || !collection.tableId || !Array.isArray(collection.fieldIds) || !collection.fieldIds.length || collection.fieldIds.some(id => typeof id !== "string" || !id) || new Set(collection.fieldIds).size !== collection.fieldIds.length) throw new TypeError("레코드 컬렉션 연결을 확인해 주세요.");
  }
  if (v.bindings !== undefined) assertUIComponentBindings(v.bindings, uiComponentCatalog.find(item => item.id === v.component)!.bindingTargets as readonly UIBindingTarget[]);
  if (v.actionId !== undefined && (v.component !== "button" || typeof v.actionId !== "string" || !v.actionId)) throw new TypeError("액션은 버튼에 연결할 수 있습니다.");
  if (v.pageId !== undefined && (typeof v.pageId !== "string" || !v.pageId.trim())) throw new TypeError("페이지 ID를 확인해 주세요.");
  if (v.targetPageId !== undefined && (v.component !== "page-link" || typeof v.targetPageId !== "string" || !v.targetPageId.trim())) throw new TypeError("페이지 이동 대상을 확인해 주세요.");
  if (v.value !== undefined && !["string", "number", "boolean"].includes(typeof v.value)) throw new TypeError("입력 값을 확인해 주세요.");
}
export function createUIComponentObject(component: UIComponentKind, position: Pick<ObjectBounds, "x" | "y">, content: Partial<Pick<UIComponentContent, "detail" | "items" | "tone">> & { readonly text?: string } = {}): CanvasObjectDraft {
  const entry = uiComponentCatalog.find(item => item.id === component);
  if (!entry) throw new TypeError("Unknown component.");
  const document = { props: {...entry.defaultProps}, component, detail: content.detail ?? entry.detail, items: [...(content.items ?? entry.items)], tone: content.tone ?? (component === "button" ? "accent" : "default") };
  assertUIComponentContent(document);
  return { kind: "embedded-document", documentType: uiComponentDocumentType, document, x: position.x, y: position.y,
    width: entry.width, height: entry.height, label: content.text ?? entry.text, color: "transparent" };
}
export function assertUIBuilderDocument(value: unknown): asserts value is CanvasDocument {
  assertCanvasDocument(value);
  for (const object of value.objects) {
    if (object.kind !== "embedded-document" || object.documentType !== uiComponentDocumentType || object.parentId !== undefined)
      throw new TypeError("UI Builder accepts registered components only.");
    assertUIComponentContent(object.document);
    if (object.label.length > 10000) throw new TypeError("Component text is too long.");
  }
}
