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

test("default creation allocates collision-free ids and alphabetic column coordinates", async () => {
 const {sheetColumnLabel}=await import("../src/index.js");
 expect([0,25,26,51,52,701,702].map(sheetColumnLabel)).toEqual(["A","Z","AA","AZ","BA","ZZ","AAA"]);
 expect(() => sheetColumnLabel(-1)).toThrow();
 const columns=Array.from({length:26},(_,i)=>({id:`column-${i+1}`,label:sheetColumnLabel(i)}));
 const editor=createSheetEditor({columns,rows:[{id:"row-1",cells:Object.fromEntries(columns.map(c=>[c.id,""]))}]});
 expect(editor.dispatch(editor.structure.insertRow).ok).toBe(true);
 expect((editor.snapshot.value as SheetDocument).rows[1]!.id).toBe("row-2");
 expect(editor.dispatch(editor.structure.insertColumn).ok).toBe(true);
 expect((editor.snapshot.value as SheetDocument).columns[1]).toEqual({id:"column-27",label:"AA"});
 editor.undo(); expect((editor.snapshot.value as SheetDocument).columns).toHaveLength(26);
});

test("capabilities and direct intents enforce the same structure policy", () => {
 const editor=createSheetEditor({columns:[{id:"a",label:"A"}],rows:[{id:"header",cells:{a:"A"}},{id:"body",cells:{a:"value"}}]}, {structure:{headerRows:1,minimumColumns:1}});
 expect(editor.structure.deleteRow).toBeNull(); expect(editor.structure.deleteColumn).toBeNull();
 expect(editor.dispatch({type:"row.insert",index:0}).ok).toBe(false);
 editor.dispatch({type:"selection.set",rowId:"body",columnId:"a"});
 expect(editor.structure.deleteRow).toEqual({type:"row.delete",rowId:"body"});
 expect(editor.dispatch({type:"row.delete",rowId:"header"}).ok).toBe(false);
 expect(editor.dispatch({type:"column.delete",columnId:"a"}).ok).toBe(false);
});
