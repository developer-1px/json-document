import {expect,test,vi} from "vitest";
import {applyPatch,createJSONDocument} from "@interactive-os/json-document";
import {createSheetDocument} from "@interactive-os/json-document-sheet-document";
import {createSheetEditor,createProjectedSheetEditor,planSheetIntent} from "../src/index.js";

test("planning does not mutate input or record history and matches standalone commands",()=>{
 const value=createSheetDocument({rows:2,columns:2}),editor=createSheetEditor(value),selection=editor.snapshot.selection;
 for(const intent of [{type:"cell.commit",rowId:"row-1",columnId:"column-1",value:"hello"},{type:"row.insert",index:1},{type:"selection.set",rowId:"row-2",columnId:"column-2"}] as const){
  const before=JSON.stringify(value),plan=planSheetIntent(value,selection,intent);expect(plan.ok).toBe(true);if(!plan.ok)continue;
  const independent=createSheetEditor(value);independent.dispatch(intent);
  const applied=applyPatch(value,plan.plan.operations);expect(applied.ok && applied.value).toEqual(independent.snapshot.value);
  expect(plan.plan.selectionAfter).toEqual(independent.snapshot.selection);expect(JSON.stringify(value)).toBe(before);
 }
 expect(editor.snapshot.canUndo).toBe(false);
});
test("parent binding rejects writes atomically and distinguishes missing, invalid and readonly",()=>{
 const parent=createSheetEditor(createSheetDocument({rows:2,columns:2}));let candidate:unknown=parent.snapshot.value,readonly=false;
 const write=vi.fn(()=>({ok:false,code:"denied"}));
 const sheet=createProjectedSheetEditor({source:parent,read:()=>candidate,write,readOnly:()=>readonly});
 const selection=sheet.snapshot.selection;
 expect(sheet.dispatch({type:"cell.commit",rowId:"row-1",columnId:"column-1",value:"x"})).toEqual({ok:false,code:"denied"});
 expect(sheet.snapshot.selection).toEqual(selection);expect(sheet.snapshot.value).toEqual(candidate);
 sheet.dispatch({type:"selection.set",rowId:"row-2",columnId:"column-2"});expect(write).toHaveBeenCalledTimes(1);
 readonly=true;expect(sheet.availability).toBe("readonly");expect(sheet.dispatch({type:"row.insert",index:0}).ok).toBe(false);expect(write).toHaveBeenCalledTimes(1);
 candidate={bad:true};parent.dispatch({type:"sheet.rename",name:"changed"});expect(sheet.availability).toBe("invalid");
 candidate=null;parent.dispatch({type:"sheet.rename",name:"changed again"});expect(sheet.availability).toBe("missing");
});
test("parent projection validates the same schema before saving structural edits",()=>{
 const doc=createJSONDocument(createSheetDocument()),parent=createSheetEditor(doc),write=vi.fn(()=>({ok:true}));
 const sheet=createProjectedSheetEditor({source:parent,read:()=>doc.value,write});
 expect(sheet.dispatch({type:"row.insert",index:0,row:{id:"new",cells:{}}}).ok).toBe(false);expect(write).not.toHaveBeenCalled();
});

test("unchanged cell commits and selection changes do not write the parent",()=>{
 const parent=createSheetEditor(createSheetDocument()),write=vi.fn(()=>({ok:true}));
 const sheet=createProjectedSheetEditor({source:parent,read:()=>parent.snapshot.value,write});
 expect(sheet.dispatch({type:"cell.commit",rowId:"row-1",columnId:"column-1",value:""}).ok).toBe(true);
 expect(write).not.toHaveBeenCalled();
});
