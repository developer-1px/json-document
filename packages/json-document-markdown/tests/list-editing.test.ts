import { expect, test } from "vitest";
import { indentMarkdownList, insertMarkdownParagraph } from "../src/index.js";
const enter=(source:string, focus=source.length) => insertMarkdownParagraph(source,{anchor:focus,focus});
const indent=(source:string, direction:"indent"|"outdent"="indent", anchor=source.length, focus=anchor) => indentMarkdownList(source,{anchor,focus},direction);

test.each([
  ["- one", "- one\n- "], ["* one", "* one\n* "], ["+ one", "+ one\n+ "],
  ["9. one", "9. one\n10. "], ["2) one", "2) one\n3) "],
  ["- [x] done", "- [x] done\n- [ ] "], ["3. [X] done", "3. [X] done\n4. [ ] "],
  ["- parent\n  - child", "- parent\n  - child\n  - "],
  ["> - quote", "> - quote\n> - "], ["- one\r\n- two", "- one\r\n- two\r\n- "],
  ["- ", ""], ["- one\n- ", "- one\n\n"], ["> - one\n> - ", "> - one\n> "],
  ["- [ ] ", ""],
])("Enter applies parsed list semantics to %s", (source,expected) => expect(enter(source).value).toBe(expected));

test("Enter splits list content and ignores list-looking code", () => {
  expect(enter("- abcd",4).value).toBe("- ab\n- cd");
  expect(enter("```\n- one\n```",9).value).toBe("```\n- one\n\n```");
  expect(indent("```\n- one\n```","indent",9)).toBeNull();
});
test("Tab uses the previous sibling's content indentation and Shift Tab reverses it", () => {
  for (const source of ["- one\n- two", "10. one\n11. two", "- [x] one\n- [ ] two", "> - one\n> - two"]) {
    const result=indent(source)!;
    expect(result.value).not.toBe(source);
    const restored=indentMarkdownList(result.value,result.selection,"outdent")!;
    expect(restored).toEqual({value:source,selection:{anchor:source.length,focus:source.length}});
  }
  expect(indent("10. one\n11. two")?.value).toBe("10. one\n    1. two");
});
test("selected siblings move with descendants and preserve backward selection and CRLF", () => {
  const source="- one\r\n- two\r\n  - child\r\n- three";
  const start=source.indexOf("- two"), end=source.length;
  const result=indent(source,"indent",end,start)!;
  expect(result.value).toBe("- one\r\n  - two\r\n    - child\r\n  - three");
  expect(result.selection.anchor).toBeGreaterThan(result.selection.focus);
  expect(indentMarkdownList(result.value,result.selection,"outdent")?.value).toBe(source);
});
test("first items and root outdent are consumed without changing source; ordinary paragraphs return null", () => {
  expect(indent("- first")?.value).toBe("- first");
  expect(indent("- first","outdent")?.value).toBe("- first");
  expect(indent("plain")).toBeNull();
  expect(() => indent("- item","indent",-1)).toThrow(RangeError);
});


test("Tab accounts for tab-expanded list marker padding", () => {
  const result=indent("-\tone\n-\ttwo")!;
  expect(result.value).toBe("-\tone\n    -\ttwo");
  expect(indentMarkdownList(result.value,result.selection,"outdent")?.value).toBe("-\tone\n-\ttwo");
});

test("empty nested items leave one level at a time, preserving task and quote prefixes",()=>{
 for(const [source,expected] of [
  ["- parent\n  - ","- parent\n- "],
  ["- parent\n  -","- parent\n-"],
  ["- parent\n  - child\n    - ","- parent\n  - child\n  - "],
  ["> - parent\n>   - [ ] ","> - parent\n> - [ ] "],
  ["1. parent\n   1. ","1. parent\n2. "],
  ["- parent\r\n  - ","- parent\r\n- "],
 ]) {
  const result=enter(source!);expect(result.value).toBe(expected);
  expect(result.selection).toEqual({anchor:expected!.length,focus:expected!.length});
 }
});
test("outdent preserves the following siblings under the original parent",()=>{
 const source="- parent\n  - moving\n    - child\n  - staying\n- next";
 const at=source.indexOf("moving")+3;
 const result=indent(source,"outdent",at)!;
 expect(result.value).toBe("- parent\n  - staying\n- moving\n  - child\n- next");
 expect(result.selection.focus).toBe(result.value.indexOf("moving")+3);
});
test("outdent a backward sibling range preserves trailing parent content and CRLF",()=>{
 const source="- parent\r\n  - first\r\n  - second\r\n  - stays\r\n\r\n  paragraph\r\n- next";
 const result=indent(source,"outdent",source.indexOf("second")+6,source.indexOf("first"))!;
 expect(result.value).toBe("- parent\r\n  - stays\r\n\r\n  paragraph\r\n- first\r\n- second\r\n- next");
 expect(result.selection.anchor).toBe(result.value.indexOf("second")+6);
 expect(result.selection.focus).toBe(result.value.indexOf("first"));
});

test("empty middle item promotes past remaining siblings instead of adopting them",()=>{
 const source="> - parent\n>   - \n>   - stays";
 const result=enter(source,source.indexOf("\n>   - stays"));
 expect(result.value).toBe("> - parent\n>   - stays\n> - ");
 expect(result.selection.focus).toBe(result.value.length);
});
