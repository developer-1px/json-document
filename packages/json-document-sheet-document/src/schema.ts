import { isJSONValue, type JSONValue } from "@interactive-os/json-document";
import { z } from "zod";

const jsonValue = z.custom<JSONValue>(isJSONValue, "Expected a JSON value.");
/** Canonical column schema; JSON extensions remain compatible with existing documents. */
export const sheetColumnSchema = z.object({id:z.string().min(1),label:z.string()}).catchall(jsonValue).readonly();
/** Canonical row schema. Cell values are JSON, including null and structured values. */
export const sheetRowSchema = z.object({id:z.string().min(1),cells:z.record(z.string(),jsonValue).readonly()}).catchall(jsonValue).readonly();
/** One runtime schema for standalone, Markdown-projected and embedded sheets. */
export const sheetDocumentSchema = z.object({columns:z.array(sheetColumnSchema).readonly(),rows:z.array(sheetRowSchema).readonly()}).catchall(jsonValue).superRefine((document,context)=>{
  for(const [axis,items,size] of [["columns",document.columns,"width"],["rows",document.rows,"height"]] as const){
    const ids=new Set<string>();
    items.forEach((item,index)=>{
      if(ids.has(item.id))context.addIssue({code:"custom",path:[axis,index,"id"],message:"Sheet ids must be unique."});
      ids.add(item.id);
      if(size in item && (typeof item[size] !== "number" || !Number.isFinite(item[size]) || item[size] <= 0))context.addIssue({code:"custom",path:[axis,index,size],message:"Sheet dimensions must be positive finite numbers."});
    });
  }
  document.rows.forEach((row,index)=>{for(const column of document.columns)if(!Object.hasOwn(row.cells,column.id))context.addIssue({code:"custom",path:["rows",index,"cells",column.id],message:"Sheet row is missing a column cell."});});
}).readonly();
export type SheetColumn = z.infer<typeof sheetColumnSchema>;
export type SheetRow = z.infer<typeof sheetRowSchema>;
export type SheetDocument = z.infer<typeof sheetDocumentSchema>;
/** Validate without replacing the caller's document identity. */
export function assertSheetDocument(value:unknown):asserts value is SheetDocument {
  if(!isJSONValue(value))throw new TypeError("Sheet requires a JSON document.");
  sheetDocumentSchema.parse(value);
}
