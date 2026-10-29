import { isJSONValue, type JSONValue } from "@interactive-os/json-document";

/** Canonical column shape; JSON extensions remain compatible with existing documents. */
export type SheetColumn = { readonly id: string; readonly label: string; readonly [extension: string]: JSONValue };
/** Canonical row shape. Cell values are JSON, including null and structured values. */
export type SheetRow = { readonly id: string; readonly cells: { readonly [columnId: string]: JSONValue }; readonly [extension: string]: JSONValue };
/** One shape for standalone, Markdown-projected and embedded sheets. */
export type SheetDocument = { readonly columns: readonly SheetColumn[]; readonly rows: readonly SheetRow[]; readonly [extension: string]: JSONValue };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isSize = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0;
function fail(path: string, message: string): never { throw new TypeError(`${path}: ${message}`); }

function checkItem(value: unknown, path: string): asserts value is Record<string, unknown> & { readonly id: string } {
  if (!isObject(value) || !isJSONValue(value)) fail(path, "Expected a JSON object.");
  if (typeof value.id !== "string" || value.id === "") fail(`${path}.id`, "Sheet ids must be non-empty strings.");
}

/** Validate one column without replacing the caller's identity. */
export function assertSheetColumn(value: unknown, path = "column"): asserts value is SheetColumn {
  checkItem(value, path);
  if (typeof value.label !== "string") fail(`${path}.label`, "Column label must be a string.");
  if ("width" in value && !isSize(value.width)) fail(`${path}.width`, "Column width must be positive and finite.");
}

/** Validate one row without replacing the caller's identity. */
export function assertSheetRow(value: unknown, path = "row"): asserts value is SheetRow {
  checkItem(value, path);
  if (!isObject(value.cells)) fail(`${path}.cells`, "Row cells must be an object.");
  if ("height" in value && !isSize(value.height)) fail(`${path}.height`, "Row height must be positive and finite.");
}

/** Validate without replacing the caller's document identity. */
export function assertSheetDocument(value: unknown): asserts value is SheetDocument {
  if (!isObject(value) || !isJSONValue(value)) fail("sheet", "Sheet requires a JSON document.");
  if (!Array.isArray(value.columns)) fail("sheet.columns", "Expected an array.");
  if (!Array.isArray(value.rows)) fail("sheet.rows", "Expected an array.");
  const columns: unknown[] = value.columns, rows: unknown[] = value.rows;
  columns.forEach((column, index) => assertSheetColumn(column, `sheet.columns[${index}]`));
  rows.forEach((row, index) => assertSheetRow(row, `sheet.rows[${index}]`));
  uniqueIds(columns as SheetColumn[], "columns");
  uniqueIds(rows as SheetRow[], "rows");
  (rows as SheetRow[]).forEach((row, index) => {
    for (const column of columns as SheetColumn[]) if (!Object.hasOwn(row.cells, column.id)) fail(`sheet.rows[${index}].cells.${column.id}`, "Sheet row is missing a column cell.");
  });
}

function uniqueIds(items: readonly { readonly id: string }[], axis: string) {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    if (ids.has(item.id)) fail(`sheet.${axis}[${index}].id`, "Sheet ids must be unique.");
    ids.add(item.id);
  });
}
