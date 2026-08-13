import {
  buildPointer,
  type JSONValue,
} from "@interactive-os/json-document";
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";
import {
  createRangeSelectionFamily,
  type OrderedTopology,
} from "@interactive-os/json-document-selection";
import {
  collapsedRangeSelection,
  emptyRangeSelection,
  selectRangePoint,
  type RangeSelectionState,
} from "./range-selection.js";
import { lineInterval, lineTopology } from "./topology.js";
import {
  createEditingSession,
  type EditingResult,
  type EditingSnapshot,
} from "./session.js";

export interface TreeNode extends Record<string, JSONValue> {
  readonly id: string;
  readonly parentId: string | null;
  readonly label: string;
}

export interface TreeDocument extends Record<string, JSONValue> {
  readonly nodes: ReadonlyArray<TreeNode>;
}

export interface TreePoint extends Record<string, JSONValue> {
  readonly nodeId: string;
}

export interface TreeRange extends Record<string, JSONValue> {
  readonly anchor: TreePoint;
  readonly focus: TreePoint;
}

export interface TreeSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly ranges: ReadonlyArray<TreeRange>;
  readonly primaryIndex: number | null;
}

export interface TreeTopology {
  readonly visibleIds: ReadonlyArray<string>;
}

export interface TreeClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.tree+json";
  readonly nodes: ReadonlyArray<TreeNode>;
  readonly text: string;
}

export type TreeIntent =
  | {
      readonly type: "selection.set";
      readonly nodeId: string;
      readonly topology: TreeTopology;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | { readonly type: "selection.remove"; readonly topology: TreeTopology }
  | {
      readonly type: "clipboard.paste";
      readonly clipboard: TreeClipboard;
      readonly topology: TreeTopology;
      readonly afterId?: string;
    };

export interface TreeEditor {
  readonly snapshot: EditingSnapshot<TreeSelection>;
  selectedNodeIdsIn(topology: TreeTopology): ReadonlyArray<string>;
  dispatch(intent: TreeIntent): EditingResult<TreeSelection>;
  copy(topology: TreeTopology): TreeClipboard | null;
  cut(topology: TreeTopology): { readonly clipboard: TreeClipboard; readonly result: EditingResult<TreeSelection> } | null;
  reconcile(topology: TreeTopology): EditingSnapshot<TreeSelection>;
  undo(): EditingResult<TreeSelection>;
  redo(): EditingResult<TreeSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<TreeSelection>) => void): () => void;
}

