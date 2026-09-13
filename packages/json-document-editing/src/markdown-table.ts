import { createSheetEditor, type SheetDocument, type SheetEditor, type SheetIntent, type SheetSelection, type SheetPoint } from "./sheet.js";
import { jsonCellText } from "./cell-text.js";
import { sheetColumnLabel } from "./sheet-structure.js";
import type { EditingResult } from "./session.js";
import type { TextEditor } from "./text.js";
import { readMarkdownTable, replaceMarkdownTable, type MarkdownTable } from "@interactive-os/json-document-markdown";

/** Adapt source table transactions to Sheet, retaining the TextEditor as the only history owner. */
export function createMarkdownTableEditor(text: TextEditor, position: () => number): SheetEditor {
  let observed = "";
  let sheet: SheetEditor;
  let revision = 0;
  let projectedSelection: SheetSelection | undefined;
  const listeners = new Set<Parameters<SheetEditor["subscribe"]>[0]>();
  let unsubscribe: (() => void) | undefined;
  const read = () => {
    if (sheet && observed === text.text) return;
    const selected = projectedSelection ?? sheet?.snapshot.selection;
    projectedSelection = undefined;
    observed = text.text;
    const table = readMarkdownTable(observed, position());
    const width = table?.align.length || table?.rows[0]?.length || 0;
    const columns = Array.from({length: width}, (_, i) => ({id: `c${i}`, label: sheetColumnLabel(i)}));
    sheet = createSheetEditor({columns, rows: (table?.rows ?? []).map((row, i) => ({id: `r${i}`, cells: Object.fromEntries(columns.map((column, j) => [column.id, row[j] ?? ""]))}))}, {resize:false, structure: {headerRows: 1, minimumColumns: 1}, ...(selected ? {selection: selected} : {})});
  };
  const snapshot = () => {read(); return {...sheet.snapshot, revision, canUndo: text.snapshot.canUndo, canRedo: text.snapshot.canRedo};};
  const publish = () => {revision++; const next = snapshot(); listeners.forEach(listener => listener(next));};
  const mutate = (intent: SheetIntent): EditingResult<SheetSelection> => {
    read();
    const table = readMarkdownTable(text.text, position());
    if (!table) return {ok: false, code: "table.unavailable"};
    const result = sheet.dispatch(intent);
    if (!result.ok) return result;
    if (intent.type === "selection.set" || intent.type === "selection.select-all" || intent.type === "selection.navigate" || intent.type === "selection.range" || intent.type === "selection.row" || intent.type === "selection.column") {publish(); return {ok: true, snapshot: snapshot()};}
    return commit(table);
  };
  const commit = (table: MarkdownTable): EditingResult<SheetSelection> => {
    const value = sheet.snapshot.value as SheetDocument;
    const rows = value.rows.map(row => value.columns.map(column => jsonCellText(row.cells[column.id])));
    const align = value.columns.map(column => table.align[Number(column.id.slice(1))] ?? null);
    const next = replaceMarkdownTable(text.text, table, rows, align);
    const point = (point: SheetPoint): SheetPoint => ({rowId: `r${value.rows.findIndex(row => row.id === point.rowId)}`, columnId: `c${value.columns.findIndex(column => column.id === point.columnId)}`});
    const selection = sheet.snapshot.selection;
    projectedSelection = {...selection, anchor: selection.anchor ? point(selection.anchor) : null, focus: selection.focus ? point(selection.focus) : null,
      ranges: selection.ranges.map(range => ({anchor: point(range.anchor), focus: point(range.focus)}))};
    const committed = text.replace(next, {anchor: table.from, focus: table.from});
    if (!committed.ok) {observed = ""; read(); return committed;}
    // A selection-only sheet engine is rebuilt from source after every document transaction.
    observed = ""; publish();
    return {ok: true, snapshot: snapshot()};
  };
  const history = (action: "undo" | "redo"): EditingResult<SheetSelection> => {
    const result = text[action](); if (!result.ok) return result;
    publish(); return {ok: true, snapshot: snapshot()};
  };
  return {
    get capabilities() {read(); return sheet.capabilities;},
    get structure() {read(); return sheet.structure;},
    get snapshot() {return snapshot();},
    get selectedCells() {read(); return sheet.selectedCells;},
    selectedCellsIn(topology) {read(); return sheet.selectedCellsIn(topology);},
    dispatch: mutate,
    copy(topology) {read(); return sheet.copy(topology);},
    cut(topology) {
      read(); const table = readMarkdownTable(text.text, position()); if (!table) return null;
      const cut = sheet.cut(topology); if (!cut) return null;
      return {clipboard: cut.clipboard, result: cut.result.ok ? commit(table) : cut.result};
    },
    undo: () => history("undo"), redo: () => history("redo"),
    subscribe(listener) {
      listeners.add(listener);
      unsubscribe ??= text.subscribe(publish);
      return () => {listeners.delete(listener); if (!listeners.size) {unsubscribe?.(); unsubscribe = undefined;}};
    },
  };
}
