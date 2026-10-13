import type { CanvasObject } from "./object-model.js";
import { assertUIComponentContent } from "./ui-component.js";

export const uiLayoutCatalog = [
  {id: "stack", label: "세로 흐름", description: "Read top to bottom: headings, copy, forms and content."},
  {id: "grid", label: "카드 그리드", description: "Two columns for comparable content; headings span the width."},
  {id: "dashboard", label: "대시보드", description: "Headings, metric row, then content in two columns."},
] as const;
export type UILayoutId = typeof uiLayoutCatalog[number]["id"];
/** Explicit flat-page arrangement; never runs on data changes or pointer movement. */
export function arrangeUIComponents(objects: readonly CanvasObject[], layoutId: UILayoutId, width: number): CanvasObject[] {
  if (!uiLayoutCatalog.some(entry => entry.id === layoutId) || !Number.isFinite(width) || width < 320) throw new TypeError("레이아웃과 화면 너비를 확인해 주세요.");
  const ordered = [...objects].sort((a, b) => a.y - b.y || a.x - b.x);
  const kind = (object: CanvasObject) => { if (object.kind !== "embedded-document") throw new TypeError("등록 컴포넌트가 필요합니다."); assertUIComponentContent(object.document); return object.document.component; };
  const margin = 48, gap = 24, available = width - margin * 2;
  const columns = available >= 600 ? 2 : 1;
  let y = 104;
  const result = new Map<string, CanvasObject>();
  function row(items: readonly CanvasObject[], count: number) {
    const cell = (available - gap * (count - 1)) / count;
    items.forEach((object, i) => result.set(object.id, {...object, x: margin + i * (cell + gap), y, width: Math.min(object.width, cell)}));
    y += Math.max(...items.map(o => o.height)) + gap;
  }
  if (layoutId === "dashboard") {
    const headings = ordered.filter(o => kind(o) === "heading");
    headings.forEach(o => row([o], 1));
    const metrics = ordered.filter(o => kind(o) === "metric");
    const count = available >= 720 ? 3 : columns;
    for (let i = 0; i < metrics.length; i += count) row(metrics.slice(i, i + count), count);
  }
  let pending: CanvasObject[] = [];
  const flush = () => { if (pending.length) { row(pending, columns); pending = []; } };
  for (const object of ordered) {
    if (result.has(object.id)) continue;
    if (layoutId === "stack" || ["heading", "text", "divider"].includes(kind(object))) { flush(); row([object], 1); }
    else { pending.push(object); if (pending.length === columns) flush(); }
  }
  flush();
  return objects.map(object => result.get(object.id)!);
}
