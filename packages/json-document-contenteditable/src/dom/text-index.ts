interface NodeText {
  readonly value: string;
  readonly children: ReadonlyArray<{ readonly node: Node; readonly at: number }>;
  readonly offsets: ReadonlyArray<number>;
}
interface DOMPosition { readonly node: Node; readonly offset: number }
export interface TextDOMIndex {
  readonly value: string;
  offset(node: Node, offset: number): number | null;
  position(offset: number, affinity?: "backward" | "forward"): DOMPosition;
}
interface CachedIndex { readonly observer: MutationObserver; dirty: boolean; index: TextDOMIndex | null }
const indexes = new WeakMap<HTMLElement, CachedIndex>();

/** One text projection per DOM mutation, shared by observation and selection restoration. */
export function textDOMIndex(root: HTMLElement): TextDOMIndex {
  let cached = indexes.get(root);
  if (!cached) {
    const observer = new MutationObserver(records => { if (records.length) cached!.dirty = true; });
    cached = { observer, dirty: true, index: null };
    observer.observe(root, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["data-contenteditable-caret"] });
    indexes.set(root, cached);
  }
  if (cached.dirty || cached.observer.takeRecords().length) {
    cached.index = buildIndex(root);
    cached.dirty = false;
    cached.observer.takeRecords();
  }
  return cached.index!;
}

function buildIndex(root: HTMLElement): TextDOMIndex {
  const projections = new Map<Node, NodeText>();
  const project = (node: Node): NodeText => {
    let result: NodeText;
    if (node.nodeType === 3) result = { value: (node as Text).data, children: [], offsets: [] };
    else if (isElement(node, "br")) result = { value: (node as Element).hasAttribute("data-contenteditable-caret") ? "" : "\n", children: [], offsets: [0] };
    else {
      const parts: string[] = [];
      const children: Array<{ node: Node; at: number }> = [];
      const offsets: number[] = [0];
      let length = 0, last = "";
      let previous: Node | null = null;
      for (const child of Array.from(node.childNodes)) {
        const projected = project(child);
        if (previous !== null && (isBlock(previous) || isBlock(child)) && last !== "\n" && !projected.value.startsWith("\n")) {
          parts.push("\n"); length++; last = "\n";
        }
        offsets[children.length] = length;
        children.push({ node: child, at: length });
        parts.push(projected.value);
        length += projected.value.length;
        if (projected.value.length) last = projected.value.slice(-1);
        previous = child;
      }
      offsets[children.length] = length;
      result = { value: parts.join(""), children, offsets };
    }
    projections.set(node, result);
    return result;
  };
  const value = project(root).value;
  const starts = new Map<Node, number>();
  const boundaries = new Map<number, DOMPosition>();
  const texts: Array<{ node: Text; from: number; to: number }> = [];
  const place = (node: Node, from: number): void => {
    starts.set(node, from);
    const projection = projections.get(node)!;
    if (node.nodeType === 3) texts.push({ node: node as Text, from, to: from + projection.value.length });
    else projection.offsets.forEach((offset, index) => boundaries.set(from + offset, { node, offset: index }));
    for (const child of projection.children) place(child.node, from + child.at);
  };
  place(root, 0);
  return {
    value,
    offset(node, offset) {
      const from = starts.get(node);
      if (from === undefined) return null;
      const projection = projections.get(node)!;
      return from + (node.nodeType === 3 ? bounded(offset, projection.value.length) : projection.offsets[bounded(offset, projection.offsets.length - 1)] ?? 0);
    },
    position(offset, affinity = "backward") {
      let low = 0, high = texts.length;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (texts[middle]!.to < offset) low = middle + 1;
        else high = middle;
      }
      while (affinity === "forward" && texts[low]?.to === offset && texts[low + 1]?.from === offset) low++;
      const text = texts[low];
      return text && offset >= text.from ? { node: text.node, offset: offset - text.from }
        : boundaries.get(offset) ?? { node: root, offset: root.childNodes.length };
    },
  };
}

function bounded(offset: number, maximum: number): number {
  return Number.isFinite(offset) ? Math.max(0, Math.min(maximum, Math.trunc(offset))) : 0;
}
function isElement(node: Node, name: string): boolean {
  return node.nodeType === 1 && (node as Element).localName === name;
}
function isBlock(node: Node): boolean {
  return node.nodeType === 1 && BLOCK_ELEMENTS.has((node as Element).localName);
}
const BLOCK_ELEMENTS = new Set(["address", "article", "aside", "blockquote", "div", "dl", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section", "table", "ul"]);
