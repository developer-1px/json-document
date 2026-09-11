import { revealTextCaret } from "./caret-visibility.js";
import type { TextDOMAdapter, TextSelection } from "../types.js";
import { textDOMIndex } from "./text-index.js";

interface Fragment { node: Text | HTMLBRElement; rect: DOMRect }
interface Line { top: number; bottom: number; left: number; right: number; fragments: Fragment[] }
interface Navigation { selection: TextSelection; value: string; x: number; y: number; height: number; node: Node; offset: number }

/** Visual line navigation for source-text DOM adapters; layout and hit testing stay browser-owned. */
export function createTextNavigationDOMAdapter(base: TextDOMAdapter): TextDOMAdapter {
  const navigation = new WeakMap<HTMLElement, Navigation>();
  return {
    ...base,
    resetNavigation(root) { navigation.delete(root); base.resetNavigation?.(root); },
    restoreSelection(root, selection, options) {
      const state = navigation.get(root);
      const restored = base.restoreSelection(root, selection, options);
      if (restored && state && sameSelection(state.selection, selection) && root.contains(state.node)) {
        const index = textDOMIndex(root);
        if (index.value === state.value && index.offset(state.node, state.offset) === selection.focus) {
          const dom = root.ownerDocument.getSelection();
          // Set only the focus for an extended selection; its directional anchor is retained.
          if (dom && selection.anchor === selection.focus && (dom.focusNode !== state.node || dom.focusOffset !== state.offset || !dom.isCollapsed)) dom.setBaseAndExtent(state.node, state.offset, state.node, state.offset);
          else if (dom?.anchorNode && selection.anchor !== selection.focus && index.offset(dom.anchorNode, dom.anchorOffset) === selection.anchor
            && (dom.focusNode !== state.node || dom.focusOffset !== state.offset)) dom.extend(state.node, state.offset);
        }
      }
      if (restored && state && sameSelection(state.selection, selection) && base.observe(root).value === state.value) {
        const dom = root.ownerDocument.getSelection();
        if (dom?.focusNode) {
          const range = root.ownerDocument.createRange(); range.setStart(dom.focusNode, dom.focusOffset); range.collapse(true);
          const rect = range.getBoundingClientRect(), bounds = root.getBoundingClientRect();
          const y = state.y + bounds.top - root.scrollTop;
          const x = state.x + bounds.left - root.scrollLeft;
          revealTextCaret(root, rect.height ? rect : {left:x, right:x, top:y - state.height / 2, bottom:y + state.height / 2});
        }
      }
      return restored;
    },
    resolveVerticalSelection(root, selection, direction, extend) {
      const document = root.ownerDocument, index = textDOMIndex(root);
      const bounds = root.getBoundingClientRect();
      if (document.defaultView!.getComputedStyle(root).writingMode !== "horizontal-tb") return null;
      if (typeof document.createRange().getClientRects !== "function") return null;
      const lines = visualLines(root);
      if (!lines.length) return null;
      const previous = navigation.get(root);
      const continuing = previous && previous.value === index.value && sameSelection(previous.selection, selection);
      const dom = document.getSelection();
      if (!dom?.focusNode || !root.contains(dom.focusNode)) return null;
      const caret = document.createRange(); caret.setStart(dom.focusNode, dom.focusOffset); caret.collapse(true);
      const rect = caret.getBoundingClientRect();
      const y = rect.height ? (rect.top + rect.bottom) / 2 : continuing ? previous.y + bounds.top - root.scrollTop : endpointY(root, dom.focusNode, dom.focusOffset, lines);
      if (y === null) return null;
      const x = continuing ? previous.x + bounds.left - root.scrollLeft : rect.height ? rect.left : lines.find(line => y >= line.top && y <= line.bottom)?.left ?? bounds.left;
      const current = lines.reduce((best, line, i) => Math.abs((line.top + line.bottom) / 2 - y) < Math.abs((lines[best]!.top + lines[best]!.bottom) / 2 - y) ? i : best, 0);
      const step = direction === "backward" ? -1 : 1;
      let target: Line | undefined, point: {node:Node; offset:number} | null = null;
      for (let next = current + step; next >= 0 && next < lines.length; next += step) {
        target = lines[next];
        point = linePosition(root, target!, x);
        if (point && index.offset(point.node, point.offset) !== selection.focus) break;
        point = null;
      }
      if (!point) {
        target = undefined;
        point = index.position(direction === "backward" ? 0 : index.value.length);
      }
      const focus = index.offset(point.node, point.offset);
      if (focus === null) return null;
      const next = {anchor: extend ? selection.anchor : focus, focus};
      navigation.set(root, {selection: next, value:index.value, x:x - bounds.left + root.scrollLeft, y:target ? (target.top + target.bottom) / 2 - bounds.top + root.scrollTop : y - bounds.top + root.scrollTop, height:target ? target.bottom - target.top : lines[current]!.bottom - lines[current]!.top, ...point});
      return next;
    },
  };
}

function sameSelection(a: TextSelection, b: TextSelection): boolean { return a.anchor === b.anchor && a.focus === b.focus; }

