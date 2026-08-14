import type { OrderedTopology } from "@interactive-os/json-document-selection";
import {
  hasRichTextContent,
  isRichTextText,
  type RichTextDocument,
  type RichTextNode,
  type RichTextPoint,
  type RichTextTarget,
} from "./model.js";

export interface RichTextTopology extends OrderedTopology<RichTextPoint, RichTextTarget> {}

interface IndexedNode {
  readonly node: RichTextNode | RichTextDocument;
  readonly order: number;
}

export function createRichTextTopology(document: RichTextDocument): RichTextTopology {
  const nodes = new Map<string, IndexedNode>();
  const linear: Array<RichTextNode | RichTextDocument> = [];
  visit(document);

  return {
    equals(left, right) {
      return left.kind === right.kind
        && left.nodeId === right.nodeId
        && left.offset === right.offset
        && left.affinity === right.affinity;
    },
    interval(anchor, focus) {
      const start = reconcile(anchor);
      const end = reconcile(focus);
      if (start === null || end === null) return [];
      const ordered = compare(start, end) <= 0 ? [start, end] as const : [end, start] as const;
      const first = nodes.get(ordered[0].nodeId)!;
      const last = nodes.get(ordered[1].nodeId)!;
      const targets: RichTextTarget[] = [];
      for (let index = first.order; index <= last.order; index += 1) {
        const node = linear[index];
        if (!node || node.type === "doc") continue;
        if (isRichTextText(node)) {
          const from = node.id === ordered[0].nodeId && ordered[0].kind === "text" ? ordered[0].offset : 0;
          const to = node.id === ordered[1].nodeId && ordered[1].kind === "text" ? ordered[1].offset : node.text.length;
          targets.push({ kind: "text", nodeId: node.id, from, to });
        } else if (!hasRichTextContent(node)) {
          targets.push({ kind: "node", nodeId: node.id });
        }
      }
      return targets;
    },
    reconcilePoint: reconcile,
  };

  function visit(node: RichTextNode | RichTextDocument): void {
    if (nodes.has(node.id)) throw new TypeError(`Duplicate Rich Text node id: ${JSON.stringify(node.id)}.`);
    nodes.set(node.id, { node, order: linear.length });
    linear.push(node);
    if (hasRichTextContent(node)) node.content.forEach(visit);
  }

  function reconcile(point: RichTextPoint): RichTextPoint | null {
    const indexed = nodes.get(point.nodeId);
    if (!indexed) return null;
    if (point.kind === "text") {
      if (!isRichTextText(indexed.node)) return null;
      return { ...point, offset: clamp(point.offset, indexed.node.text.length) };
    }
    if (!hasRichTextContent(indexed.node)) return null;
    return { ...point, offset: clamp(point.offset, indexed.node.content.length) };
  }

  function compare(left: RichTextPoint, right: RichTextPoint): number {
    const order = nodes.get(left.nodeId)!.order - nodes.get(right.nodeId)!.order;
    return order === 0 ? left.offset - right.offset : order;
  }
}

function clamp(value: number, maximum: number): number {
  if (!Number.isInteger(value)) return 0;
  return Math.min(Math.max(value, 0), maximum);
}
