export {createSheetRow,createSheetColumn,sheetColumnLabel} from "@interactive-os/json-document-sheet-document";
import type { SheetColumn, SheetDocument, SheetRow, SheetSelection } from "./sheet.js";

export type SheetStructureIntent =
  | { readonly type: "row.insert"; readonly index: number; readonly row?: SheetRow }
  | { readonly type: "row.delete"; readonly rowId: string }
  | { readonly type: "column.insert"; readonly index: number; readonly column?: SheetColumn }
  | { readonly type: "column.delete"; readonly columnId: string };

export interface SheetStructurePolicy {
  readonly headerRows?: number;
  readonly minimumColumns?: number;
  readonly minimumRows?: number;
}
export interface SheetStructureActions {
  readonly insertRow: SheetStructureIntent;
  readonly insertColumn: SheetStructureIntent;
  readonly deleteRow: SheetStructureIntent | null;
  readonly deleteColumn: SheetStructureIntent | null;
}

export function sheetStructureViolation(document: SheetDocument, intent: SheetStructureIntent, policy: SheetStructurePolicy): string | null {
  const headerRows = policy.headerRows ?? 0;
  if (intent.type === "row.insert" && intent.index < headerRows) return "sheet.header-protected";
  if (intent.type === "row.delete" && document.rows.findIndex(row => row.id === intent.rowId) >= 0 && document.rows.findIndex(row => row.id === intent.rowId) < headerRows) return "sheet.header-protected";
  if (intent.type === "row.delete" && document.rows.length <= (policy.minimumRows ?? 0)) return "sheet.minimum-rows";
  if (intent.type === "column.delete" && document.columns.length <= (policy.minimumColumns ?? 0)) return "sheet.minimum-columns";
  return null;
}

export function sheetStructureActions(document: SheetDocument, selection: SheetSelection, policy: SheetStructurePolicy): SheetStructureActions {
  const focus = selection.focus;
  const row = document.rows.findIndex(row => row.id === focus?.rowId);
  const column = document.columns.findIndex(column => column.id === focus?.columnId);
  const deleteRow: SheetStructureIntent | null = row < 0 ? null : {type: "row.delete", rowId: focus!.rowId};
  const deleteColumn: SheetStructureIntent | null = column < 0 ? null : {type: "column.delete", columnId: focus!.columnId};
  return {
    insertRow: {type: "row.insert", index: Math.max(policy.headerRows ?? 0, row + 1)},
    insertColumn: {type: "column.insert", index: column + 1},
    deleteRow: deleteRow && !sheetStructureViolation(document, deleteRow, policy) ? deleteRow : null,
    deleteColumn: deleteColumn && !sheetStructureViolation(document, deleteColumn, policy) ? deleteColumn : null,
  };
}
