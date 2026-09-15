import type { TextDOMAdapter } from "../types.js";
import { textDOMIndex } from "./text-index.js";
import { textProjectionCaret } from "./text-projection.js";

interface Rect { left: number; top: number; width: number; height: number; lineHeight?: number; text?: boolean }
export interface TextSelectionGeometry { readonly caret: boolean; readonly rects: Rect[] }

/** Read only: the live DOM endpoints retain bidi direction and soft-wrap affinity. */
export function measureTextSelection(root: HTMLElement, dom: TextDOMAdapter): TextSelectionGeometry | null {
  const document = root.ownerDocument, selection = document.getSelection();
  if (!selection?.rangeCount || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;
  const sourceSelection = dom.observe(root).selection;
  if (!sourceSelection) return null;
  const from = Math.min(sourceSelection.anchor, sourceSelection.focus), to = Math.max(sourceSelection.anchor, sourceSelection.focus);
  const projections = dom.getTextProjections?.(root) ?? [];
  if (selection.isCollapsed) {
    const projected = textProjectionCaret(projections, sourceSelection);
    if (projected) {
      const rect = projected.region.element.getBoundingClientRect();
      if (rect.height && rect.width) return {caret: true, rects: [{left: projected.edge === "before" ? rect.left : rect.right, top: rect.top, width: 1, height: rect.height}]};
    }
    const range = selection.getRangeAt(0);
    const rect = range.getClientRects()[0];
    if (rect?.height) return {caret: true, rects: [{left: rect.left, top: rect.top, width: 1, height: rect.height}]};
    // Chromium omits a collapsed rectangle inside consecutive line feeds.
    // Measuring that LF supplies its empty line without moving the live caret.
    const index = textDOMIndex(root), point = index.position(from, "forward");
    if (point.node.nodeType === 3 && point.node.textContent?.[point.offset] === "\n") {
      const line = document.createRange();
      line.setStart(point.node, point.offset); line.setEnd(point.node, point.offset + 1);
      const rect = line.getClientRects()[0];
      if (rect?.height) return {caret: true, rects: [{left: rect.left, top: rect.top, width: 1, height: rect.height}]};
    }
    // Empty lines have no text rectangle. A BR or empty root supplies the line box.
    const node = selection.focusNode!;
    const child = node.childNodes[selection.focusOffset];
    const element = child?.nodeName === "BR" ? child as HTMLElement
      : from === index.value.length ? root.querySelector<HTMLElement>("[data-contenteditable-caret]") : null;
    const boundary = element?.getBoundingClientRect();
    if (boundary?.height) return {caret: true, rects: [{left: boundary.left, top: boundary.top, width: 1, height: boundary.height}]};
    if (!index.value.length || (from === 0 && /^\n+$/.test(index.value))) {
      const style = document.defaultView!.getComputedStyle(root), bounds = root.getBoundingClientRect();
      const height = parseFloat(style.fontSize), lineHeight = parseFloat(style.lineHeight) || height * 1.2;
      return {caret: true, rects: [{left: bounds.left + root.clientLeft + parseFloat(style.paddingLeft), top: bounds.top + root.clientTop + parseFloat(style.paddingTop) + (lineHeight - height) / 2, width: 1, height}]};
    }
    return null;
  }
  const index = textDOMIndex(root), range = document.createRange(), rects: Rect[] = [];
  const scaleY = root.offsetHeight ? root.getBoundingClientRect().height / root.offsetHeight : 1;
  const walker = document.createTreeWalker(root, 4);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || parent.closest('[hidden], [contenteditable="false"], [data-text-decoration], [data-text-projection-source], [data-text-selection-excluded]')) continue;
    const style = document.defaultView!.getComputedStyle(parent);
    if (style.visibility !== "visible") continue;
    const start = index.offset(node, 0);
    if (start === null) continue;
    const end = start + (node.textContent?.length ?? 0);
    if (end <= from || start >= to) continue;
    range.setStart(node, Math.max(0, from - start));
    range.setEnd(node, Math.min(end, to) - start);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.height) rects.push({left: rect.left, top: rect.top, width: Math.max(2, rect.width), height: rect.height,
        lineHeight: Math.max(rect.height, (parseFloat(style.lineHeight) || rect.height / scaleY) * scaleY), text: true});
    }
  }
  for (const region of projections) {
    if (to <= region.from || from >= region.to) continue;
    const rect = region.element.getBoundingClientRect();
    if (rect.width && rect.height) rects.push({left: rect.left, top: rect.top, width: rect.width, height: rect.height});
  }
  return {caret: false, rects: mergeTextSelectionRects(rects)};
}

/** Normalize inline font/marker heights, joining only touching intervals on a line. */
export function mergeTextSelectionRects(rects: ReadonlyArray<Rect>): Rect[] {
  const lines: Rect[][] = [];
  for (const rect of [...rects].sort((a, b) => a.top + a.height / 2 - b.top - b.height / 2 || a.left - b.left)) {
    const center = rect.top + rect.height / 2;
    const line = lines.at(-1), first = line?.[0];
    if (first && Math.abs(center - first.top - first.height / 2) < Math.min(rect.height, first.height) / 2) line!.push(rect);
    else lines.push([rect]);
  }
  return lines.flatMap(line => {
    const reference = line.filter(rect => rect.text).sort((a, b) => (b.lineHeight ?? 0) - (a.lineHeight ?? 0))[0];
    const height = reference ? Math.max(...line.map(rect => rect.lineHeight ?? rect.height))
      : Math.max(...line.map(rect => rect.top + rect.height)) - Math.min(...line.map(rect => rect.top));
    const top = reference ? reference.top + reference.height / 2 - height / 2 : Math.min(...line.map(rect => rect.top));
    const merged: Rect[] = [];
    for (const rect of line.sort((a, b) => a.left - b.left)) {
      const last = merged.at(-1);
      if (last && rect.left <= last.left + last.width + 1) last.width = Math.max(last.left + last.width, rect.left + rect.width) - last.left;
      else merged.push({left: rect.left, top, width: rect.width, height});
    }
    return merged;
  });
}
