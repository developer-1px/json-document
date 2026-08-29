import {
  buildPointer,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import {
  createEditingSession,
  type EditingResult,
  type EditingSession,
  type EditingSnapshot,
} from "./session.js";
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";
import { cutEditingClipboard, isClipboardJSONValue, isClipboardRecord } from "./clipboard.js";
import { gridCellsInRange, gridPointIndex, gridPointKey, gridRangeBounds, type GridTopology } from "./topology.js";
import { assertSheetDocument, assertUniqueSheetIds } from "./sheet-validation.js";
import {
  collapsedRangeSelection,
  emptyRangeSelection,
  primaryRange,
  selectRangePoint,
  type RangeSelectionState,
  type SelectionRange,
} from "./range-selection.js";
import { jsonCellText } from "./cell-text.js";

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
  readonly kind: "range";
  /** Primary range aliases retained for single-range consumers. */
  readonly anchor: SheetPoint | null;
  readonly focus: SheetPoint | null;
  readonly ranges: ReadonlyArray<SheetRange>;
  readonly primaryIndex: number | null;
}

export type SheetTopology = GridTopology;

export interface SheetCell extends SheetPoint {
  readonly value: JSONValue;
}

export interface SheetClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.sheet+json";
  readonly cells: ReadonlyArray<ReadonlyArray<JSONValue>>;
  readonly text: string;
}

export const sheetClipboardFormat = {
  mimeType: "application/vnd.interactive-os.sheet+json" as const,
  parse(value: unknown): SheetClipboard | null {
    if (!isClipboardRecord(value) || value.type !== this.mimeType || typeof value.text !== "string") return null;
    if (!Array.isArray(value.cells) || value.cells.length === 0 || !Array.isArray(value.cells[0])) return null;
    const width = value.cells[0].length;
    return width > 0 && value.cells.every((row) => Array.isArray(row) && row.length === width && row.every(isClipboardJSONValue))
      ? value as SheetClipboard : null;
  },
};

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
  cut(topology?: SheetTopology): { readonly clipboard: SheetClipboard; readonly result: EditingResult<SheetSelection> } | null;
  undo(): EditingResult<SheetSelection>;
  redo(): EditingResult<SheetSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<SheetSelection>) => void): () => void;
}

