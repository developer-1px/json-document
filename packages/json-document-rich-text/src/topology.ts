import { parsePointer, type JSONValue } from "@interactive-os/json-document";
import type { OrderedTopology } from "@interactive-os/json-document-selection";
import { getActiveRichTextInstrument } from "./instrument.js";
import {
  hasRichTextContent,
  isRichTextDocument,
  isRichTextText,
  type RichTextDocument,
  type RichTextNode,
  type RichTextPoint,
  type RichTextTarget,
} from "./model.js";
import { validateRichText, type RichTextValidationResult } from "./validation.js";
import type { RichTextSchema } from "./schema.js";

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
  readonly shiftCount: number;
}

interface PathShift {
  readonly parentPath: ReadonlyArray<number>;
  readonly fromIndex: number;
  readonly delta: number;
}

interface TopologyInternals {
  readonly nodes: Map<string, IndexedNode>;
  readonly linear: Array<RichTextNode | RichTextDocument>;
  readonly overlay: Map<string, IndexedNode> | null;
  readonly added: Map<string, IndexedNode> | null;
  readonly removed: Set<string> | null;
  readonly shifts: ReadonlyArray<PathShift> | null;
}

interface TopologyPatch {
  readonly op: string;
  readonly path: string;
  readonly value?: unknown;
}

type ClassifiedPath =
  | { readonly kind: "root" }
  | { readonly kind: "root-content" }
  | { readonly kind: "sibling"; readonly parentPath: ReadonlyArray<number>; readonly index: number }
  | { readonly kind: "field" };

const topologies = new WeakMap<RichTextDocument, RichTextTopology>();
const internals = new WeakMap<RichTextTopology, TopologyInternals>();

// Owner: the current Rich Text document value. Invalidated when commit yields a
// new document identity. Same snapshot/revision must reuse this index.
export function richTextTopology(document: RichTextDocument): RichTextTopology {
  const cached = topologies.get(document);
  if (cached) return cached;
  const created = createRichTextTopology(document);
  topologies.set(document, created);
  return created;
}

// After a path-limited commit the next document identity is new, but sibling
// node identity is shared. Copy the previous index and refresh only the
// ancestors, replaced nodes, and added/removed siblings from the committed value.
export function seedRichTextTopology(
  previous: RichTextDocument,
  next: RichTextDocument,
  operations: ReadonlyArray<TopologyPatch>,
  rootPointer = "",
): void {
  if (previous === next || topologies.has(next)) return;
  const previousTopology = topologies.get(previous);
  const previousInternals = previousTopology === undefined ? undefined : internals.get(previousTopology);
  if (previousInternals === undefined || !canAdoptTopology(operations, rootPointer)) return;
  const adopted = adoptRichTextTopology(previousInternals, next, operations, rootPointer);
  if (adopted === null) return;
  topologies.set(next, adopted);
}

export function indexValidatedRichText(
  document: unknown,
  schema: RichTextSchema,
): RichTextValidationResult {
  const value = asJSONValue(document);
  if (value !== undefined && isRichTextDocument(value) && topologies.has(value)) return { ok: true };
  getActiveRichTextInstrument()?.topologyCreate();
  const nodes = new Map<string, IndexedNode>();
  const linear: Array<RichTextNode | RichTextDocument> = [];
  const validation = validateRichText(document, {
    schema,
    onNode(node, path) {
      getActiveRichTextInstrument()?.topologyVisit();
      nodes.set(node.id, { node, order: linear.length, path, shiftCount: 0 });
      linear.push(node);
    },
  });
  if (!validation.ok || value === undefined || !isRichTextDocument(value)) return validation;
  topologies.set(value, bindTopology({
    nodes,
    linear,
    overlay: null,
    added: null,
    removed: null,
    shifts: null,
  }));
  return validation;
}

