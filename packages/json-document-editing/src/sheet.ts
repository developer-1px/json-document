import {dispatchSheetIntent} from "./sheet-plan.js";
import type {SheetDocument,SheetColumn,SheetRow} from "@interactive-os/json-document-sheet-document";
export type {SheetDocument,SheetColumn,SheetRow} from "@interactive-os/json-document-sheet-document";
import { createSheetRow, createSheetColumn, sheetStructureActions, sheetStructureViolation, type SheetStructureIntent, type SheetStructurePolicy, type SheetStructureActions } from "./sheet-structure.js";
import {
  buildPointer,
  isJSONValue,
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
import type { EditingHistoryOptions } from "./history.js";
import { reconcileRangeSelection, replaceRangeSelection } from "./range-selection.js";
import { cutEditingClipboard, isClipboardRecord } from "./clipboard.js";
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
import { sheetNavigationTarget, type SheetTraversalDirection } from "./sheet-navigation.js";

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
  /** Anchor of the primary range; focus is the active cell and may move inside that range. */
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
    if (!isJSONValue(value) || !isClipboardRecord(value) || value.type !== this.mimeType || typeof value.text !== "string") return null;
    if (!Array.isArray(value.cells) || value.cells.length === 0 || !Array.isArray(value.cells[0])) return null;
    const width = value.cells[0].length;
    return width > 0 && value.cells.every((row) => Array.isArray(row) && row.length === width)
      ? value as SheetClipboard : null;
  },
};

export type SheetIntent =
  | SheetStructureIntent
  | { readonly type: "sheet.rename"; readonly name: string }
  | { readonly type: "column.resize"; readonly columnId: string; readonly width: number }
  | { readonly type: "row.resize"; readonly rowId: string; readonly height: number }
  | { readonly type: "selection.range"; readonly range: SheetRange }
  | { readonly type: "selection.row"; readonly rowId: string }
  | { readonly type: "selection.column"; readonly columnId: string }
  | { readonly type: "range.fill"; readonly source: SheetRange; readonly target: SheetRange }
  | { readonly type: "selection.navigate"; readonly direction: SheetTraversalDirection; readonly topology?: SheetTopology }
  | { readonly type: "selection.select-all"; readonly topology?: SheetTopology }
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
      readonly preserveSelection?: boolean;
    }
  | {
      readonly type: "clipboard.paste";
      readonly clipboard: SheetClipboard;
      readonly topology?: SheetTopology;
    };

export type SheetAvailability = "ready" | "missing" | "invalid" | "readonly";

export interface SheetEditor {
  readonly availability: SheetAvailability;
  readonly capabilities: {readonly resize: boolean};
  readonly structure: SheetStructureActions;
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

export interface SheetEditorOptions extends EditingHistoryOptions {
  /** False for formats such as GFM that cannot persist row heights or column widths. */
  readonly resize?: boolean;
  readonly structure?: SheetStructurePolicy;
  /** Restore selection when projecting a new source snapshot; missing cells are reconciled. */
  readonly selection?: SheetSelection;
}

export function createSheetEditor(source: EditingDocumentSource<SheetDocument>, options: SheetEditorOptions = {}): SheetEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as SheetDocument;
  assertSheetDocument(initial);
  const initialSelection = reconcileSheetSelection(initial, options.selection);
  const session = createEditingSession({
    ...options,
    document,
    selection: initialSelection,
    reconcileSelection: (selection, value) => withPrimaryAliases(reconcileRangeSelection(selection, (point) => {
      const sheet = value as SheetDocument;
      return sheet.rows.some((row) => row.id === point.rowId)
        && sheet.columns.some((column) => column.id === point.columnId) ? point : null;
    }), selection.focus && (value as SheetDocument).rows.some(row => row.id === selection.focus?.rowId)
      && (value as SheetDocument).columns.some(column => column.id === selection.focus?.columnId) ? selection.focus : null),
  });
  const editor=bindSheetEditing(session, options);
  editor.dispatch=intent=>dispatchSheetIntent(session,intent,options);
  return editor;
}

