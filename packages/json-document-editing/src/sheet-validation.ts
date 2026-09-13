import type { SheetDocument } from "./sheet.js";

export function assertSheetDocument(document: SheetDocument): void {
  if (!document || !Array.isArray(document.columns) || !Array.isArray(document.rows)) throw new Error("Sheet requires row and column arrays.");
  for (const column of document.columns) {
    if (!column || typeof column.id !== "string" || typeof column.label !== "string") throw new Error("Sheet columns require string ids and labels.");
  }
  for (const row of document.rows) {
    if (!row || typeof row.id !== "string" || !row.cells || typeof row.cells !== "object" || Array.isArray(row.cells)) throw new Error("Sheet rows require string ids and cell records.");
  }
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