export function createRichTextTopology(document: RichTextDocument): RichTextTopology {
  getActiveRichTextInstrument()?.topologyCreate();
  const nodes = new Map<string, IndexedNode>();
  const linear: Array<RichTextNode | RichTextDocument> = [];
  visit(document, []);
  return bindTopology({ nodes, linear, overlay: null, added: null, removed: null, shifts: null });

  function visit(node: RichTextNode | RichTextDocument, path: ReadonlyArray<number>): void {
    getActiveRichTextInstrument()?.topologyVisit();
    if (nodes.has(node.id)) throw new TypeError(`Duplicate Rich Text node id: ${JSON.stringify(node.id)}.`);
    nodes.set(node.id, { node, order: linear.length, path, shiftCount: 0 });
    linear.push(node);
    if (hasRichTextContent(node)) node.content.forEach((child, index) => visit(child, [...path, index]));
  }
}

function bindTopology(state: TopologyInternals): RichTextTopology {
  const topology: RichTextTopology = {
    locate(nodeId) {
      return lookupNode(state, nodeId);
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
      for (const indexed of iterateIndexed(state)) {
        const node = indexed.node;
        if (node.type === "doc") continue;
        if (isRichTextText(node)) {
          const nodeStart: RichTextPoint = { kind: "text", nodeId: node.id, offset: 0, affinity: "forward" };
          const nodeEnd: RichTextPoint = { kind: "text", nodeId: node.id, offset: node.text.length, affinity: "backward" };
          if (compare(nodeEnd, ordered[0]) < 0 || compare(nodeStart, ordered[1]) > 0) continue;
          const from = node.id === ordered[0].nodeId && ordered[0].kind === "text" ? ordered[0].offset : 0;
          const to = node.id === ordered[1].nodeId && ordered[1].kind === "text" ? ordered[1].offset : node.text.length;
          targets.push({ kind: "text", nodeId: node.id, from, to });
        } else if (!hasRichTextContent(node)) {
          const startKey = pointKey(ordered[0]);
          const endKey = pointKey(ordered[1]);
          if (startKey === null || endKey === null) continue;
          const atomKey = [...indexed.path, 0];
          if (compareKeys(atomKey, startKey) >= 0 && compareKeys(atomKey, endKey) <= 0) {
            targets.push({ kind: "node", nodeId: node.id });
          }
        }
      }
      return targets;
    },
    reconcilePoint: reconcile,
  };
  internals.set(topology, state);
  return topology;

  function reconcile(point: RichTextPoint): RichTextPoint | null {
    const indexed = lookupNode(state, point.nodeId);
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
    const leftKey = pointKey(left);
    const rightKey = pointKey(right);
    if (leftKey === null || rightKey === null) return 0;
    return compareKeys(leftKey, rightKey);
  }

  function pointKey(point: RichTextPoint): ReadonlyArray<number> | null {
    const indexed = lookupNode(state, point.nodeId);
    if (indexed === null) return null;
    return point.kind === "text"
      ? [...indexed.path, point.offset]
      : [...indexed.path, point.offset, -1];
  }
}

function canAdoptTopology(operations: ReadonlyArray<TopologyPatch>, rootPointer: string): boolean {
  if (operations.length === 0) return false;
  return operations.every((operation) => {
    const path = relativePatchPath(operation.path, rootPointer);
    if (path === null) return false;
    const classified = classifyPointer(path);
    if (classified === null || classified.kind === "root" || classified.kind === "root-content") return false;
    if (operation.op === "replace") return classified.kind === "sibling" || classified.kind === "field";
    if (operation.op === "add" || operation.op === "remove") return classified.kind === "sibling";
    return false;
  });
}

