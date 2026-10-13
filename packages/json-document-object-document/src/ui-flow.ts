import type { JSONValue } from "@interactive-os/json-document";
import type { CanvasObject } from "./object-model.js";
import { uiComponentDocumentType, type UIComponentObject } from "./ui-component.js";

/** Width may fill its column or hug content. Height always follows content in published flow. */
export interface UIFlowItem extends Record<string, JSONValue> { readonly objectId: string; readonly size: "hug" | "fill"; }
export interface UIFlowColumn extends Record<string, JSONValue> { readonly weight: number; readonly items: readonly UIFlowItem[]; }
export interface UIFlowRow extends Record<string, JSONValue> { readonly columns: readonly UIFlowColumn[]; }
export interface UIFlowLayout extends Record<string, JSONValue> { readonly rows: readonly UIFlowRow[]; }
/** Flow stores order, grouping and sizing, never absolute coordinates. */
export function assertUIFlowLayout(value: unknown): asserts value is UIFlowLayout {
  if (!value || typeof value !== "object" || !Array.isArray((value as UIFlowLayout).rows)) throw new Error("자동 흐름 구성을 확인해 주세요.");
  const ids = new Set<string>();
  for (const row of (value as UIFlowLayout).rows) {
    if (!row || !Array.isArray(row.columns) || row.columns.length < 1 || row.columns.length > 4) throw new Error("한 행에는 1~4개의 열을 배치해 주세요.");
    for (const column of row.columns) {
      if (!column || !Number.isInteger(column.weight) || column.weight < 1 || column.weight > 12 || !Array.isArray(column.items) || !column.items.length) throw new Error("열의 비율과 요소를 확인해 주세요.");
      for (const item of column.items) {
        if (!item || typeof item.objectId !== "string" || !item.objectId || ids.has(item.objectId) || !["hug", "fill"].includes(item.size)) throw new Error("자동 흐름의 요소 ID와 크기를 확인해 주세요.");
        ids.add(item.objectId);
      }
    }
  }
  if (ids.size > 100) throw new Error("자동 흐름은 100개 요소까지 지원합니다.");
}
/** Resolve deleted references and append new free-placed elements in reading order until the next AI apply. */
export function resolveUIFlowLayout(objects: readonly CanvasObject[], layout: UIFlowLayout | null = null): UIFlowLayout {
  const ids = new Set(objects.map(o => o.id));
  const placed = new Set<string>();
  const rows = (layout?.rows ?? []).map(row => ({columns: row.columns.map(column => ({...column, items: column.items.filter(item => {
    if (!ids.has(item.objectId)) return false;
    placed.add(item.objectId); return true;
  })})).filter(column => column.items.length)})).filter(row => row.columns.length);
  const remaining = [...objects].filter(o => !placed.has(o.id)).sort((a,b) => a.y - b.y || a.x - b.x).map(o => ({
    objectId: o.id,
    size: (o.kind === "embedded-document" && o.documentType === uiComponentDocumentType && ["button", "checkbox", "metric"].includes((o as UIComponentObject).document.component) ? "hug" : "fill") as UIFlowItem["size"],
  }));
  return {rows: remaining.length ? [...rows, {columns: [{weight: 1, items: remaining}]}] : rows};
}