function editableText(node: Node, root: HTMLElement): node is Text {
  if (node.nodeType !== 3 || !node.textContent?.length) return false;
  const parent = node.parentElement;
  if (!parent || parent.closest('[hidden], [contenteditable="false"], [data-text-projection-source]')) return false;
  const style = root.ownerDocument.defaultView!.getComputedStyle(parent);
  return style.visibility !== "hidden" && style.visibility !== "collapse";
}

function visualLines(root: HTMLElement): Line[] {
  const fragments: Fragment[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, 4);
  const range = root.ownerDocument.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!editableText(node, root)) continue;
    range.selectNodeContents(node);
    for (const rect of Array.from(range.getClientRects())) if (rect.height > 0) fragments.push({node, rect});
  }
  for (const node of Array.from(root.querySelectorAll<HTMLBRElement>("br"))) {
    if (node.closest('[hidden], [contenteditable="false"], [data-text-projection-source]')) continue;
    const rect = node.getBoundingClientRect();
    if (rect.height) fragments.push({node, rect});
  }
  fragments.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
  const lines: Line[] = [];
  for (const fragment of fragments) {
    const {rect} = fragment;
    const center = (rect.top + rect.bottom) / 2;
    const last = lines.at(-1);
    const line = last && center > last.top && center < last.bottom ? last : undefined;
    if (line) {
      line.top = Math.min(line.top, rect.top); line.bottom = Math.max(line.bottom, rect.bottom);
      line.left = Math.min(line.left, rect.left); line.right = Math.max(line.right, rect.right);
      line.fragments.push(fragment);
    } else lines.push({top:rect.top, bottom:rect.bottom, left:rect.left, right:rect.right, fragments:[fragment]});
  }
  return lines;
}

function endpointY(root: HTMLElement, node: Node, offset: number, lines: Line[]): number | null {
  if (node.nodeType === 3 && node.textContent?.length) {
    const range = root.ownerDocument.createRange();
    range.setStart(node, Math.min(offset, node.textContent.length - 1));
    range.setEnd(node, Math.min(offset + 1, node.textContent.length));
    const rect = range.getBoundingClientRect();
    if (rect.height) return (rect.top + rect.bottom) / 2;
  }
  const index = textDOMIndex(root), source = index.offset(node, offset);
  if (source === null) return null;
  const near = lines.flatMap(line => line.fragments.map(fragment => ({line, distance:Math.abs((index.offset(fragment.node, 0) ?? 0) - source)})))
    .sort((a,b) => a.distance - b.distance)[0];
  return near ? (near.line.top + near.line.bottom) / 2 : null;
}

function linePosition(root: HTMLElement, line: Line, goal: number): {node: Node; offset: number} | null {
  const document = root.ownerDocument;
  const x = Math.max(line.left, Math.min(goal, line.right));
  const y = (line.top + line.bottom) / 2;
  const hit = document.caretPositionFromPoint?.(x, y);
  const legacy = !hit ? document.caretRangeFromPoint?.(x, y) : null;
  const node = hit?.offsetNode ?? legacy?.startContainer;
  const offset = hit?.offset ?? legacy?.startOffset;
  if (node && offset !== undefined && root.contains(node) && editableText(node, root) && line.fragments.some(fragment => fragment.node === node)) return {node, offset};
  // Hit testing may land on an overlapping projection or on the container of a blank line.
  // Measure only the nearest text fragment's grapheme boundaries as a fallback.
  const fragment = [...line.fragments].sort((a,b) => distanceX(a.rect, x) - distanceX(b.rect, x))[0]!;
  if (fragment.node.nodeType !== 3) {
    return {node:fragment.node.parentNode!, offset:Array.prototype.indexOf.call(fragment.node.parentNode!.childNodes, fragment.node)};
  }
  const text = fragment.node as Text;
  const range = document.createRange();
  let best: {node:Node; offset:number; distance:number} | null = null;
  // A plain adapter can keep thousands of lines in one Text node. Locate this
  // visual line first, so fallback measurement does not scan the whole document.
  const firstAtY = (y: number) => {
    let low = 0, high = text.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      range.setStart(text, middle); range.setEnd(text, middle + 1);
      const rect = range.getBoundingClientRect();
      if ((rect.top + rect.bottom) / 2 < y) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  const from = Math.max(0, firstAtY(line.top) - 1), to = Math.min(text.length, firstAtY(line.bottom) + 1);
  const segments = new Intl.Segmenter(undefined, {granularity:"grapheme"}).segment(text.data);
  for (let cursor = from; cursor < to;) {
    const part = segments.containing(cursor)!;
    cursor = part.index + part.segment.length;
    for (const at of [part.index, part.index + part.segment.length]) {
      range.setStart(fragment.node, at); range.collapse(true);
      for (const rect of Array.from(range.getClientRects())) {
        if (!rect.height || (rect.top + rect.bottom) / 2 < line.top || (rect.top + rect.bottom) / 2 > line.bottom) continue;
        const distance = Math.abs(rect.left - x);
        if (!best || distance < best.distance) best = {node:fragment.node, offset:at, distance};
      }
    }
  }
  return best;
}

function distanceX(rect: DOMRect, x: number): number { return Math.max(rect.left - x, x - rect.right, 0); }
