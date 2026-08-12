import {
  buildPointer,
  createJSONDocument,
  type JSONValue,
} from "@interactive-os/json-document";
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
  readonly ranges: ReadonlyArray<TreeRange>;
  readonly primaryIndex: number;
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
    const axis = createOrderedAxis(resolved.visibleIds);
    const selected = new Set<string>();
    for (const range of session.snapshot.selection.ranges) {
      for (const id of axis.interval(range.anchor.nodeId, range.focus.nodeId)) selected.add(id);
    }
    return resolved.visibleIds.filter((id) => selected.has(id));
  }

  function reconcile(topology: TreeTopology): EditingSnapshot<TreeSelection> {
    const resolved = resolveTopology(topology);
    const visible = new Set(resolved.visibleIds);
    const nodes = value().nodes;
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const normalized: TreeRange[] = [];
    let primaryIndex = 0;
    for (let index = 0; index < session.snapshot.selection.ranges.length; index += 1) {
      const range = session.snapshot.selection.ranges[index]!;
      const anchor = nearestVisible(range.anchor.nodeId, visible, byId);
      const focus = nearestVisible(range.focus.nodeId, visible, byId);
      if (anchor === null || focus === null) continue;
      const next: TreeRange = {
        anchor: { nodeId: anchor },
        focus: { nodeId: focus },
      };
      const duplicate = normalized.some((candidate) => (
        candidate.anchor.nodeId === next.anchor.nodeId
        && candidate.focus.nodeId === next.focus.nodeId
      ));
      if (!duplicate) {
        if (index === session.snapshot.selection.primaryIndex) primaryIndex = normalized.length;
        normalized.push(next);
      }
    }
    const selection: TreeSelection = normalized.length === 0
      ? emptySelection()
      : { ranges: normalized, primaryIndex: Math.min(primaryIndex, normalized.length - 1) };
    return session.select(selection);
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