function adoptRichTextTopology(
  previous: TopologyInternals,
  next: RichTextDocument,
  operations: ReadonlyArray<TopologyPatch>,
  rootPointer: string,
): RichTextTopology | null {
  const overlay = new Map(previous.overlay ?? undefined);
  const added = new Map(previous.added ?? undefined);
  const removed = new Set(previous.removed ?? undefined);
  const shifts = [...(previous.shifts ?? [])];
  const classifiedOps: Array<{ operation: TopologyPatch; classified: ClassifiedPath; path: string }> = [];
  for (const operation of operations) {
    const path = relativePatchPath(operation.path, rootPointer);
    if (path === null) return null;
    const classified = classifyPointer(path);
    if (classified === null) return null;
    classifiedOps.push({ operation, classified, path });
  }

  getActiveRichTextInstrument()?.topologyAdopt();

  for (const { operation, classified } of classifiedOps) {
    if (classified.kind !== "sibling") continue;
    if (operation.op === "remove") {
      const target = previousChild(previous, next.id, classified.parentPath, classified.index);
      if (target === null) return null;
      tombstoneTree(target, removed, added);
      shifts.push({ parentPath: classified.parentPath, fromIndex: classified.index + 1, delta: -1 });
    } else if (operation.op === "add") {
      shifts.push({ parentPath: classified.parentPath, fromIndex: classified.index, delta: 1 });
    }
  }

  const shiftCount = shifts.length;
  for (let opIndex = 0; opIndex < classifiedOps.length; opIndex += 1) {
    const { operation, classified, path } = classifiedOps[opIndex]!;
    if (classified.kind === "field" || isPrimitiveReplace(operation, classified)) {
      if (!refreshTopologyPath(next, path, previous.nodes, overlay)) return null;
      continue;
    }
    if (classified.kind === "sibling" && operation.op === "remove") {
      if (!refreshTopologyPath(next, parentPointer(classified.parentPath), previous.nodes, overlay)) return null;
      continue;
    }
    if (classified.kind !== "sibling" || (operation.op !== "add" && operation.op !== "replace")) continue;
    if (operation.op === "replace") {
      const previousId = nodeIdOf(operation.value);
      const previousEntry = previousId === null ? null : previous.overlay?.get(previousId) ?? previous.nodes.get(previousId) ?? null;
      if (previousEntry) tombstoneTree(previousEntry.node, removed, added);
    }
    const finalIndex = finalSiblingIndex(classifiedOps, opIndex, classified.parentPath, classified.index);
    const node = nodeAtIndices(next, [...classified.parentPath, finalIndex]);
    if (node === null) return null;
    indexSubtree(node, [...classified.parentPath, finalIndex], previous.nodes, overlay, added, removed, shiftCount);
    if (!refreshTopologyPath(next, parentPointer(classified.parentPath), previous.nodes, overlay)) return null;
  }

  return bindTopology({
    nodes: previous.nodes,
    linear: previous.linear,
    overlay,
    added: added.size === 0 ? null : added,
    removed: removed.size === 0 ? null : removed,
    shifts: shifts.length === 0 ? null : shifts,
  });
}

function lookupNode(state: TopologyInternals, nodeId: string): IndexedNode | null {
  if (state.removed?.has(nodeId) === true) return null;
  const raw = state.overlay?.get(nodeId) ?? state.added?.get(nodeId) ?? state.nodes.get(nodeId);
  return raw === undefined ? null : applyShifts(raw, state.shifts ?? []);
}

function iterateIndexed(state: TopologyInternals): IndexedNode[] {
  const extras = [...(state.added?.values() ?? [])]
    .filter((entry) => state.removed?.has(entry.node.id) !== true)
    .map((entry) => applyShifts(entry, state.shifts ?? []))
    .sort((left, right) => compareKeys(left.path, right.path));
  const ordered: IndexedNode[] = [];
  let extraIndex = 0;
  for (const slot of state.linear) {
    if (!slot || state.removed?.has(slot.id) === true) continue;
    const indexed = lookupNode(state, slot.id);
    if (indexed === null) continue;
    while (extraIndex < extras.length && compareKeys(extras[extraIndex]!.path, indexed.path) < 0) {
      ordered.push(extras[extraIndex]!);
      extraIndex += 1;
    }
    ordered.push(indexed);
  }
  while (extraIndex < extras.length) {
    ordered.push(extras[extraIndex]!);
    extraIndex += 1;
  }
  return ordered;
}

