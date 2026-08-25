import type { KanbanCardDropTarget } from "@interactive-os/json-document-editing";

export interface WebKanbanTargetElement {
  closest(selector: string): WebKanbanTargetElement | null;
  getAttribute(name: string): string | null;
}

export function webKanbanColumnProps(columnId: string): Readonly<{ "data-kanban-column-id": string }> {
  return { "data-kanban-column-id": columnId };
}

export function webKanbanCardProps(cardId: string): Readonly<{ "data-kanban-card-id": string }> {
  return { "data-kanban-card-id": cardId };
}

export function kanbanCardDropTargetFromWebElement(
  element: WebKanbanTargetElement | null,
): KanbanCardDropTarget | null {
  if (element === null) return null;
  const columnId = element.closest("[data-kanban-column-id]")?.getAttribute("data-kanban-column-id") ?? null;
  if (columnId === null || columnId.length === 0) return null;
  const beforeCardId = element.closest("[data-kanban-card-id]")?.getAttribute("data-kanban-card-id") ?? null;
  return { columnId, beforeCardId: beforeCardId === "" ? null : beforeCardId };
}

export function findWebKanbanCardDropTarget(
  point: { readonly x: number; readonly y: number },
  webDocument: { elementFromPoint(x: number, y: number): WebKanbanTargetElement | null } = document,
): KanbanCardDropTarget | null {
  return kanbanCardDropTargetFromWebElement(webDocument.elementFromPoint(point.x, point.y));
}
