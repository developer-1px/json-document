import {assertSheetDocument,type SheetDocument,type SheetColumn,type SheetRow} from "./schema.js";

export interface CreateSheetDocumentOptions {
  readonly rows?:number;
  readonly columns?:number;
  readonly name?:string;
  readonly columnWidth?:number;
  readonly rowHeight?:number;
}
/** Create the shared document shape; Hosts supply only policy values. */
export function createSheetDocument(options:CreateSheetDocumentOptions={}):SheetDocument {
  const rowCount=options.rows ?? 4,columnCount=options.columns ?? 3;
  if(!Number.isSafeInteger(rowCount)||!Number.isSafeInteger(columnCount)||rowCount<0||columnCount<0)throw new RangeError("Sheet dimensions must be nonnegative integers.");
  const columns=Array.from({length:columnCount},(_,index)=>({id:`column-${index+1}`,label:sheetColumnLabel(index),...(options.columnWidth === undefined ? {}:{width:options.columnWidth})}));
  const document={...(options.name === undefined ? {}:{name:options.name}),columns,rows:Array.from({length:rowCount},(_,index)=>({id:`row-${index+1}`,...(options.rowHeight === undefined ? {}:{height:options.rowHeight}),cells:Object.fromEntries(columns.map(column=>[column.id,""]))}))};
  assertSheetDocument(document);return document;
}

/** Zero-based spreadsheet column coordinates: A … Z, AA … AZ, BA … */
export function sheetColumnLabel(index: number): string {
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError("Column index must be a nonnegative safe integer");
  let remaining = index + 1, label = "";
  while (remaining > 0) { remaining--; label = String.fromCharCode(65 + remaining % 26) + label; remaining = Math.floor(remaining / 26); }
  return label;
}

export function createSheetRow(document: SheetDocument): SheetRow {
  return {id: availableId(document.rows, "row"), cells: Object.fromEntries(document.columns.map(column => [column.id, ""]))};
}
export function createSheetColumn(document: SheetDocument): SheetColumn {
  return {id: availableId(document.columns, "column"), label: sheetColumnLabel(document.columns.length)};
}
function availableId(values: ReadonlyArray<{readonly id: string}>, prefix: string): string {
  const ids = new Set(values.map(value => value.id));
  let index = 1;
  while (ids.has(`${prefix}-${index}`)) index++;
  return `${prefix}-${index}`;
}
