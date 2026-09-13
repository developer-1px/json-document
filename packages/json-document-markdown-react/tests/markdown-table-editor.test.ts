import {expect, test} from "vitest";
import {createJSONDocument} from "@interactive-os/json-document";
import {createTextEditor, type SheetDocument} from "@interactive-os/json-document-editing";
import {createMarkdownTableEditor} from "../src/markdown-table-editor.js";
test("cell and structure edits use whole-document history and never store UI labels", () => {
 const original = "| A | B |\n| --- | --- |\n| x | y |\n\nend";
 const text = createTextEditor(createJSONDocument(original));
 const sheet = createMarkdownTableEditor(text, () => 0);
 const unsubscribe = sheet.subscribe(() => {});
 expect(sheet.dispatch({type:"cell.commit",rowId:"r1",columnId:"c0",value:"updated"}).ok).toBe(true);
 expect(text.text).toContain("| updated | y |");
 sheet.undo(); expect(text.text).toBe(original);
 sheet.redo(); expect(text.text).toContain("updated");
 sheet.dispatch({type:"column.insert",index:1,column:{id:"new",label:"C"}});
 expect((sheet.snapshot.value as SheetDocument).columns).toHaveLength(3);
 sheet.undo(); expect((sheet.snapshot.value as SheetDocument).columns).toHaveLength(2);
 expect(sheet.dispatch({type:"row.delete",rowId:"r0"}).ok).toBe(false);
 text.replace(text.text+"!",{anchor:0,focus:0});
 sheet.undo(); expect(text.text.endsWith("end")).toBe(true);
 unsubscribe();
});

test("cut clears only the primary range and paste retains its rectangle", () => {
 const text=createTextEditor(createJSONDocument("| A | B |\n| --- | --- |\n| x | y |\n| z | w |"));
 const sheet=createMarkdownTableEditor(text,()=>0);
 sheet.dispatch({type:"selection.set",rowId:"r1",columnId:"c0"});
 sheet.dispatch({type:"selection.set",rowId:"r2",columnId:"c1",mode:"toggle"});
 const cut=sheet.cut()!;
 expect(cut.clipboard.text).toBe("w");
 expect((sheet.snapshot.value as SheetDocument).rows[1]!.cells.c0).toBe("x");
 expect((sheet.snapshot.value as SheetDocument).rows[2]!.cells.c1).toBe("");
 sheet.dispatch({type:"selection.set",rowId:"r1",columnId:"c0"});
 sheet.dispatch({type:"clipboard.paste",clipboard:{type:"application/vnd.interactive-os.sheet+json",cells:[["1","2"]],text:"1\t2"}});
 expect(sheet.selectedCells).toHaveLength(2);
 sheet.dispatch({type:"column.delete",columnId:"c0"});
 expect(sheet.snapshot.selection.focus?.columnId).toBe("c0");
});
