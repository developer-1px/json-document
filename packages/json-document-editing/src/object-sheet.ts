import {createCanvasEmbeddedDocument,type CanvasObjectDraft,type ObjectBounds} from "@interactive-os/json-document-object-document";
import {createProjectedSheetEditor} from "./projected-sheet.js";
import {createSheetDocument} from "@interactive-os/json-document-sheet-document";
import type {ObjectEditor} from "./object.js";
import type {SheetEditor} from "./sheet.js";

export const sheetEmbeddedDocumentType="sheet/1";
/** Create a table document within the Object owner's spatial container. */
export function createCanvasSheet(bounds:ObjectBounds,options:{rows?:number;columns?:number}={}):CanvasObjectDraft {
  const rowCount=options.rows ?? 4,columnCount=options.columns ?? 3;
  if(!Number.isSafeInteger(rowCount)||!Number.isSafeInteger(columnCount)||rowCount<1||columnCount<1)throw new RangeError("Sheet dimensions must be positive integers.");
  const document=createSheetDocument({rows:rowCount,columns:columnCount,columnWidth:120});
  return createCanvasEmbeddedDocument(sheetEmbeddedDocumentType,document,bounds,"표");
}
/** The parent remains the only persisted history owner, including edits from the table toolbar. */
export function createObjectSheetEditor(parent:ObjectEditor,objectId:string):SheetEditor {
  return createProjectedSheetEditor({source:parent,sheet:{structure:{minimumRows:1,minimumColumns:1}},
    read(){
      const object=(parent.snapshot.value as {objects:ReadonlyArray<Record<string,unknown>>}).objects.find(object=>object.id === objectId);
      if(object?.kind !== "embedded-document" || object.documentType !== sheetEmbeddedDocumentType)return null;
      return object.document;
    },
    write(document){return parent.dispatch({type:"object.document",objectId,document});},
  });
}
