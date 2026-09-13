import {expect, test} from "vitest";
import {createSheetEditor, type SheetDocument} from "../src/index.js";

test("row and column transactions preserve metadata and restore focus with undo", () => {
 const initial = {title: "Sheet", columns:[{id:"a/b",label:"A"},{id:"b",label:"B"}],rows:[{id:"one",cells:{"a/b":"a",b:"b"}},{id:"two",cells:{"a/b":"c",b:"d"}}]};
 const editor=createSheetEditor(initial);
 editor.dispatch({type:"selection.set",rowId:"two",columnId:"b"});
 expect(editor.dispatch({type:"row.delete",rowId:"two"}).ok).toBe(true);
 expect(editor.snapshot.selection.focus).toEqual({rowId:"one",columnId:"b"});
 editor.undo(); expect(editor.snapshot.value).toEqual(initial); expect(editor.snapshot.selection.focus?.rowId).toBe("two");
 editor.dispatch({type:"column.delete",columnId:"a/b"});
 expect((editor.snapshot.value as SheetDocument).rows[0]!.cells).toEqual({b:"b"});
 editor.undo(); expect(editor.snapshot.value).toEqual(initial);
 editor.dispatch({type:"column.insert",index:1,column:{id:"c",label:"C"}});
 expect((editor.snapshot.value as SheetDocument).rows[1]!.cells.c).toBe("");
 editor.undo(); expect(editor.snapshot.value).toEqual(initial);
 expect(editor.dispatch({type:"column.insert",index:10,column:{id:"c",label:"C"}}).ok).toBe(false);
 expect(editor.dispatch({type:"row.insert",index:0,row:{id:"bad",cells:{}}}).ok).toBe(false);
});
