import {
  buildPointer,
  createJSONDocument,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import {
  createEditingSession,
  type EditingResult,
  type EditingSession,
  type EditingSnapshot,
} from "./session.js";
import { createOrderedAxis } from "./ordered-axis.js";
import {
  collapsedRangeSelection,
  emptyRangeSelection,
  primaryRange,
  selectRangePoint,
  type RangeSelectionState,
  type SelectionRange,
} from "./range-selection.js";

export interface SheetColumn extends Record<string, JSONValue> {
  readonly id: string;
  readonly label: string;
}

export interface SheetRow extends Record<string, JSONValue> {
  readonly id: string;
  readonly cells: Readonly<Record<string, JSONValue>>;
}

export interface SheetDocument extends Record<string, JSONValue> {
  readonly columns: ReadonlyArray<SheetColumn>;
  readonly rows: ReadonlyArray<SheetRow>;
}

export interface SheetPoint extends Record<string, JSONValue> {
  readonly rowId: string;
  readonly columnId: string;
}

export interface SheetRange extends Record<string, JSONValue> {
  readonly anchor: SheetPoint;
  readonly focus: SheetPoint;
}

export interface SheetSelection extends Record<string, JSONValue> {
  /** Primary range aliases retained for single-range consumers. */
  readonly anchor: SheetPoint | null;
  readonly focus: SheetPoint | null;
  readonly ranges: ReadonlyArray<SheetRange>;
  readonly primaryIndex: number;
}

export interface SheetTopology {
  readonly rowIds: ReadonlyArray<string>;
  readonly columnIds: ReadonlyArray<string>;
}

export interface SheetCell extends SheetPoint {
  readonly value: JSONValue;
}

export interface SheetClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.sheet+json";
  readonly cells: ReadonlyArray<ReadonlyArray<JSONValue>>;
  readonly text: string;
}

export type SheetIntent =
  | {
      readonly type: "selection.set";
      readonly rowId: string;
      readonly columnId: string;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | {
      readonly type: "selection.fill";
      readonly value: JSONValue;
      readonly topology?: SheetTopology;
    }
  | {
      readonly type: "cell.commit";
      readonly rowId: string;
      readonly columnId: string;
      readonly value: JSONValue;
    }
  | {
      readonly type: "clipboard.paste";
      readonly clipboard: SheetClipboard;
      readonly topology?: SheetTopology;
    };

export interface SheetEditor {
  readonly snapshot: EditingSnapshot<SheetSelection>;
  readonly selectedCells: ReadonlyArray<SheetCell>;
  selectedCellsIn(topology: SheetTopology): ReadonlyArray<SheetCell>;
  dispatch(intent: SheetIntent): EditingResult<SheetSelection>;
  copy(topology?: SheetTopology): SheetClipboard | null;
  undo(): EditingResult<SheetSelection>;
  redo(): EditingResult<SheetSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<SheetSelection>) => void): () => void;
}

