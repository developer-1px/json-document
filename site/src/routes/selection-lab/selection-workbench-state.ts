import { useRef, useState } from "react";
import {
  collapsedRangeSelection,
  createKeySelectionFamily,
  createRangeSelectionFamily,
  type EditingMode,
  type KeySelection,
  type RangeSelection,
  type ScopedSelection,
} from "@interactive-os/json-document-selection";

export type GridField = "label" | "status" | "color";
export type RecordPoint = { readonly recordId: string };
export type GridPoint = { readonly recordId: string; readonly field: GridField };
export type ProtocolScope = "canvas" | "vector" | "text";

export interface WorkspaceRecord {
  readonly id: string;
  readonly parentId: string | null;
  readonly label: string;
  readonly status: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
}

export interface WorkspaceDocument {
  readonly records: ReadonlyArray<WorkspaceRecord>;
}

export interface WorkspaceState {
  readonly document: WorkspaceDocument;
  readonly selections: {
    readonly order: RangeSelection<RecordPoint>;
    readonly grid: RangeSelection<GridPoint>;
    readonly objects: KeySelection<string>;
    readonly tree: RangeSelection<RecordPoint>;
    readonly protocol: KeySelection<string>;
  };
  readonly gridCurrent: GridPoint | null;
  readonly editing: EditingMode;
  readonly expanded: ReadonlyArray<string>;
  readonly universe: string;
  readonly scoped: ScopedSelection<ProtocolScope, KeySelection<string>>;
  readonly mask: ReadonlyArray<number>;
}

export interface WorkspaceSession {
  readonly state: WorkspaceState;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  select(update: (state: WorkspaceState) => WorkspaceState): void;
  mutate(origin: string, update: (document: WorkspaceDocument) => WorkspaceDocument): WorkspaceState;
  undo(): { readonly origin: string; readonly state: WorkspaceState } | null;
  redo(): { readonly origin: string; readonly state: WorkspaceState } | null;
}

interface HistoryEntry {
  readonly origin: string;
  readonly before: WorkspaceState;
  readonly after: WorkspaceState;
}

export const gridFields: ReadonlyArray<GridField> = ["label", "status", "color"];
export const keyFamily = createKeySelectionFamily<string>();
export const recordRangeFamily = createRangeSelectionFamily<RecordPoint, string>();
export const gridRangeFamily = createRangeSelectionFamily<GridPoint, string>();

const initialRecords: ReadonlyArray<WorkspaceRecord> = [
  { id: "alpha", parentId: null, label: "Alpha", status: "Ready", x: 24, y: 24, width: 112, height: 76, color: "#f59e0b" },
  { id: "beta", parentId: "alpha", label: "Beta", status: "Review", x: 96, y: 54, width: 122, height: 78, color: "#3b82f6" },
  { id: "gamma", parentId: "alpha", label: "Gamma", status: "Draft", x: 72, y: 142, width: 116, height: 64, color: "#10b981" },
  { id: "delta", parentId: null, label: "Delta", status: "Ready", x: 248, y: 150, width: 86, height: 58, color: "#f43f5e" },
];

const initialState: WorkspaceState = {
  document: { records: initialRecords },
  selections: {
    order: collapsedRangeSelection({ recordId: "alpha" }),
    grid: collapsedRangeSelection({ recordId: "alpha", field: "label" }),
    objects: { kind: "explicit", keys: ["alpha"], primaryKey: "alpha" },
    tree: collapsedRangeSelection({ recordId: "alpha" }),
    protocol: { kind: "explicit", keys: ["alpha"], primaryKey: "alpha" },
  },
  gridCurrent: { recordId: "alpha", field: "label" },
  editing: { kind: "navigate" },
  expanded: ["alpha", "delta"],
  universe: "workspace:v1",
  scoped: {
    scope: "canvas",
    selection: { kind: "explicit", keys: ["alpha"], primaryKey: "alpha" },
  },
  mask: [0, 0, 0, 0],
};

export function useWorkspaceSession(): WorkspaceSession {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const past = useRef<HistoryEntry[]>([]);
  const future = useRef<HistoryEntry[]>([]);

  function select(update: (current: WorkspaceState) => WorkspaceState) {
    setState(update);
  }

  function mutate(origin: string, update: (document: WorkspaceDocument) => WorkspaceDocument) {
    const document = update(state.document);
    if (document === state.document) return state;
    const after = reconcileWorkspace({ ...state, document });
    past.current.push({ origin, before: state, after });
    future.current = [];
    setState(after);
    return after;
  }

  function undo(): { readonly origin: string; readonly state: WorkspaceState } | null {
    const entry = past.current.pop();
    if (entry === undefined) return null;
    future.current.push(entry);
    setState(entry.before);
    return { origin: entry.origin, state: entry.before };
  }

  function redo(): { readonly origin: string; readonly state: WorkspaceState } | null {
    const entry = future.current.pop();
    if (entry === undefined) return null;
    past.current.push(entry);
    setState(entry.after);
    return { origin: entry.origin, state: entry.after };
  }

  return {
    state,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    select,
    mutate,
    undo,
    redo,
  };
}