export function createTreeEditor(
  source: EditingDocumentSource<TreeDocument>,
  options: { readonly createId?: () => string } = {},
): TreeEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as TreeDocument;
  assertTreeDocument(initial);
  let sequence = 0;
  const createId = options.createId ?? (() => `node-${++sequence}`);
  const selectionFamily = createRangeSelectionFamily<TreePoint, string>();
  const first = initial.nodes[0];
  const session = createEditingSession({
    document,
    selection: first ? collapsed(first.id) : emptySelection(),
  });

  function value(): TreeDocument {
    return session.snapshot.value as TreeDocument;
  }

  function resolveTopology(topology: TreeTopology): TreeTopology {
    const available = new Set(value().nodes.map((node) => node.id));
    const unique = new Set<string>();
    for (const id of topology.visibleIds) {
      if (!available.has(id)) throw new Error(`Tree topology node was not found: ${JSON.stringify(id)}.`);
      if (unique.has(id)) throw new Error(`Tree topology node must be unique: ${JSON.stringify(id)}.`);
      unique.add(id);
    }
    return topology;
  }

  function selectedNodeIdsIn(topology: TreeTopology): string[] {
    const resolved = resolveTopology(topology);
    const selected = new Set(selectionFamily.targets(
      session.snapshot.selection,
      { topology: rangeTopology(resolved) },
    ));
    return resolved.visibleIds.filter((id) => selected.has(id));
  }

  function reconcile(topology: TreeTopology): EditingSnapshot<TreeSelection> {
    const resolved = resolveTopology(topology);
    return session.reconcile((selection) => asTreeSelection(
      selectionFamily.reconcile(selection, { topology: rangeTopology(resolved) }).state,
    ));
  }

  function rangeTopology(topology: TreeTopology): OrderedTopology<TreePoint, string> {
    const visible = lineTopology(topology.visibleIds);
    const visibleSet = new Set(topology.visibleIds);
    const byId = new Map(value().nodes.map((node) => [node.id, node]));
    return {
      equals: (left, right) => left.nodeId === right.nodeId,
      interval: (anchor, focus) => lineInterval(visible, anchor.nodeId, focus.nodeId),
      reconcilePoint(point) {
        const nodeId = nearestVisible(point.nodeId, visibleSet, byId);
        return nodeId === null ? null : { nodeId };
      },
    };
  }

  function dispatch(intent: TreeIntent): EditingResult<TreeSelection> {
    const topology = resolveTopology(intent.topology);
    if (intent.type === "selection.set") {
      if (!topology.visibleIds.includes(intent.nodeId)) return failure("selection.node-not-visible");
      const point: TreePoint = { nodeId: intent.nodeId };
      const selection = selectRangePoint(
        session.snapshot.selection,
        point,
        intent.mode ?? "replace",
        (left, right) => left.nodeId === right.nodeId,
      );
      return success(session.select(asTreeSelection(selection)));
    }

    if (intent.type === "clipboard.paste") {
      return paste(intent.clipboard, topology, intent.afterId);
    }

    return removeSelected(topology, selectedNodeIdsIn(topology));
  }

  function copy(topology: TreeTopology): TreeClipboard | null {
    const selectedIds = selectedNodeIdsIn(topology);
    if (selectedIds.length === 0) return null;
    const nodes = value().nodes;
    const copiedIds = descendantClosure(nodes, new Set(selectedIds));
    const copied = nodes.filter((node) => copiedIds.has(node.id));
    return {
      type: "application/vnd.interactive-os.tree+json",
      nodes: copied,
      text: copied.map((node) => node.label).join("\n"),
    };
  }

  function paste(
    clipboard: TreeClipboard,
    topology: TreeTopology,
    afterId?: string,
  ): EditingResult<TreeSelection> {
    const nodes = value().nodes;
    const available = new Set(nodes.map((node) => node.id));
    const target = afterId ?? selectedNodeIdsIn(topology).at(-1);
    if (target !== undefined && !available.has(target)) return failure("paste.target-not-found");
    const parentId = target === undefined ? null : nodes.find((node) => node.id === target)?.parentId ?? null;
    const pasted = cloneNodesWithUniqueIds(clipboard.nodes, nodes, createId, parentId);
    if (pasted.length === 0) return failure("clipboard.empty");
    return session.apply({
      operations: pasted.map((node, offset) => ({
        op: "add",
        path: `/nodes/${nodes.length + offset}`,
        value: node,
      })),
      selectionAfter: rangesFor(pasted.filter((node) => node.parentId === parentId)),
      origin: "clipboard.paste",
    });
  }

  function removeSelected(
    topology: TreeTopology,
    selectedIds: ReadonlyArray<string>,
  ): EditingResult<TreeSelection> {
    if (selectedIds.length === 0) return failure("selection.empty");
    const document = value();
    const removed = descendantClosure(document.nodes, new Set(selectedIds));
    const indices = document.nodes
      .map((node, index) => removed.has(node.id) ? index : -1)
      .filter((index) => index >= 0)
      .sort((left, right) => right - left);
    const firstVisibleIndex = Math.min(...selectedIds.map((id) => topology.visibleIds.indexOf(id)));
    const remainingVisible = topology.visibleIds.filter((id) => !removed.has(id));
    const next = remainingVisible[Math.min(firstVisibleIndex, remainingVisible.length - 1)];
    return session.apply({
      operations: indices.map((index) => ({ op: "remove", path: buildPointer(["nodes", index]) })),
      selectionAfter: next ? collapsed(next) : emptySelection(),
      origin: "selection.remove",
    });
  }

  return {
    get snapshot() { return session.snapshot; },
    selectedNodeIdsIn,
    dispatch,
    copy,
    cut(topology) {
      const clipboard = copy(topology);
      if (!clipboard) return null;
      return { clipboard, result: removeSelected(resolveTopology(topology), selectedNodeIdsIn(topology)) };
    },
    reconcile,
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function nearestVisible(
  id: string,
  visible: ReadonlySet<string>,
  byId: ReadonlyMap<string, TreeNode>,
): string | null {
  let current: string | null = id;
  while (current !== null) {
    if (visible.has(current)) return current;
    current = byId.get(current)?.parentId ?? null;
  }
  return null;
}

function descendantClosure(
  nodes: ReadonlyArray<TreeNode>,
  selected: Set<string>,
): Set<string> {
  const removed = new Set(selected);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId !== null && removed.has(node.parentId) && !removed.has(node.id)) {
        removed.add(node.id);
        changed = true;
      }
    }
  }
  return removed;
}