export function createSheetEditor(initial: SheetDocument): SheetEditor {
  assertSheetDocument(initial);
  const firstRow = initial.rows[0];
  const firstColumn = initial.columns[0];
  const initialSelection = firstRow && firstColumn
    ? collapsed(firstRow.id, firstColumn.id)
    : emptySelection();
  const session = createEditingSession({
    document: createJSONDocument(initial),
    selection: initialSelection,
  });

  function value(): SheetDocument {
    return session.snapshot.value as SheetDocument;
  }

  function selectedCells(topology?: SheetTopology): SheetCell[] {
    const document = value();
    const axes = resolveTopology(document, topology);
    const selectedKeys = new Set<string>();
    for (const range of session.snapshot.selection.ranges) {
      const bounds = rangeBounds(axes, range);
      if (bounds === null) continue;
      for (let rowIndex = bounds.rowStart; rowIndex <= bounds.rowEnd; rowIndex += 1) {
        for (let columnIndex = bounds.columnStart; columnIndex <= bounds.columnEnd; columnIndex += 1) {
          selectedKeys.add(cellKey(axes.rowIds[rowIndex]!, axes.columnIds[columnIndex]!));
        }
      }
    }
    const selected: SheetCell[] = [];
    for (const rowId of axes.rowIds) {
      const row = resolveRow(document, rowId);
      for (const columnId of axes.columnIds) {
        if (!selectedKeys.has(cellKey(rowId, columnId))) continue;
        selected.push({ rowId, columnId, value: row.cells[columnId]! });
      }
    }
    return selected;
  }

  function fillSelection(
    fillValue: JSONValue,
    topology?: SheetTopology,
  ): EditingResult<SheetSelection> {
    const document = value();
    const cells = selectedCells(topology);
    if (cells.length === 0) return failure("selection.empty");
    const operations: JSONPatchOperation[] = cells.map((cell) => {
      const row = resolvePointWithIndices(document, cell.rowId, cell.columnId)!;
      return {
        op: "replace",
        path: buildPointer(["rows", row.rowIndex, "cells", cell.columnId]),
        value: fillValue,
      };
    });
    return session.apply({
      operations,
      selectionAfter: session.snapshot.selection,
      origin: "selection.fill",
    });
  }

  function dispatch(intent: SheetIntent): EditingResult<SheetSelection> {
    if (intent.type === "selection.set") {
      const point = resolvePoint(value(), intent.rowId, intent.columnId);
      if (point === null) return failure("selection.cell-not-found");
      const selection = selectRangePoint(
        session.snapshot.selection,
        point,
        intent.mode ?? "replace",
        sameSheetPoint,
      );
      return success(session.select(withPrimaryAliases(selection)));
    }

    if (intent.type === "selection.fill") {
      return fillSelection(intent.value, intent.topology);
    }

    if (intent.type === "cell.commit") {
      const resolved = resolvePointWithIndices(value(), intent.rowId, intent.columnId);
      if (resolved === null) return failure("cell.not-found");
      return session.apply({
        operations: [{
          op: "replace",
          path: buildPointer(["rows", resolved.rowIndex, "cells", intent.columnId]),
          value: intent.value,
        }],
        selectionAfter: collapsed(intent.rowId, intent.columnId),
        origin: intent.type,
        historyGroup: `cell:${intent.rowId}:${intent.columnId}`,
      });
    }

    return paste(session, value(), intent.clipboard, intent.topology);
  }

  function copy(topology?: SheetTopology): SheetClipboard | null {
    const document = value();
    const axes = resolveTopology(document, topology);
    const range = primaryRange(session.snapshot.selection);
    const bounds = range === null ? null : rangeBounds(axes, range);
    if (bounds === null) return null;
    const cells = axes.rowIds
      .slice(bounds.rowStart, bounds.rowEnd + 1)
      .map((rowId) => axes.columnIds
        .slice(bounds.columnStart, bounds.columnEnd + 1)
        .map((columnId) => clone(resolveRow(document, rowId).cells[columnId]!)));
    return {
      type: "application/vnd.interactive-os.sheet+json",
      cells,
      text: cells.map((row) => row.map(cellText).join("\t")).join("\n"),
    };
  }

  return {
    get snapshot() { return session.snapshot; },
    get selectedCells() { return selectedCells(); },
    selectedCellsIn: (topology) => selectedCells(topology),
    dispatch,
    copy,
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function paste(
  session: EditingSession<SheetSelection>,
  document: SheetDocument,
  clipboard: SheetClipboard,
  topology?: SheetTopology,
): EditingResult<SheetSelection> {
  const focus = session.snapshot.selection.focus;
  if (focus === null) return failure("selection.empty");
  if (clipboard.cells.length === 0 || clipboard.cells.some((row) => row.length === 0)) {
    return failure("clipboard.empty");
  }
  const width = clipboard.cells[0]!.length;
  if (clipboard.cells.some((row) => row.length !== width)) {
    return failure("clipboard.not-rectangular");
  }
  const axes = resolveTopology(document, topology);
  const start = resolvePointInTopology(axes, focus.rowId, focus.columnId);
  if (start === null) return failure("selection.cell-not-found");
  if (start.rowIndex + clipboard.cells.length > axes.rowIds.length || start.columnIndex + width > axes.columnIds.length) {
    return failure("paste.out-of-bounds");
  }

  const operations: JSONPatchOperation[] = [];
  for (let rowOffset = 0; rowOffset < clipboard.cells.length; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < width; columnOffset += 1) {
      const rowId = axes.rowIds[start.rowIndex + rowOffset]!;
      const columnId = axes.columnIds[start.columnIndex + columnOffset]!;
      const row = resolvePointWithIndices(document, rowId, columnId)!;
      operations.push({
        op: "replace",
        path: buildPointer(["rows", row.rowIndex, "cells", columnId]),
        value: clipboard.cells[rowOffset]![columnOffset]!,
      });
    }
  }

  const endRowId = axes.rowIds[start.rowIndex + clipboard.cells.length - 1]!;
  const endColumnId = axes.columnIds[start.columnIndex + width - 1]!;
  return session.apply({
    operations,
    selectionAfter: withPrimaryAliases({
      ranges: [{
        anchor: { rowId: focus.rowId, columnId: focus.columnId },
        focus: { rowId: endRowId, columnId: endColumnId },
      }],
      primaryIndex: 0,
    }),
    origin: "clipboard.paste",
  });
}

function rangeBounds(
  topology: SheetTopology,
  range: SelectionRange<SheetPoint>,
): {
  readonly rowStart: number;
  readonly rowEnd: number;
  readonly columnStart: number;
  readonly columnEnd: number;
} | null {
  const rowAxis = createOrderedAxis(topology.rowIds);
  const columnAxis = createOrderedAxis(topology.columnIds);
  const anchorRow = rowAxis.indexOf(range.anchor.rowId);
  const anchorColumn = columnAxis.indexOf(range.anchor.columnId);
  const focusRow = rowAxis.indexOf(range.focus.rowId);
  const focusColumn = columnAxis.indexOf(range.focus.columnId);
  if (anchorRow === null || anchorColumn === null || focusRow === null || focusColumn === null) return null;
  return {
    rowStart: Math.min(anchorRow, focusRow),
    rowEnd: Math.max(anchorRow, focusRow),
    columnStart: Math.min(anchorColumn, focusColumn),
    columnEnd: Math.max(anchorColumn, focusColumn),
  };
}

function resolveTopology(document: SheetDocument, topology?: SheetTopology): SheetTopology {
  const resolved = topology ?? {
    rowIds: document.rows.map((row) => row.id),
    columnIds: document.columns.map((column) => column.id),
  };
  assertTopologyAxis(resolved.rowIds, new Set(document.rows.map((row) => row.id)), "row");
  assertTopologyAxis(resolved.columnIds, new Set(document.columns.map((column) => column.id)), "column");
  return resolved;
}

function assertTopologyAxis(ids: ReadonlyArray<string>, available: ReadonlySet<string>, label: "row" | "column"): void {
  assertUniqueIds(ids, label);
  for (const id of ids) {
    if (!available.has(id)) throw new Error(`Sheet topology ${label} was not found: ${JSON.stringify(id)}.`);
  }
}

function resolvePointInTopology(
  topology: SheetTopology,
  rowId: string,
  columnId: string,
): { readonly rowIndex: number; readonly columnIndex: number } | null {
  const rowIndex = topology.rowIds.indexOf(rowId);
  const columnIndex = topology.columnIds.indexOf(columnId);
  return rowIndex < 0 || columnIndex < 0 ? null : { rowIndex, columnIndex };
}

function resolveRow(document: SheetDocument, rowId: string): SheetRow {
  return document.rows.find((row) => row.id === rowId)!;
}

function resolvePoint(
  document: SheetDocument,
  rowId: string,
  columnId: string,
): SheetPoint | null {
  return resolvePointWithIndices(document, rowId, columnId) === null
    ? null
    : { rowId, columnId };
}

function resolvePointWithIndices(
  document: SheetDocument,
  rowId: string,
  columnId: string,
): { readonly rowIndex: number; readonly columnIndex: number } | null {
  const rowIndex = document.rows.findIndex((row) => row.id === rowId);
  const columnIndex = document.columns.findIndex((column) => column.id === columnId);
  return rowIndex < 0 || columnIndex < 0 ? null : { rowIndex, columnIndex };
}

function assertSheetDocument(document: SheetDocument): void {
  assertUniqueIds(document.columns.map((column) => column.id), "column");
  assertUniqueIds(document.rows.map((row) => row.id), "row");
  for (const row of document.rows) {
    for (const column of document.columns) {
      if (!Object.prototype.hasOwnProperty.call(row.cells, column.id)) {
        throw new Error(`Sheet row ${JSON.stringify(row.id)} is missing column ${JSON.stringify(column.id)}.`);
      }
    }
  }
}

function assertUniqueIds(ids: ReadonlyArray<string>, label: "row" | "column"): void {
  const unique = new Set<string>();
  for (const id of ids) {
    if (id.length === 0) throw new Error(`Sheet ${label} ids must not be empty.`);
    if (unique.has(id)) throw new Error(`Sheet ${label} id must be unique: ${JSON.stringify(id)}.`);
    unique.add(id);
  }
}

function cellText(value: JSONValue): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function collapsed(rowId: string, columnId: string): SheetSelection {
  const point: SheetPoint = { rowId, columnId };
  return withPrimaryAliases(collapsedRangeSelection(point));
}

function emptySelection(): SheetSelection {
  return withPrimaryAliases(emptyRangeSelection());
}

function withPrimaryAliases(
  selection: RangeSelectionState<SheetPoint>,
): SheetSelection {
  const primary = primaryRange(selection);
  return {
    anchor: primary?.anchor ?? null,
    focus: primary?.focus ?? null,
    ranges: selection.ranges.map((range) => ({
      anchor: { ...range.anchor },
      focus: { ...range.focus },
    })),
    primaryIndex: selection.primaryIndex,
  };
}

function sameSheetPoint(left: SheetPoint, right: SheetPoint): boolean {
  return left.rowId === right.rowId && left.columnId === right.columnId;
}

function cellKey(rowId: string, columnId: string): string {
  return `${rowId}\u0000${columnId}`;
}

function success(snapshot: EditingSnapshot<SheetSelection>): EditingResult<SheetSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<SheetSelection> {
  return { ok: false, code };
}

function clone<Value extends JSONValue>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}
