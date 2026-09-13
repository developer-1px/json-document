import {jsonCellText} from "./cell-text.js";
import {sheetColumnLabel} from "./sheet-structure.js";
import type {SheetEditor, SheetDocument} from "./sheet.js";

/** Coordinates and value counts derived from the canonical selection. */
export function sheetSelectionSummary(editor: SheetEditor): {address: string; selected: number; filled: number} {
  const sheet = editor.snapshot.value as SheetDocument;
  const focus = editor.snapshot.selection.focus;
  const row = sheet.rows.findIndex(item => item.id === focus?.rowId);
  const column = sheet.columns.findIndex(item => item.id === focus?.columnId);
  const cells = editor.selectedCells;
  return {address: row < 0 || column < 0 ? "" : `${sheetColumnLabel(column)}${row + 1}`,
    selected: cells.length, filled: cells.filter(cell => jsonCellText(cell.value).length > 0).length};
}