export function recordContext(document: WorkspaceDocument, universe = "workspace") {
  return {
    keys: document.records.map((record) => record.id),
    universe,
    universeMismatch: "clear" as const,
  };
}

export function orderContext(document: WorkspaceDocument) {
  const ids = document.records.map((record) => record.id);
  return { topology: axisTopology(ids) };
}

export function gridContext(document: WorkspaceDocument) {
  const points = document.records.flatMap((record) => (
    gridFields.map((field) => ({ recordId: record.id, field }))
  ));
  return {
    topology: {
      equals: sameGridPoint,
      interval(anchor: GridPoint, focus: GridPoint) {
        const rowIds = document.records.map((record) => record.id);
        const rowStart = rowIds.indexOf(anchor.recordId);
        const rowEnd = rowIds.indexOf(focus.recordId);
        const columnStart = gridFields.indexOf(anchor.field);
        const columnEnd = gridFields.indexOf(focus.field);
        if ([rowStart, rowEnd, columnStart, columnEnd].some((index) => index < 0)) return [];
        const targets: string[] = [];
        for (let row = Math.min(rowStart, rowEnd); row <= Math.max(rowStart, rowEnd); row += 1) {
          for (let column = Math.min(columnStart, columnEnd); column <= Math.max(columnStart, columnEnd); column += 1) {
            targets.push(`${rowIds[row]}:${gridFields[column]}`);
          }
        }
        return targets;
      },
      reconcilePoint(point: GridPoint) {
        return points.some((candidate) => sameGridPoint(candidate, point)) ? point : null;
      },
    },
  };
}

export function treeContext(document: WorkspaceDocument, expanded: ReadonlyArray<string>) {
  const visibleIds = visibleTreeIds(document.records, new Set(expanded));
  const visible = new Set(visibleIds);
  const byId = new Map(document.records.map((record) => [record.id, record]));
  const axis = axisTopology(visibleIds);
  return {
    topology: {
      equals: axis.equals,
      interval: axis.interval,
      reconcilePoint(point: RecordPoint) {
        let recordId: string | null = point.recordId;
        while (recordId !== null) {
          if (visible.has(recordId)) return { recordId };
          recordId = byId.get(recordId)?.parentId ?? null;
        }
        return null;
      },
    },
  };
}

export function visibleTreeIds(records: ReadonlyArray<WorkspaceRecord>, expanded: ReadonlySet<string>): string[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  return records.filter((record) => {
    let parentId = record.parentId;
    while (parentId !== null) {
      if (!expanded.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return true;
  }).map((record) => record.id);
}

export function selectedRecordIds(selection: RangeSelection<RecordPoint>, document: WorkspaceDocument): readonly string[] {
  return recordRangeFamily.targets(selection, orderContext(document));
}

export function selectedGridTargets(selection: RangeSelection<GridPoint>, document: WorkspaceDocument): readonly string[] {
  return gridRangeFamily.targets(selection, gridContext(document));
}

export function deleteRecords(document: WorkspaceDocument, ids: ReadonlySet<string>): WorkspaceDocument {
  const removed = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const record of document.records) {
      if (record.parentId !== null && removed.has(record.parentId) && !removed.has(record.id)) {
        removed.add(record.id);
        changed = true;
      }
    }
  }
  return { records: document.records.filter((record) => !removed.has(record.id)) };
}

function reconcileWorkspace(state: WorkspaceState): WorkspaceState {
  const recordIds = new Set(state.document.records.map((record) => record.id));
  const expanded = state.expanded.filter((id) => recordIds.has(id));
  const context = recordContext(state.document);
  return {
    ...state,
    expanded,
    gridCurrent: state.gridCurrent !== null && recordIds.has(state.gridCurrent.recordId)
      ? state.gridCurrent
      : null,
    editing: state.gridCurrent !== null && recordIds.has(state.gridCurrent.recordId)
      ? state.editing
      : { kind: "navigate" },
    mask: state.document.records.map((_, index) => state.mask[index] ?? 0),
    selections: {
      order: recordRangeFamily.reconcile(state.selections.order, orderContext(state.document)).state,
      grid: gridRangeFamily.reconcile(state.selections.grid, gridContext(state.document)).state,
      objects: keyFamily.reconcile(state.selections.objects, context).state,
      tree: recordRangeFamily.reconcile(state.selections.tree, treeContext(state.document, expanded)).state,
      protocol: keyFamily.reconcile(state.selections.protocol, recordContext(state.document, state.universe)).state,
    },
  };
}

function axisTopology(ids: ReadonlyArray<string>) {
  return {
    equals: (left: RecordPoint, right: RecordPoint) => left.recordId === right.recordId,
    interval(anchor: RecordPoint, focus: RecordPoint) {
      const start = ids.indexOf(anchor.recordId);
      const end = ids.indexOf(focus.recordId);
      if (start < 0 || end < 0) return [];
      return ids.slice(Math.min(start, end), Math.max(start, end) + 1);
    },
    reconcilePoint(point: RecordPoint) {
      return ids.includes(point.recordId) ? point : null;
    },
  };
}

function sameGridPoint(left: GridPoint, right: GridPoint): boolean {
  return left.recordId === right.recordId && left.field === right.field;
}
