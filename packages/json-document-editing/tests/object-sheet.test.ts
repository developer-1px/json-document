import {expect,test,vi} from "vitest";
import {createJSONDocument} from "@interactive-os/json-document";
import {parseCanvasDocument,serializeCanvasDocument,type CanvasDocument} from "@interactive-os/json-document-object-document";
import {createCanvasSheet,createObjectEditor,createObjectSheetEditor,type SheetDocument} from "../src/index.js";

test("embedded sheet writes one parent transaction and shares parent Undo, duplication and serialization",()=>{
 const initial:CanvasDocument={profile:"canvas/1",width:1280,height:720,objects:[{...createCanvasSheet({x:100,y:100,width:480,height:280}),id:"table"}]};
 const document=createJSONDocument(initial),changed=vi.fn();document.subscribe(changed);
 const parent=createObjectEditor(document),sheet=createObjectSheetEditor(parent,"table");
 const release=sheet.subscribe(()=>{});
 sheet.dispatch({type:"selection.set",rowId:"row-2",columnId:"column-2",mode:"extend"});expect(changed).not.toHaveBeenCalled();
 expect(sheet.dispatch({type:"cell.commit",rowId:"row-1",columnId:"column-1",value:"abc",preserveSelection:true}).ok).toBe(true);
 expect(changed).toHaveBeenCalledTimes(1);expect((sheet.snapshot.value as SheetDocument).rows[0]!.cells["column-1"]).toBe("abc");
 sheet.undo();expect(parent.snapshot.value).toEqual(initial);parent.redo();expect((sheet.snapshot.value as SheetDocument).rows[0]!.cells["column-1"]).toBe("abc");
 parent.dispatch({type:"object.duplicate",objectIds:["table"]});const saved=parent.snapshot.value as CanvasDocument;
 expect(saved.objects[1]!.document).toEqual(saved.objects[0]!.document);
 expect(parseCanvasDocument(serializeCanvasDocument(saved))).toEqual(saved);
 parent.dispatch({type:"object.remove",objectIds:["table"]});expect(sheet.dispatch({type:"cell.commit",rowId:"row-1",columnId:"column-1",value:"stale"}).ok).toBe(false);
 parent.undo();expect((sheet.snapshot.value as SheetDocument).rows[0]!.cells["column-1"]).toBe("abc");release();
});
