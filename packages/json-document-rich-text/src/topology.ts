import type { OrderedTopology } from "@interactive-os/json-document-selection";
import { getActiveRichTextInstrument } from "./instrument.js";
import {
  hasRichTextContent,
  isRichTextText,
  type RichTextDocument,
  type RichTextNode,
  type RichTextPoint,
  type RichTextTarget,
} from "./model.js";

export interface RichTextLocatedNode {
  readonly node: RichTextNode | RichTextDocument;
  readonly order: number;
  readonly path: ReadonlyArray<number>;
}

export interface RichTextTopology extends OrderedTopology<RichTextPoint, RichTextTarget> {
  locate(nodeId: string): RichTextLocatedNode | null;
}

interface IndexedNode {
  readonly node: RichTextNode | RichTextDocument;
  readonly order: number;
  readonly path: ReadonlyArray<number>;
}

const topologies = new WeakMap<RichTextDocument, RichTextTopology>();

// Owner: the current Rich Text document value. Invalidated when commit yields a
// new document identity. Same snapshot/revision must reuse this index.
export function richTextTopology(document: RichTextDocument): RichTextTopology {
  const cached = topologies.get(document);
  if (cached) return cached;
  const created = createRichTextTopology(document);
  topologies.set(document, created);
  return created;
}

export function createRichTextTopology(document: RichTextDocument): RichTextTopology {
  getActiveRichTextInstrument()?.topologyCreate();
  const nodes = new Map<string, IndexedNode>();
  const linear: Array<RichTextNode | RichTextDocument> = [];
  visit(document, []);

  return {
    locate(nodeId) {
      return nodes.get(nodeId) ?? null;
    },
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
      const targets: RichTextTarget[] = [];
      for (const node of linear) {
        if (!node || node.type === "doc") continue;
        const indexed = nodes.get(node.id)!;
        if (isRichTextText(node)) {
          const nodeStart: RichTextPoint = { kind: "text", nodeId: node.id, offset: 0, affinity: "forward" };
          const nodeEnd: RichTextPoint = { kind: "text", nodeId: node.id, offset: node.text.length, affinity: "backward" };
          if (compare(nodeEnd, ordered[0]) < 0 || compare(nodeStart, ordered[1]) > 0) continue;
          const from = node.id === ordered[0].nodeId && ordered[0].kind === "text" ? ordered[0].offset : 0;
          const to = node.id === ordered[1].nodeId && ordered[1].kind === "text" ? ordered[1].offset : node.text.length;
          targets.push({ kind: "text", nodeId: node.id, from, to });
        } else if (!hasRichTextContent(node)) {
          const atomKey = [...indexed.path, 0];
          if (compareKeys(atomKey, pointKey(ordered[0])) >= 0 && compareKeys(atomKey, pointKey(ordered[1])) <= 0) {
            targets.push({ kind: "node", nodeId: node.id });
          }
        }
      }
      return targets;
    },
    reconcilePoint: reconcile,
  };

  function visit(node: RichTextNode | RichTextDocument, path: ReadonlyArray<number>): void {
    if (nodes.has(node.id)) throw new TypeError(`Duplicate Rich Text node id: ${JSON.stringify(node.id)}.`);
    nodes.set(node.id, { node, order: linear.length, path });
    linear.push(node);
    if (hasRichTextContent(node)) node.content.forEach((child, index) => visit(child, [...path, index]));
  }

  function reconcile(point: RichTextPoint): RichTextPoint | null {
    const indexed = nodes.get(point.nodeId);
    if (!indexed) return null;
    if (point.kind === "text") {
      if (!isRichTextText(indexed.node)) return null;
      const offset = clamp(point.offset, indexed.node.text.length);
      return { ...point, offset: scalarBoundary(indexed.node.text, offset, point.affinity) };
    }
    if (!hasRichTextContent(indexed.node)) return null;
    return { ...point, offset: clamp(point.offset, indexed.node.content.length) };
  }

  function compare(left: RichTextPoint, right: RichTextPoint): number {
    return compareKeys(pointKey(left), pointKey(right));
  }

  function pointKey(point: RichTextPoint): ReadonlyArray<number> {
    const indexed = nodes.get(point.nodeId)!;
    return point.kind === "text"
      ? [...indexed.path, point.offset]
      : [...indexed.path, point.offset, -1];
  }
}

function compareKeys(left: ReadonlyArray<number>, right: ReadonlyArray<number>): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] === right[index]) continue;
    if (left[index] === undefined) return -1;
    if (right[index] === undefined) return 1;
    return left[index]! - right[index]!;
  }
  return 0;
}

function scalarBoundary(text: string, offset: number, affinity: RichTextPoint["affinity"]): number {
  if (offset === 0 || offset === text.length) return offset;
  const previous = text.charCodeAt(offset - 1);
  const next = text.charCodeAt(offset);
  const insidePair = previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
  return insidePair ? offset + (affinity === "backward" ? -1 : 1) : offset;
}

function clamp(value: number, maximum: number): number {
  if (!Number.isInteger(value)) return 0;
  return Math.min(Math.max(value, 0), maximum);
}
