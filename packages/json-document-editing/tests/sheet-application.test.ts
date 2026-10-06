import {expect,test} from "vitest";
import {createSheetEditor,sheetSelectionSummary} from "../src/index.js";
test("document name participates in history and minimum axes stay editable",()=>{
 const editor=createSheetEditor({name:"빈 시트",columns:[{id:"a",label:"A"}],rows:[{id:"r",cells:{a:""}}]},{structure:{minimumRows:1,minimumColumns:1}});
 expect(editor.structure.deleteRow).toBeNull();expect(editor.structure.deleteColumn).toBeNull();
 expect(editor.dispatch({type:"row.delete",rowId:"r"}).ok).toBe(false);
 editor.dispatch({type:"sheet.rename",name:"계획"});expect((editor.snapshot.value as {name:string}).name).toBe("계획");editor.undo();expect((editor.snapshot.value as {name:string}).name).toBe("빈 시트");
 editor.dispatch({type:"cell.commit",rowId:"r",columnId:"a",value:0});expect(sheetSelectionSummary(editor)).toEqual({address:"A1",selected:1,filled:1});
});

test("rejects malformed restored sheet columns before rendering",()=>{
 expect(()=>createSheetEditor({columns:[{id:"a",label:{bad:true}}],rows:[]} as never)).toThrow();
});
