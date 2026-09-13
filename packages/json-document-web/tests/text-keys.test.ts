import {expect, test} from "vitest";
import {isWebComposingKey, webKeyboardText, moveGridPoint} from "../src/index.js";
test("composition keys are native and only unmodified printable keys author text", () => {
 expect(isWebComposingKey({isComposing:true})).toBe(true);
 expect(isWebComposingKey({keyCode:229})).toBe(true);
 expect(isWebComposingKey({keyCode:13})).toBe(false);
 const stroke={key:"한",metaKey:false,ctrlKey:false,shiftKey:false};
 expect(webKeyboardText(stroke)).toBe("한"); expect(webKeyboardText({...stroke,key:"😀"})).toBe("😀");
 expect(webKeyboardText({...stroke,metaKey:true})).toBeNull(); expect(webKeyboardText({...stroke,key:"Enter"})).toBeNull();
});
test("sequential grid movement wraps rows and returns null at document edges", () => {
 const grid={rowIds:["1","2"],columnIds:["a","b"]};
 expect(moveGridPoint(grid,{rowId:"1",columnId:"b"},"next")).toEqual({rowId:"2",columnId:"a"});
 expect(moveGridPoint(grid,{rowId:"2",columnId:"a"},"previous")).toEqual({rowId:"1",columnId:"b"});
 expect(moveGridPoint(grid,{rowId:"1",columnId:"a"},"previous")).toBeNull();
});