export function createSheetEditor(source: EditingDocumentSource<SheetDocument>): SheetEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as SheetDocument;
  assertSheetDocument(initial);
  const firstRow = initial.rows[0];
  const firstColumn = initial.columns[0];
  const initialSelection = firstRow && firstColumn
    ? collapsed(firstRow.id, firstColumn.id)
    : emptySelection();
  const session = createEditingSession({
    document,
    selection: initialSelection,
  });
  let indexedDocument: SheetDocument | undefined = initial;
  let indexedSheet: SheetIndex | undefined = createSheetIndex(initial);

  function index(document = value()): SheetIndex {
    if (document !== indexedDocument) {
      indexedDocument = document;
      indexedSheet = createSheetIndex(document);
    }
    return indexedSheet as SheetIndex;
  }

  function value(): SheetDocument {
    return session.snapshot.value as SheetDocument;
  }

  function selectedCells(topology?: SheetTopology): SheetCell[] {
    const document = value();
    const sheetIndex = index(document);
    const axes = resolveTopology(document, topology, sheetIndex);
    const selectedKeys = new Set<string>();
    for (const range of session.snapshot.selection.ranges) {
      for (const cell of gridCellsInRange(axes, range)) {
        selectedKeys.add(gridPointKey(cell));
      }
    }
    const selected: SheetCell[] = [];
    for (const rowId of axes.rowIds) {
      const row = sheetIndex.rowById.get(rowId) as SheetRow;
      for (const columnId of axes.columnIds) {
        if (!selectedKeys.has(gridPointKey({ rowId, columnId }))) continue;
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
      const row = resolvePointWithIndices(document, cell.rowId, cell.columnId, index(document))!;
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
      const point = resolvePoint(value(), intent.rowId, intent.columnId, index());
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
      const resolved = resolvePointWithIndices(value(), intent.rowId, intent.columnId, index());
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

    return paste(session, value(), intent.clipboard, intent.topology, index());
  }

  function copy(topology?: SheetTopology): SheetClipboard | null {
    const document = value();
    const sheetIndex = index(document);
    const axes = resolveTopology(document, topology, sheetIndex);
    const range = primaryRange(session.snapshot.selection);
    const bounds = range === null ? null : rangeBounds(axes, range);
    if (bounds === null) return null;
    const cells = axes.rowIds
      .slice(bounds.rowStart, bounds.rowEnd + 1)
      .map((rowId) => axes.columnIds
        .slice(bounds.columnStart, bounds.columnEnd + 1)
        .map((columnId) => clone((sheetIndex.rowById.get(rowId) as SheetRow).cells[columnId]!)));
    return {
      type: "application/vnd.interactive-os.sheet+json",
      cells,
      text: cells.map((row) => row.map(jsonCellText).join("\t")).join("\n"),
    };
  }

  function cut(topology?: SheetTopology): { readonly clipboard: SheetClipboard; readonly result: EditingResult<SheetSelection> } | null {
    return cutEditingClipboard(() => copy(topology), () => {
      const document = value();
      const axes = resolveTopology(document, topology, index(document));
      const range = primaryRange(session.snapshot.selection);
      const bounds = range === null ? null : rangeBounds(axes, range);
      if (bounds === null) return failure("selection.empty");
      const operations: JSONPatchOperation[] = [];
      for (const rowId of axes.rowIds.slice(bounds.rowStart, bounds.rowEnd + 1)) {
        for (const columnId of axes.columnIds.slice(bounds.columnStart, bounds.columnEnd + 1)) {
          const row = resolvePointWithIndices(document, rowId, columnId, index(document))!;
          operations.push({ op: "replace", path: buildPointer(["rows", row.rowIndex, "cells", columnId]), value: null });
        }
      }
      return session.apply({
        operations,
        selectionAfter: session.snapshot.selection,
        origin: "clipboard.cut",
      });
    });
  }

  return {
    get snapshot() { return session.snapshot; },
    get selectedCells() { return selectedCells(); },
    selectedCellsIn: (topology) => selectedCells(topology),
    dispatch,
    copy,
    cut,
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
  index?: SheetIndex,
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
  const axes = resolveTopology(document, topology, index);
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
      const row = resolvePointWithIndices(document, rowId, columnId, index)!;
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
      kind: "range",
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
) {
  return gridRangeBounds(topology, range);
}

interface SheetIndex {
  readonly rowById: ReadonlyMap<string, SheetRow>;
  readonly rowIndexById: ReadonlyMap<string, number>;
  readonly columnIndexById: ReadonlyMap<string, number>;
  readonly defaultTopology: SheetTopology;
  readonly validatedTopologies: WeakSet<SheetTopology>;
}

function createSheetIndex(document: SheetDocument): SheetIndex {
  const defaultTopology = {
    rowIds: document.rows.map((row) => row.id),
    columnIds: document.columns.map((column) => column.id),
  };
  return {
    rowById: new Map(document.rows.map((row) => [row.id, row])),
    rowIndexById: new Map(document.rows.map((row, position) => [row.id, position])),
    columnIndexById: new Map(document.columns.map((column, position) => [column.id, position])),
    defaultTopology,
    validatedTopologies: new WeakSet([defaultTopology]),
  };
}

function resolveTopology(document: SheetDocument, topology?: SheetTopology, index = createSheetIndex(document)): SheetTopology {
  const resolved = topology ?? index.defaultTopology;
  if (index.validatedTopologies.has(resolved)) return resolved;
  assertTopologyAxis(resolved.rowIds, index.rowById, "row");
  assertTopologyAxis(resolved.columnIds, index.columnIndexById, "column");
  index.validatedTopologies.add(resolved);
  return resolved;
}

function assertTopologyAxis(ids: ReadonlyArray<string>, available: { has(id: string): boolean }, label: "row" | "column"): void {
  assertUniqueSheetIds(ids, label);
  for (const id of ids) {
    if (!available.has(id)) throw new Error(`Sheet topology ${label} was not found: ${JSON.stringify(id)}.`);
  }
}

function resolvePointInTopology(
  topology: SheetTopology,
  rowId: string,
  columnId: string,
): { readonly rowIndex: number; readonly columnIndex: number } | null {
  return gridPointIndex(topology, { rowId, columnId });
}

function resolvePoint(
  document: SheetDocument,
  rowId: string,
  columnId: string,
  index?: SheetIndex,
): SheetPoint | null {
  return resolvePointWithIndices(document, rowId, columnId, index) === null
    ? null
    : { rowId, columnId };
}

function resolvePointWithIndices(
  document: SheetDocument,
  rowId: string,
  columnId: string,
  index = createSheetIndex(document),
): { readonly rowIndex: number; readonly columnIndex: number } | null {
  const rowIndex = index.rowIndexById.get(rowId);
  const columnIndex = index.columnIndexById.get(columnId);
  return rowIndex === undefined || columnIndex === undefined ? null : { rowIndex, columnIndex };
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
    kind: "range",
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


function success(snapshot: EditingSnapshot<SheetSelection>): EditingResult<SheetSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<SheetSelection> {
  return { ok: false, code };
}

function clone<Value extends JSONValue>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}