function refreshTopologyPath(
  document: RichTextDocument,
  path: string,
  nodes: Map<string, IndexedNode>,
  overlay: Map<string, IndexedNode>,
): boolean {
  let current: RichTextNode | RichTextDocument = document;
  if (!replaceTopologyEntry(current, nodes, overlay)) return false;
  if (path === "") return true;
  let segments: string[];
  try {
    segments = parsePointer(path);
  } catch {
    return false;
  }
  for (let index = 0; index < segments.length; ) {
    if (segments[index] !== "content" || !hasRichTextContent(current)) break;
    const childIndex = Number(segments[index + 1]);
    if (!Number.isInteger(childIndex) || childIndex < 0) break;
    const child: RichTextNode | undefined = current.content[childIndex];
    if (child === undefined) return false;
    current = child;
    if (!replaceTopologyEntry(current, nodes, overlay)) return false;
    index += 2;
  }
  return true;
}

function replaceTopologyEntry(
  node: RichTextNode | RichTextDocument,
  nodes: Map<string, IndexedNode>,
  overlay: Map<string, IndexedNode>,
): boolean {
  getActiveRichTextInstrument()?.topologyVisit();
  const previous = overlay.get(node.id) ?? nodes.get(node.id);
  if (previous === undefined) return false;
  overlay.set(node.id, { node, order: previous.order, path: previous.path, shiftCount: previous.shiftCount });
  return true;
}

function indexSubtree(
  node: RichTextNode | RichTextDocument,
  path: ReadonlyArray<number>,
  nodes: Map<string, IndexedNode>,
  overlay: Map<string, IndexedNode>,
  added: Map<string, IndexedNode>,
  removed: Set<string>,
  shiftCount: number,
): void {
  removed.delete(node.id);
  getActiveRichTextInstrument()?.topologyVisit();
  const existing = overlay.get(node.id) ?? added.get(node.id) ?? nodes.get(node.id);
  const entry: IndexedNode = {
    node,
    order: existing?.order ?? -1,
    path,
    shiftCount,
  };
  if (existing !== undefined && !added.has(node.id) && (overlay.has(node.id) || nodes.has(node.id))) {
    overlay.set(node.id, entry);
    added.delete(node.id);
  } else {
    added.set(node.id, entry);
    overlay.delete(node.id);
  }
  if (hasRichTextContent(node)) {
    node.content.forEach((child, index) => {
      indexSubtree(child, [...path, index], nodes, overlay, added, removed, shiftCount);
    });
  }
}

function tombstoneTree(
  node: RichTextNode | RichTextDocument,
  removed: Set<string>,
  added?: Map<string, IndexedNode>,
): void {
  removed.add(node.id);
  added?.delete(node.id);
  if (hasRichTextContent(node)) node.content.forEach((child) => tombstoneTree(child, removed, added));
}

function previousChild(
  previous: TopologyInternals,
  rootId: string,
  parentPath: ReadonlyArray<number>,
  index: number,
): RichTextNode | null {
  const root = previous.overlay?.get(rootId) ?? previous.nodes.get(rootId);
  if (root === undefined) return null;
  let current: RichTextNode | RichTextDocument = root.node;
  for (const childIndex of parentPath) {
    if (!hasRichTextContent(current)) return null;
    const child: RichTextNode | undefined = current.content[childIndex];
    if (child === undefined) return null;
    current = child;
  }
  if (!hasRichTextContent(current)) return null;
  return current.content[index] ?? null;
}

