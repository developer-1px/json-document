import { createEditingIdAllocator, createEditingId } from "./identity.js";
import type { ObjectPastePlacement } from "./object.js";
import { assertUIDomainCardMapping, mapUIComponentChildren, uiBuilderComponentChildIds, type UIComponentObject } from "@interactive-os/json-document-object-document";
export { uiBuilderComponentChildIds } from "@interactive-os/json-document-object-document";
import type { UIBuilderProject } from "./ui-builder-materials.js";
import { resolveUIBuilderPageId } from "./ui-builder-pages.js";
/** Flat document references compose canonical content without a second tree model. */
export function getUIBuilderRootObjects(objects: readonly UIComponentObject[]): readonly UIComponentObject[] {
  const nested = new Set(objects.flatMap(uiBuilderComponentChildIds));
  return objects.filter(object => !nested.has(object.id));
}
export function assertUIBuilderComposition(project: UIBuilderProject) {
  const objects = new Map(project.objects.map(object => [object.id, object as UIComponentObject]));
  const parent = new Map<string, string>();
  for (const object of objects.values()) {
    for (const id of uiBuilderComponentChildIds(object)) {
      const child = objects.get(id);
      if (!child) throw new Error("조합할 자식 요소를 찾을 수 없습니다.");
      if (parent.has(id)) throw new Error("하나의 요소는 한 조합의 한 위치에만 배치할 수 있습니다.");
      parent.set(id, object.id);
      if (resolveUIBuilderPageId(project, object.document.pageId) !== resolveUIBuilderPageId(project, child.document.pageId)) throw new Error("조합 요소는 같은 페이지에 있어야 합니다.");
    }
    const queryTarget = object.document.props?.targetTableId;
    if (typeof queryTarget === "string" && queryTarget) {
      const table = project.tables.find(table => table.id === queryTarget);
      if (!table) throw new Error("검색·필터 대상 테이블을 찾을 수 없습니다.");
      const fieldId = object.document.props?.fieldId;
      if ((object.document.component === "select" || fieldId) && !table.fields.some(field => field.id === fieldId)) throw new Error("검색·필터 대상 필드를 찾을 수 없습니다.");
    }
    const c = object.document.collection;
    if (c) {
      const table = project.tables.find(table => table.id === c.tableId);
      if (!table || c.fieldIds.some(id => !table.fields.some(field => field.id === id))) throw new Error("컬렉션의 테이블과 필드를 확인해 주세요.");
      if (object.document.component === "record-card") assertUIDomainCardMapping(object.document.props ?? {}, table.fields, c.fieldIds);
    }
    if (object.document.component === "property-editor" && Array.isArray(object.document.props?.labels) && object.document.props.labels.length !== (object.document.childIds?.length ?? 0)) throw new Error("속성명과 자식 요소의 개수를 맞춰 주세요.");
    for (const key of ["actionCount", "footerCount"]) {
      const count = object.document.props?.[key];
      if (count !== undefined && (typeof count !== "number" || !Number.isInteger(count) || count < 0 || count > (object.document.childIds?.length ?? 0))) throw new Error("하단 행동의 개수와 자식 요소를 확인해 주세요.");
    }
    if (c) for (const key of ["titleFieldId", "summaryFieldId", "identifierFieldId", "statusFieldId", "assigneeFieldId", "updatedAtFieldId", "priorityFieldId", "unreadFieldId", "completedFieldId", "overdueFieldId"]) {
      const id = object.document.props?.[key];
      if (object.document.component === "record-list" && ["unreadFieldId","completedFieldId","overdueFieldId"].includes(key) && typeof id === "string" && project.tables.find(table=>table.id===c.tableId)?.fields.find(field=>field.id===id)?.type !== "checkbox") throw new Error("목록 인디케이터는 실제 checkbox 필드에 연결해 주세요.");
      if (typeof id === "string" && !c.fieldIds.includes(id)) throw new Error("업무 항목 역할은 연결된 컬렉션 필드에서 선택해 주세요.");
    }
    for (const key of ["pageIds", "targetPageIds"]) {
      const ids = object.document.props?.[key];
      if (Array.isArray(ids) && ids.some(id => id !== "" && !project.pages.some(page => page.id === id))) throw new Error("탐색할 페이지를 찾을 수 없습니다.");
    }
  }
  for (const id of objects.keys()) {
    const seen = new Set<string>(); let current: string | undefined = id;
    while (current !== undefined) {if (seen.has(current)) throw new Error("컴포넌트 조합에 순환 참조가 있습니다."); seen.add(current); current = parent.get(current);}
  }
}

/** Duplicate the entire configured subtree with new references, preserving source data bindings. */
export function duplicateUIBuilderComposition(project: UIBuilderProject, objectIds: readonly string[], placement?: ObjectPastePlacement): UIBuilderProject {
  const source = new Map(project.objects.map(raw => [raw.id, raw as UIComponentObject]));
  if (objectIds.some(id => !source.has(id))) throw new Error("복제할 컴포넌트를 찾을 수 없습니다.");
  const included = new Set<string>();
  function include(id: string) {if (included.has(id)) return; included.add(id); for (const child of uiBuilderComponentChildIds(source.get(id)!)) include(child);}
  objectIds.forEach(include);
  const allocate = createEditingIdAllocator(project.objects.map(object => object.id), () => createEditingId("component"), "component");
  const mapped = new Map([...included].map(id => [id, allocate()]));
  const clones = [...included].map(id => {
    const original = source.get(id)!;
    const clone = JSON.parse(JSON.stringify(original)) as UIComponentObject;
    const document = mapUIComponentChildren(clone.document, id => mapped.get(id));
    return {...clone, id: mapped.get(id)!, x: clone.x + (placement?.dx ?? 24), y: clone.y + (placement?.dy ?? 24), document};
  });
  return {...project, objects: [...project.objects, ...clones]};
}
