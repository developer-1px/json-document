import {createJSONDocument} from "@interactive-os/json-document";
import {expect, test} from "vitest";
import {createSheetEditor, createMarkdownTableEditor, createTextEditor, type SheetDocument} from "../src/index.js";

test("range entry retains range, moves active cell independently and restores it through undo", () => {
  const editor = createSheetEditor({columns: [{id:"a",label:"A"},{id:"b",label:"B"}],rows:[{id:"1",cells:{a:"one",b:"two"}},{id:"2",cells:{a:"three",b:"four"}}]});
  editor.dispatch({type:"selection.set",rowId:"2",columnId:"b",mode:"extend"});
  const ranges = editor.snapshot.selection.ranges;
  editor.dispatch({type:"selection.navigate",direction:"next"});
  expect(editor.snapshot.selection.focus).toEqual({rowId:"1",columnId:"a"});
  expect(editor.snapshot.selection.ranges).toEqual(ranges);
  editor.dispatch({type:"cell.commit",rowId:"1",columnId:"a",value:"changed",preserveSelection:true});
  editor.dispatch({type:"selection.navigate",direction:"down"});
  expect(editor.snapshot.selection.focus).toEqual({rowId:"2",columnId:"a"});
  expect(editor.selectedCells).toHaveLength(4);
  editor.undo();
  expect((editor.snapshot.value as SheetDocument).rows[0]!.cells.a).toBe("one");
  expect(editor.snapshot.selection.ranges).toEqual(ranges);
});

test("Markdown traversal is selection-only; a commit retains its range and source history", () => {
  const text = createTextEditor(createJSONDocument("before\n\n| A | B |\n| --- | --- |\n| one | two |\n\nafter"));
  const editor = createMarkdownTableEditor(text, () => 8);
  editor.dispatch({type:"selection.set",rowId:"r1",columnId:"c1",mode:"extend"});
  const original = text.text;
  editor.dispatch({type:"selection.navigate",direction:"next"});
  expect(text.text).toBe(original);
  expect(text.snapshot.canUndo).toBe(false);
  editor.dispatch({type:"cell.commit",rowId:"r0",columnId:"c0",value:"changed",preserveSelection:true});
  expect(editor.selectedCells).toHaveLength(4);
  expect(editor.snapshot.selection.focus).toEqual({rowId:"r0",columnId:"c0"});
  editor.undo(); expect(text.text).toBe(original);
});

test('fill and size changes are atomic and format capabilities also reject direct intents',()=>{
 const editor=createSheetEditor({columns:[{id:'a',label:'A'},{id:'b',label:'B'}],rows:[{id:'1',cells:{a:'one',b:'two'}},{id:'2',cells:{a:'old',b:'old'}}]});
 const before=editor.snapshot.value;
 expect(editor.dispatch({type:'range.fill',source:{anchor:{rowId:'1',columnId:'a'},focus:{rowId:'1',columnId:'b'}},target:{anchor:{rowId:'1',columnId:'a'},focus:{rowId:'2',columnId:'b'}}}).ok).toBe(true);
 expect((editor.snapshot.value as SheetDocument).rows[1]!.cells).toEqual({a:'one',b:'two'});
 editor.undo();expect(editor.snapshot.value).toEqual(before);
 editor.dispatch({type:'column.resize',columnId:'a',width:143});expect((editor.snapshot.value as SheetDocument).columns[0]!.width).toBe(143);
 editor.undo();expect(editor.snapshot.value).toEqual(before);
 const text=createTextEditor(createJSONDocument('| A |\n| --- |\n| text |'));
 const markdown=createMarkdownTableEditor(text,()=>0);
 expect(markdown.capabilities.resize).toBe(false);
 expect(markdown.dispatch({type:'column.resize',columnId:'c0',width:143})).toEqual({ok:false,code:'sheet.resize-unavailable'});
 expect(text.snapshot.canUndo).toBe(false);
});
