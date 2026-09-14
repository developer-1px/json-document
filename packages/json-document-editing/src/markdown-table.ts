import type {SheetEditor,SheetPoint} from "./sheet.js";
import {jsonCellText} from "./cell-text.js";
import {sheetColumnLabel} from "./sheet-structure.js";
import type {TextEditor} from "./text.js";
import {readMarkdownTable,replaceMarkdownTable} from "@interactive-os/json-document-markdown";
import {createProjectedSheetEditor} from "./projected-sheet.js";

/** Markdown serialization belongs to Markdown; projection/history lifecycle belongs to Editing. */
export function createMarkdownTableEditor(text:TextEditor,position:()=>number):SheetEditor {
  return createProjectedSheetEditor({source:text,sheet:{resize:false,structure:{headerRows:1,minimumColumns:1}},
    read(){
      const table=readMarkdownTable(text.text,position());if(!table)return null;
      const width=table.align.length || table.rows[0]?.length || 0;
      const columns=Array.from({length:width},(_,i)=>({id:`c${i}`,label:sheetColumnLabel(i)}));
      return {columns,rows:table.rows.map((row,i)=>({id:`r${i}`,cells:Object.fromEntries(columns.map((column,j)=>[column.id,row[j] ?? ""]))}))};
    },
    write(value){
      const table=readMarkdownTable(text.text,position());if(!table)return {ok:false,code:"table.unavailable"};
      const rows=value.rows.map(row=>value.columns.map(column=>jsonCellText(row.cells[column.id])));
      const align=value.columns.map(column=>table.align[Number(column.id.slice(1))] ?? null);
      return text.replace(replaceMarkdownTable(text.text,table,rows,align),{anchor:table.from,focus:table.from});
    },
    mapSelection(selection,value){
      const point=(point:SheetPoint):SheetPoint=>({rowId:`r${value.rows.findIndex(row=>row.id === point.rowId)}`,columnId:`c${value.columns.findIndex(column=>column.id === point.columnId)}`});
      return {...selection,anchor:selection.anchor && point(selection.anchor),focus:selection.focus && point(selection.focus),ranges:selection.ranges.map(range=>({anchor:point(range.anchor),focus:point(range.focus)}))};
    },
  });
}
