import {expect, test} from "vitest";
import {cellEditingAffordance} from "../src/index.js";
const stroke=(key: string, modifiers={})=>({key,shiftKey:false,metaKey:false,ctrlKey:false,...modifiers});
test("cell editing distinguishes native typing, activation, commit and grid focus", () => {
 const editing={editing:true,allSelected:false}, idle={...editing,editing:false};
 expect(cellEditingAffordance(stroke("Enter"),idle).hand).toMatchObject({type:"rename",action:"begin"});
 expect(cellEditingAffordance(stroke("Enter",{shiftKey:true}),editing).hand).toMatchObject({action:"commit",move:"up"});
 expect(cellEditingAffordance(stroke("한"),idle).hand).toMatchObject({action:"begin",initialText:"한"});
 expect(cellEditingAffordance(stroke("a"),editing).hand).toBeNull();
 expect(cellEditingAffordance(stroke("a",{ctrlKey:true}),editing).hand).toBeNull();
 expect(cellEditingAffordance(stroke("a",{metaKey:true}),{...idle,allSelected:true}).hand).toEqual({type:"select-all"});
 expect(cellEditingAffordance(stroke("Tab",{shiftKey:true}),editing).hand).toMatchObject({type:"tab",direction:"prev"});
 expect(cellEditingAffordance(stroke("Escape"),editing).hand).toMatchObject({action:"cancel"});
});
