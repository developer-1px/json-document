import { useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { DatabaseFilter, DatabaseIntent, DatabaseSort, DatabaseTableView } from "@interactive-os/json-document-editing";
import { nextDatabasePropertySort } from "@interactive-os/json-document-editing";
import {
  activateAffordance,
  applyAffordance,
  commitAffordance,
  disclosureAffordance,
  dragAffordance,
  dropAffordance,
} from "@interactive-os/json-document-affordance";
import { createWebPointerSession, pressInteractionFromWeb } from "@interactive-os/json-document-web";

const defaultWidth = 160;
const minWidth = 88;

type HeaderMenu = { readonly propertyId: string; readonly x: number; readonly y: number };
type HeaderDrag = { readonly propertyId: string; readonly originX: number; readonly originY: number; readonly moved: boolean };
type HeaderResize = { readonly propertyId: string; readonly originX: number; readonly originWidth: number };
type ConfigureView = (intent: Extract<DatabaseIntent, { readonly type: "view.configure" }>) => void;

export interface DatabaseTableHeaderInteractions {
  readonly dragPreview: ReadonlyArray<string> | null;
  readonly menu: HeaderMenu | null;
  readonly widths: Readonly<Record<string, number>>;
  propertyWidth(propertyId: string): number;
  startDrag(event: ReactPointerEvent<HTMLElement>, propertyId: string): void;
  moveDrag(event: ReactPointerEvent<HTMLElement>): void;
  finishDrag(event: ReactPointerEvent<HTMLElement>): void;
  cancelDrag(pointerId: number, reason?: "cancel" | "lost-capture"): void;
  startResize(event: ReactPointerEvent<HTMLElement>, propertyId: string): void;
  moveResize(event: ReactPointerEvent<HTMLElement>): void;
  finishResize(event: ReactPointerEvent<HTMLElement>): void;
  cancelResize(pointerId: number, reason?: "cancel" | "lost-capture"): void;
  openMenu(event: { preventDefault(): void; clientX: number; clientY: number }, propertyId: string): void;
  closeMenu(): void;
  onKeyDown(event: KeyboardEvent<HTMLElement>, propertyId: string, hidden: boolean): void;
  hideProperty(propertyId: string): void;
  showProperty(propertyId: string): void;
  setFilter(filter: DatabaseFilter | null): void;
}

/** Owns the Database Demo header's DOM interaction and local preview policy. */
export function useDatabaseTableHeaderInteractions(
  view: DatabaseTableView,
  configure: ConfigureView,
): DatabaseTableHeaderInteractions {
  const [dragPreview, setDragPreview] = useState<ReadonlyArray<string> | null>(null);
  const [widthPreview, setWidthPreview] = useState<Readonly<Record<string, number>> | null>(null);
  const [menu, setMenu] = useState<HeaderMenu | null>(null);
  const [dragSession] = useState(() => createWebPointerSession<HeaderDrag>({ onCancel: () => setDragPreview(null) }));
  const [resizeSession] = useState(() => createWebPointerSession<HeaderResize>({ onCancel: () => setWidthPreview(null) }));
  const widths = { ...view.propertyWidths, ...widthPreview };

  function propertyWidth(propertyId: string) {
    return Math.max(minWidth, widths[propertyId] ?? defaultWidth);
  }

  function cycleSort(propertyId: string) {
    configure({ type: "view.configure", viewId: view.id, sort: nextDatabasePropertySort(view.sort, propertyId) });
  }

  function hideProperty(propertyId: string) {
    configure({ type: "view.configure", viewId: view.id, propertyVisibility: { ...view.propertyVisibility, [propertyId]: false } });
  }

  function showProperty(propertyId: string) {
    configure({ type: "view.configure", viewId: view.id, propertyVisibility: { ...view.propertyVisibility, [propertyId]: true } });
  }

  function setFilter(filter: DatabaseFilter | null) {
    configure({ type: "view.configure", viewId: view.id, filter });
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>, propertyId: string) {
    if (event.button !== 0) return;
    dragSession.begin(event.currentTarget, event.pointerId, { propertyId, originX: event.clientX, originY: event.clientY, moved: false });
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    let drag = dragSession.getSnapshot()?.state;
    if (!drag) return;
    applyAffordance(dragAffordance({ x: drag.originX, y: drag.originY }, { x: event.clientX, y: event.clientY }), {
      cursor: (cursor) => { event.currentTarget.style.cursor = cursor; },
    });
    if (!drag.moved && Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) < 6) return;
    drag = dragSession.preview(event.pointerId, (state) => ({ ...state, moved: true })) ?? drag;
    const target = globalThis.document.elementFromPoint(event.clientX, event.clientY);
    const propertyId = target instanceof Element ? target.closest("[data-property-id]")?.getAttribute("data-property-id") : null;
    if (!propertyId || propertyId === drag.propertyId) return;
    applyAffordance(dropAffordance({ canDrop: true }), { cursor: (cursor) => { event.currentTarget.style.cursor = cursor; } });
    setDragPreview((current) => reorderProperty(current ?? view.propertyOrder, drag.propertyId, propertyId));
  }

  function finishDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragSession.commit(event.pointerId);
    event.currentTarget.style.cursor = "";
    const next = dragPreview;
    setDragPreview(null);
    if (!drag) return;
    if (drag.moved) {
      const committed = commitAffordance(dragAffordance({ x: drag.originX, y: drag.originY }, { x: event.clientX, y: event.clientY }));
      if (committed) applyAffordance(committed, { commit: () => {
        if (next && next.join("\u0000") !== view.propertyOrder.join("\u0000")) {
          configure({ type: "view.configure", viewId: view.id, propertyOrder: next });
        }
      } });
      return;
    }
    applyAffordance(activateAffordance(pressInteractionFromWeb({ type: "click", button: 0, detail: 1 })), {
      hand: (hand) => { if (hand.type === "activate") cycleSort(drag.propertyId); },
    });
  }

  function startResize(event: ReactPointerEvent<HTMLElement>, propertyId: string) {
    event.stopPropagation();
    const activeDrag = dragSession.getSnapshot();
    if (activeDrag) dragSession.cancel(activeDrag.pointerId, "superseded");
    resizeSession.begin(event.currentTarget, event.pointerId, { propertyId, originX: event.clientX, originWidth: propertyWidth(propertyId) });
  }

  function moveResize(event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation();
    const resize = resizeSession.getSnapshot()?.state;
    if (!resize) return;
    event.currentTarget.style.cursor = "col-resize";
    setWidthPreview({ ...view.propertyWidths, [resize.propertyId]: Math.max(minWidth, resize.originWidth + event.clientX - resize.originX) });
  }

  function finishResize(event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation();
    const resize = resizeSession.commit(event.pointerId);
    const preview = widthPreview;
    setWidthPreview(null);
    event.currentTarget.style.cursor = "";
    if (!resize || !preview || preview[resize.propertyId] === view.propertyWidths[resize.propertyId]) return;
    configure({ type: "view.configure", viewId: view.id, propertyWidths: preview });
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>, propertyId: string, hidden: boolean) {
    if (hidden) {
      applyAffordance(disclosureAffordance({ key: event.key, expanded: false }), { hand: (hand) => {
        if (hand.type === "expand") { event.preventDefault(); showProperty(propertyId); }
      } });
      return;
    }
    if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      setMenu({ propertyId, x: rect.left, y: rect.bottom });
      return;
    }
    const interaction = pressInteractionFromWeb(event);
    if (interaction?.source === "keyboard" && "key" in interaction && interaction.key === "Space" && interaction.phase === "start") event.preventDefault();
    applyAffordance(activateAffordance(interaction), { hand: (hand) => {
      if (hand.type === "activate") { event.preventDefault(); cycleSort(propertyId); }
    } });
  }

  return {
    dragPreview, menu, widths, propertyWidth, startDrag, moveDrag, finishDrag,
    cancelDrag: (pointerId, reason = "cancel") => dragSession.cancel(pointerId, reason),
    startResize, moveResize, finishResize,
    cancelResize: (pointerId, reason = "cancel") => resizeSession.cancel(pointerId, reason),
    openMenu: (event, propertyId) => { event.preventDefault(); setMenu({ propertyId, x: event.clientX, y: event.clientY }); },
    closeMenu: () => setMenu(null), onKeyDown, hideProperty, showProperty, setFilter,
  };
}

export function databaseSortAriaValue(sort: DatabaseSort | null, propertyId: string): "ascending" | "descending" | "none" {
  return sort?.propertyId === propertyId ? sort.direction : "none";
}

export function databaseSortMark(sort: DatabaseSort | null, propertyId: string): string {
  if (sort?.propertyId !== propertyId) return "";
  return sort.direction === "ascending" ? " ↑" : " ↓";
}

function reorderProperty(order: ReadonlyArray<string>, sourceId: string, targetId: string): ReadonlyArray<string> {
  const next = [...order];
  const sourceIndex = next.indexOf(sourceId);
  const targetIndex = next.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) return next;
  next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, sourceId);
  return next;
}