function nodeAtIndices(document: RichTextDocument, indices: ReadonlyArray<number>): RichTextNode | null {
  let current: RichTextNode | RichTextDocument = document;
  for (const index of indices) {
    if (!hasRichTextContent(current)) return null;
    const child: RichTextNode | undefined = current.content[index];
    if (child === undefined) return null;
    current = child;
  }
  return current.type === "doc" ? null : current;
}

function finalSiblingIndex(
  ops: ReadonlyArray<{ operation: TopologyPatch; classified: ClassifiedPath }>,
  opIndex: number,
  parentPath: ReadonlyArray<number>,
  index: number,
): number {
  let nextIndex = index;
  for (let later = opIndex + 1; later < ops.length; later += 1) {
    const candidate = ops[later]!;
    if (candidate.classified.kind !== "sibling") continue;
    if (!samePath(candidate.classified.parentPath, parentPath)) continue;
    if (candidate.operation.op === "add" && candidate.classified.index <= nextIndex) nextIndex += 1;
    if (candidate.operation.op === "remove" && candidate.classified.index < nextIndex) nextIndex -= 1;
  }
  return nextIndex;
}

function applyShifts(entry: IndexedNode, shifts: ReadonlyArray<PathShift>): IndexedNode {
  if (entry.shiftCount >= shifts.length) return entry;
  const path = entry.path.slice();
  let changed = false;
  for (let index = entry.shiftCount; index < shifts.length; index += 1) {
    const shift = shifts[index]!;
    if (!pathStartsWith(path, shift.parentPath) || path.length <= shift.parentPath.length) continue;
    const depth = shift.parentPath.length;
    if (path[depth]! < shift.fromIndex) continue;
    path[depth] = path[depth]! + shift.delta;
    changed = true;
  }
  return changed || entry.shiftCount !== shifts.length
    ? { ...entry, path, shiftCount: shifts.length }
    : entry;
}

function classifyPointer(path: string): ClassifiedPath | null {
  if (path === "") return { kind: "root" };
  let segments: string[];
  try {
    segments = parsePointer(path);
  } catch {
    return null;
  }
  if (segments.length === 1 && segments[0] === "content") return { kind: "root-content" };
  const parentPath: number[] = [];
  for (let index = 0; index < segments.length; ) {
    if (segments[index] !== "content") return { kind: "field" };
    if (index + 1 >= segments.length) return parentPath.length === 0 ? { kind: "root-content" } : { kind: "field" };
    const childIndex = Number(segments[index + 1]);
    if (!Number.isInteger(childIndex) || String(childIndex) !== segments[index + 1]) return { kind: "field" };
    if (index + 2 === segments.length) return { kind: "sibling", parentPath, index: childIndex };
    parentPath.push(childIndex);
    index += 2;
  }
  return { kind: "field" };
}

function isPrimitiveReplace(operation: TopologyPatch, classified: ClassifiedPath): boolean {
  return operation.op === "replace"
    && classified.kind === "sibling"
    && (operation.value === null || typeof operation.value !== "object");
}

function nodeIdOf(value: unknown): string | null {
  if (value === null || typeof value !== "object" || !("id" in value) || typeof value.id !== "string") return null;
  return value.id;
}

function parentPointer(parentPath: ReadonlyArray<number>): string {
  if (parentPath.length === 0) return "";
  return `/${parentPath.flatMap((index) => ["content", index]).join("/")}`;
}

function samePath(left: ReadonlyArray<number>, right: ReadonlyArray<number>): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function pathStartsWith(path: ReadonlyArray<number>, prefix: ReadonlyArray<number>): boolean {
  return prefix.length <= path.length && prefix.every((value, index) => value === path[index]);
}

function relativePatchPath(path: string, rootPointer: string): string | null {
  if (rootPointer === "") return path;
  if (path === rootPointer) return "";
  if (!path.startsWith(`${rootPointer}/`)) return null;
  return path.slice(rootPointer.length);
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

function asJSONValue(value: unknown): JSONValue | undefined {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    return undefined;
  }
  return value as JSONValue;
}
