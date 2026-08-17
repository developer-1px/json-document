import type { SheetDocument } from "./sheet.js";

export function assertSheetDocument(document: SheetDocument): void {
  assertUniqueSheetIds(document.columns.map((column) => column.id), "column");
  assertUniqueSheetIds(document.rows.map((row) => row.id), "row");
  for (const row of document.rows) for (const column of document.columns) {
    if (!Object.prototype.hasOwnProperty.call(row.cells, column.id)) throw new Error(`Sheet row ${JSON.stringify(row.id)} is missing column ${JSON.stringify(column.id)}.`);
  }
}

export function assertUniqueSheetIds(ids: ReadonlyArray<string>, label: "row" | "column"): void {
  const unique = new Set<string>();
  for (const id of ids) {
    if (id.length === 0) throw new Error(`Sheet ${label} ids must not be empty.`);
    if (unique.has(id)) throw new Error(`Sheet ${label} id must be unique: ${JSON.stringify(id)}.`);
    unique.add(id);
  }
}