/** Shared selection reconciliation for standalone and parent-owned documents. */
export function reconcileSheetSelection(initial:SheetDocument, selection?:SheetSelection):SheetSelection {
  const firstRow=initial.rows[0],firstColumn=initial.columns[0];
  if(!selection)return firstRow && firstColumn ? collapsed(firstRow.id,firstColumn.id):emptySelection();
  const exists=(point:SheetPoint)=>initial.rows.some(row=>row.id === point.rowId) && initial.columns.some(column=>column.id === point.columnId);
  return withPrimaryAliases(reconcileRangeSelection(selection,point=>exists(point)?point:null),selection.focus && exists(selection.focus)?selection.focus:null);
}

/** Internal binding: one command implementation, independent of document/history storage. */
export function bindSheetEditing(session:EditingSession<SheetSelection>,options:SheetEditorOptions={}):SheetEditor {
  const initial=session.snapshot.value as SheetDocument;
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
    if (intent.type === "sheet.rename") return session.apply({operations:[{op:"add",path:"/name",value:intent.name}],selectionAfter:session.snapshot.selection,origin:intent.type,historyGroup:"sheet.name"});
    if (intent.type === "selection.row" || intent.type === "selection.column") {
      const current=value(), firstRow=current.rows[0],lastRow=current.rows.at(-1),firstColumn=current.columns[0],lastColumn=current.columns.at(-1);
      if(!firstRow || !lastRow || !firstColumn || !lastColumn) return failure("selection.empty");
      return dispatch({type:"selection.range",range:intent.type === "selection.row"
        ? {anchor:{rowId:intent.rowId,columnId:firstColumn.id},focus:{rowId:intent.rowId,columnId:lastColumn.id}}
        : {anchor:{rowId:firstRow.id,columnId:intent.columnId},focus:{rowId:lastRow.id,columnId:intent.columnId}}});
    }
    if (intent.type === "range.fill") {
      const current = value();
      const topology = resolveTopology(current, undefined, index());
      const source = gridRangeBounds(topology,intent.source), target = gridRangeBounds(topology,intent.target);
      if (!source || !target || target.rowStart > source.rowStart || target.rowEnd < source.rowEnd
        || target.columnStart > source.columnStart || target.columnEnd < source.columnEnd) return failure("sheet.invalid-fill");
      const operations: JSONPatchOperation[] = [];
      const modulo = (value:number,count:number) => (value % count + count) % count;
      for (let r=target.rowStart;r<=target.rowEnd;r++) for(let c=target.columnStart;c<=target.columnEnd;c++) {
        if (r>=source.rowStart && r<=source.rowEnd && c>=source.columnStart && c<=source.columnEnd) continue;
        const row=source.rowStart+modulo(r-source.rowStart,source.rowEnd-source.rowStart+1);
        const column=source.columnStart+modulo(c-source.columnStart,source.columnEnd-source.columnStart+1);
        operations.push({op:"replace",path:buildPointer(["rows",r,"cells",current.columns[c]!.id]),value:current.rows[row]!.cells[current.columns[column]!.id]!});
      }
      return session.apply({operations,selectionAfter:withPrimaryAliases(replaceRangeSelection(session.snapshot.selection,intent.target,sameSheetPoint)),origin:"range.fill"});
    }
    if (intent.type === "selection.range") {
      if (!resolvePoint(value(), intent.range.anchor.rowId, intent.range.anchor.columnId, index())
        || !resolvePoint(value(), intent.range.focus.rowId, intent.range.focus.columnId, index())) return failure("selection.cell-not-found");
      return success(session.select(withPrimaryAliases(replaceRangeSelection(session.snapshot.selection, intent.range, sameSheetPoint))));
    }
    if (intent.type === "column.resize" || intent.type === "row.resize") {
      if (options.resize === false) return failure("sheet.resize-unavailable");
      const column = intent.type === "column.resize";
      const size = column ? intent.width : intent.height;
      const position = column ? value().columns.findIndex(c => c.id === intent.columnId) : value().rows.findIndex(r => r.id === intent.rowId);
      if (position < 0 || !Number.isFinite(size) || size <= 0) return failure("sheet.invalid-size");
      return session.apply({operations: [{op:"add",path:buildPointer([column ? "columns" : "rows", position, column ? "width" : "height"]),value:size}],
        selectionAfter:session.snapshot.selection,origin:intent.type});
    }
    if (intent.type === "selection.navigate") {
      const next = sheetNavigationTarget(resolveTopology(value(), intent.topology, index()), session.snapshot.selection, intent.direction);
      if (!next) return failure("selection.boundary");
      return success(session.select(next.preserveRange ? withPrimaryAliases(session.snapshot.selection, {...next.point}) : collapsed(next.point.rowId, next.point.columnId)));
    }
    if (intent.type === "row.insert" || intent.type === "row.delete" || intent.type === "column.insert" || intent.type === "column.delete") {
      const current = value();
      const violation = sheetStructureViolation(current, intent, options.structure ?? {});
      if (violation) return failure(violation);
      let rows = [...current.rows], columns = [...current.columns];
      if (intent.type === "row.insert") {
        const inserted = intent.row ?? createSheetRow(current);
        if (!Number.isInteger(intent.index) || intent.index < 0 || intent.index > rows.length || rows.some(row => row.id === inserted.id) || !inserted.id) return failure("row.invalid-insert");
        if (columns.some(column => !Object.hasOwn(inserted.cells, column.id))) return failure("row.missing-cell");
        rows.splice(intent.index, 0, inserted);
      } else if (intent.type === "column.insert") {
        const inserted = intent.column ?? createSheetColumn(current);
        if (!Number.isInteger(intent.index) || intent.index < 0 || intent.index > columns.length || columns.some(column => column.id === inserted.id) || !inserted.id) return failure("column.invalid-insert");
        columns.splice(intent.index, 0, inserted);
        rows = rows.map(row => ({...row, cells: {...row.cells, [inserted.id]: ""}}));
      } else if (intent.type === "row.delete") {
        if (!rows.some(row => row.id === intent.rowId)) return failure("row.not-found");
        rows = rows.filter(row => row.id !== intent.rowId);
      } else {
        if (!columns.some(column => column.id === intent.columnId)) return failure("column.not-found");
        columns = columns.filter(column => column.id !== intent.columnId);
        rows = rows.map(row => { const cells = {...row.cells}; delete cells[intent.columnId]; return {...row, cells}; });
      }
      try {assertSheetDocument({...current,rows,columns});} catch {return failure("sheet.invalid-document");}
      const focus = session.snapshot.selection.focus;
      const oldRow = current.rows.findIndex(row => row.id === focus?.rowId);
      const oldColumn = current.columns.findIndex(column => column.id === focus?.columnId);
      const row = rows.find(row => row.id === focus?.rowId) ?? rows[Math.min(Math.max(oldRow, 0), rows.length - 1)];
      const column = columns.find(column => column.id === focus?.columnId) ?? columns[Math.min(Math.max(oldColumn, 0), columns.length - 1)];
      return session.apply({operations: [{op: "replace", path: "/rows", value: rows}, {op: "replace", path: "/columns", value: columns}],
        selectionAfter: row && column ? collapsed(row.id, column.id) : emptySelection(), origin: intent.type});
    }
    if (intent.type === "selection.select-all") {
      const { rowIds, columnIds } = resolveTopology(value(), intent.topology, index());
      const firstRow = rowIds[0];
      const firstColumn = columnIds[0];
      const lastRow = rowIds.at(-1);
      const lastColumn = columnIds.at(-1);
      const selection = replaceRangeSelection(session.snapshot.selection,
        firstRow !== undefined && firstColumn !== undefined && lastRow !== undefined && lastColumn !== undefined
          ? { anchor: { rowId: firstRow, columnId: firstColumn }, focus: { rowId: lastRow, columnId: lastColumn } }
          : null, sameSheetPoint);
      return success(session.select(withPrimaryAliases(selection)));
    }
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
        selectionAfter: intent.preserveSelection ? session.snapshot.selection : collapsed(intent.rowId, intent.columnId),
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
    get availability() {return "ready" as const;},
    get capabilities() {return {resize: options.resize !== false};},
    get structure() { return sheetStructureActions(value(), session.snapshot.selection, options.structure ?? {}); },
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
  if (!isJSONValue(clipboard)) return failure("clipboard.invalid");
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
  active?: SheetPoint | null,
): SheetSelection {
  const primary = primaryRange(selection);
  return {
    kind: "range",
    anchor: primary?.anchor ?? null,
    focus: active ?? primary?.focus ?? null,
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