function rangesFor(nodes: ReadonlyArray<TreeNode>): TreeSelection {
  return {
    kind: "range",
    ranges: nodes.map((node) => ({ anchor: { nodeId: node.id }, focus: { nodeId: node.id } })),
    primaryIndex: nodes.length === 0 ? null : 0,
  };
}

function createUniqueId(nodes: ReadonlyArray<TreeNode>, createId: () => string): string {
  const existing = new Set(nodes.map((node) => node.id));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = createId();
    if (!existing.has(id)) return id;
  }
  throw new Error("createId did not produce a unique tree node id");
}

function cloneNodesWithUniqueIds(
  source: ReadonlyArray<TreeNode>,
  existing: ReadonlyArray<TreeNode>,
  createId: () => string,
  rootParentId: string | null,
): TreeNode[] {
  const occupied = [...existing];
  const idMap = new Map<string, string>();
  const copied = source.map((node) => {
    const id = createUniqueId(occupied, createId);
    idMap.set(node.id, id);
    const copy = { ...node, id };
    occupied.push(copy);
    return copy;
  });
  const sourceIds = new Set(source.map((node) => node.id));
  return copied.map((node, index) => {
    const original = source[index]!;
    const parentId = original.parentId !== null && sourceIds.has(original.parentId)
      ? idMap.get(original.parentId) ?? rootParentId
      : rootParentId;
    return { ...node, parentId };
  });
}

function collapsed(nodeId: string): TreeSelection {
  return asTreeSelection(collapsedRangeSelection<TreePoint>({ nodeId }));
}

function emptySelection(): TreeSelection {
  return asTreeSelection(emptyRangeSelection<TreePoint>());
}

function asTreeSelection(selection: RangeSelectionState<TreePoint>): TreeSelection {
  return {
    kind: "range",
    ranges: selection.ranges.map((range) => ({
      anchor: { ...range.anchor },
      focus: { ...range.focus },
    })),
    primaryIndex: selection.primaryIndex,
  };
}

function assertTreeDocument(document: TreeDocument): void {
  const ids = new Set<string>();
  for (const node of document.nodes) {
    if (node.id.length === 0) throw new Error("Tree node ids must not be empty.");
    if (ids.has(node.id)) throw new Error(`Tree node id must be unique: ${JSON.stringify(node.id)}.`);
    ids.add(node.id);
  }
  for (const node of document.nodes) {
    if (node.parentId !== null && !ids.has(node.parentId)) {
      throw new Error(`Tree parent was not found: ${JSON.stringify(node.parentId)}.`);
    }
    let parentId = node.parentId;
    const ancestors = new Set([node.id]);
    while (parentId !== null) {
      if (ancestors.has(parentId)) throw new Error(`Tree hierarchy contains a cycle at ${JSON.stringify(node.id)}.`);
      ancestors.add(parentId);
      parentId = document.nodes.find((candidate) => candidate.id === parentId)?.parentId ?? null;
    }
  }
}

function success(snapshot: EditingSnapshot<TreeSelection>): EditingResult<TreeSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<TreeSelection> {
  return { ok: false, code };
}
