import {expect,test,vi} from "vitest";
import {createJSONDocument} from "@interactive-os/json-document";
import {createSheetEditor,createMarkdownTableEditor,createTextEditor,createCanvasSheet,createObjectEditor,createObjectSheetEditor,type SheetDocument} from "../src/index.js";

const initial:SheetDocument={columns:[{id:"a",label:"A"},{id:"b",label:"B"},{id:"c",label:"C"}],rows:[{id:"r1",cells:{a:"1a",b:"1b",c:"1c"}},{id:"r2",cells:{a:"2a",b:"2b",c:"2c"}},{id:"r3",cells:{a:"3a",b:"3b",c:"3c"}}]};
const reversed={rowOrder:["r3","r2","r1"],columnOrder:["c","b","a"]};

test("Views share synchronous data and history but retain independent selection",()=>{
 const document=createJSONDocument(initial),owner=createSheetEditor(document),left=owner.createView(),right=owner.createView(reversed);
 const changes=vi.fn();document.subscribe(changes);const seen=vi.fn();const unsubscribe=left.subscribe(seen);
 left.dispatch({type:"selection.set",rowId:"r2",columnId:"b"});right.dispatch({type:"selection.set",rowId:"r3",columnId:"c"});
 const selected=left.snapshot.selection;expect(changes).not.toHaveBeenCalled();
 expect(right.dispatch({type:"cell.commit",rowId:"r3",columnId:"c",value:"changed"}).ok).toBe(true);
 expect(left.snapshot.value).toBe(owner.snapshot.value);expect((left.snapshot.value as SheetDocument).rows[2]!.cells.c).toBe("changed");
 expect(left.snapshot.selection).toEqual(selected);expect(changes).toHaveBeenCalledTimes(1);expect(seen).toHaveBeenCalled();
 expect(left.undo().ok).toBe(true);expect(right.snapshot.value).toEqual(initial);expect(left.snapshot.selection).toEqual(selected);
 expect(right.redo().ok).toBe(true);expect((left.snapshot.value as SheetDocument).rows[2]!.cells.c).toBe("changed");unsubscribe();
});

test("reordered Grid navigation, copy, paste and fill address stable IDs",()=>{
 const owner=createSheetEditor(initial),view=owner.createView(reversed);
 expect(view.grid.rowIds).toEqual(reversed.rowOrder);expect(view.snapshot.selection.focus).toEqual({rowId:"r3",columnId:"c"});
 view.dispatch({type:"selection.navigate",direction:"next"});expect(view.snapshot.selection.focus).toEqual({rowId:"r3",columnId:"b"});
 view.dispatch({type:"selection.range",range:{anchor:{rowId:"r3",columnId:"c"},focus:{rowId:"r2",columnId:"b"}}});
 expect(view.copy()?.text).toBe("3c\t3b\n2c\t2b");expect(view.selectedCells.map(cell=>cell.value)).toEqual(["3c","3b","2c","2b"]);
 view.dispatch({type:"selection.set",rowId:"r3",columnId:"c"});
 expect(view.dispatch({type:"clipboard.paste",clipboard:{type:"application/vnd.interactive-os.sheet+json",cells:[["x","y"],["z","w"]],text:"x\ty\nz\tw"}}).ok).toBe(true);
 const value=owner.snapshot.value as SheetDocument;expect(value.rows[2]!.cells).toEqual({a:"3a",b:"y",c:"x"});expect(value.rows[1]!.cells).toEqual({a:"2a",b:"w",c:"z"});
 expect(view.dispatch({type:"range.fill",source:{anchor:{rowId:"r3",columnId:"c"},focus:{rowId:"r3",columnId:"c"}},target:{anchor:{rowId:"r3",columnId:"c"},focus:{rowId:"r1",columnId:"c"}}}).ok).toBe(true);
 expect((owner.snapshot.value as SheetDocument).rows.map(row=>row.cells.c)).toEqual(["x","x","x"]);
 view.dispatch({type:"selection.row",rowId:"r2"});expect(view.copy()?.cells).toEqual([["x","w","2a"]]);
});

test("structure and Undo reconcile View order and remove stale selected IDs",()=>{
 const owner=createSheetEditor(initial),view=owner.createView(reversed),other=owner.createView();
 view.dispatch({type:"selection.set",rowId:"r3",columnId:"c"});
 other.dispatch({type:"row.delete",rowId:"r3"});expect(view.grid.rowIds).toEqual(["r2","r1"]);expect(view.snapshot.selection.focus).toBeNull();
 other.undo();expect(view.grid.rowIds).toEqual(reversed.rowOrder);
 other.dispatch({type:"row.insert",index:0});expect(view.grid.rowIds).toEqual(["r3","r2","r1","row-1"]);
 other.dispatch({type:"column.insert",index:0});expect(view.grid.columnIds).toEqual(["c","b","a","column-1"]);
 expect(view.grid.rows.at(-1)!.cells).toHaveProperty("column-1");
});

test("readonly Views cannot mutate shared history or bypass restrictions through nested Views",()=>{
 const owner=createSheetEditor(initial);owner.dispatch({type:"cell.commit",rowId:"r1",columnId:"a",value:"changed"});
 const view=owner.createView({readOnly:()=>true}),nested=view.createView({readOnly:()=>false}),before=owner.snapshot.value;
 for(const editor of [view,nested]){
  expect(editor.availability).toBe("readonly");expect(editor.undo().ok).toBe(false);expect(editor.redo().ok).toBe(false);
  expect(editor.dispatch({type:"selection.fill",value:"blocked"}).ok).toBe(false);
  expect(editor.dispatch({type:"row.insert",index:0}).ok).toBe(false);
  expect(editor.cut()?.result.ok).toBe(false);expect(editor.copy()).not.toBeNull();
 }
 expect(owner.snapshot.value).toBe(before);expect(owner.undo().ok).toBe(true);
});

test("Markdown and Canvas table sources expose the same View API and parent Undo",()=>{
 const text=createTextEditor(createJSONDocument("| A | B |\n| --- | --- |\n| x | y |")),table=createMarkdownTableEditor(text,()=>0),view=table.createView();
 expect(view.dispatch({type:"cell.commit",rowId:"r1",columnId:"c0",value:"shared"}).ok).toBe(true);expect(text.text).toContain("shared");table.undo();expect(text.text).toContain("| x | y |");
 const parent=createObjectEditor({objects:[{...createCanvasSheet({x:0,y:0,width:400,height:200}),id:"t"}]}),canvas=createObjectSheetEditor(parent,"t"),embedded=canvas.createView();
 expect(embedded.dispatch({type:"cell.commit",rowId:"row-1",columnId:"column-1",value:"shared"}).ok).toBe(true);
 expect((canvas.snapshot.value as SheetDocument).rows[0]!.cells["column-1"]).toBe("shared");embedded.undo();expect((canvas.snapshot.value as SheetDocument).rows[0]!.cells["column-1"]).toBe("");
});

test("edits to the same cell from different Views remain separate Undo steps",()=>{
 const source=createSheetEditor(initial),left=source.createView(),right=source.createView();
 left.dispatch({type:"cell.commit",rowId:"r1",columnId:"a",value:"left"});
 right.dispatch({type:"cell.commit",rowId:"r1",columnId:"a",value:"right"});
 left.undo();expect((source.snapshot.value as SheetDocument).rows[0]!.cells.a).toBe("left");
 right.undo();expect(source.snapshot.value).toEqual(initial);
});
