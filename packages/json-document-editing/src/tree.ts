import {
  buildPointer,
  createJSONDocument,
  type JSONValue,
} from "@interactive-os/json-document";
import {
  createRangeSelectionFamily,
  type OrderedTopology,
} from "@interactive-os/json-document-selection";
import { createOrderedAxis } from "./ordered-axis.js";
import {
  collapsedRangeSelection,
  emptyRangeSelection,
  selectRangePoint,
  type RangeSelectionState,
} from "./range-selection.js";
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

export type TreeIntent =
  | {
      readonly type: "selection.set";
      readonly nodeId: string;
      readonly topology: TreeTopology;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | { readonly type: "selection.remove"; readonly topology: TreeTopology };

export interface TreeEditor {
  readonly snapshot: EditingSnapshot<TreeSelection>;
  selectedNodeIdsIn(topology: TreeTopology): ReadonlyArray<string>;
  dispatch(intent: TreeIntent): EditingResult<TreeSelection>;
  reconcile(topology: TreeTopology): EditingSnapshot<TreeSelection>;
  undo(): EditingResult<TreeSelection>;
  redo(): EditingResult<TreeSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<TreeSelection>) => void): () => void;
}

export function createTreeEditor(initial: TreeDocument): TreeEditor {
  assertTreeDocument(initial);
  const selectionFamily = createRangeSelectionFamily<TreePoint, string>();
  const first = initial.nodes[0];
  const session = createEditingSession({
    document: createJSONDocument(initial),
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
    const axis = createOrderedAxis(topology.visibleIds);
    const visible = new Set(topology.visibleIds);
    const byId = new Map(value().nodes.map((node) => [node.id, node]));
    return {
      equals: (left, right) => left.nodeId === right.nodeId,
      interval: (anchor, focus) => axis.interval(anchor.nodeId, focus.nodeId),
      reconcilePoint(point) {
        const nodeId = nearestVisible(point.nodeId, visible, byId);
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

    const selectedIds = selectedNodeIdsIn(topology);
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
      origin: intent.type,
    });
  }

  return {
    get snapshot() { return session.snapshot; },
    selectedNodeIdsIn,
    dispatch,
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
