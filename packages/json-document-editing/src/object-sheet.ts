import {createCanvasEmbeddedDocument,type CanvasObjectDraft,type ObjectBounds} from "@interactive-os/json-document-object-document";
import {createProjectedSheetEditor} from "./projected-sheet.js";
import {assertSheetDocument} from "./sheet-validation.js";
import {sheetColumnLabel} from "./sheet-structure.js";
import type {ObjectEditor} from "./object.js";
import type {SheetDocument,SheetEditor} from "./sheet.js";

export const sheetEmbeddedDocumentType="sheet/1";
/** Create a table document within the Object owner's spatial container. */
export function createCanvasSheet(bounds:ObjectBounds,options:{rows?:number;columns?:number}={}):CanvasObjectDraft {
  const rowCount=options.rows ?? 4,columnCount=options.columns ?? 3;
  if(!Number.isSafeInteger(rowCount)||!Number.isSafeInteger(columnCount)||rowCount<1||columnCount<1)throw new RangeError("Sheet dimensions must be positive integers.");
  const columns=Array.from({length:columnCount},(_,i)=>({id:`c${i}`,label:sheetColumnLabel(i),width:120}));
  const document:SheetDocument={columns,rows:Array.from({length:rowCount},(_,i)=>({id:`r${i}`,cells:Object.fromEntries(columns.map(column=>[column.id,""]))}))};
  return createCanvasEmbeddedDocument(sheetEmbeddedDocumentType,document,bounds,"표");
}
/** The parent remains the only persisted history owner, including edits from the table toolbar. */
export function createObjectSheetEditor(parent:ObjectEditor,objectId:string):SheetEditor {
  return createProjectedSheetEditor({source:parent,sheet:{structure:{minimumRows:1,minimumColumns:1}},
    read(){
      const object=(parent.snapshot.value as {objects:ReadonlyArray<Record<string,unknown>>}).objects.find(object=>object.id === objectId);
      if(object?.kind !== "embedded-document" || object.documentType !== sheetEmbeddedDocumentType)return null;
      try{assertSheetDocument(object.document as SheetDocument);return object.document as SheetDocument;}catch{return null;}
    },
    write(document){return parent.dispatch({type:"object.document",objectId,document});},
  });
}
