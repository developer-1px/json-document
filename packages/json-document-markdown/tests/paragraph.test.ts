import { expect, test } from "vitest";
import { insertMarkdownParagraph } from "../src/index.js";

const enter = (source: string, anchor = source.length, focus = anchor) => insertMarkdownParagraph(source, {anchor, focus});

test("Enter continues quotes, nested quotes and source line endings", () => {
  expect(enter("> text").value).toBe("> text\n> ");
  expect(enter("> > text").value).toBe("> > text\n> > ");
  expect(enter("> first\r\n> next").value).toBe("> first\r\n> next\r\n> ");
  expect(enter("> abcd", 4).value).toBe("> ab\n> cd");
  expect(enter("> abcd", 3, 5).value).toBe("> a\n> d");
});

test("empty quote exits with a blank boundary so subsequent text is not a lazy quote continuation", () => {
  const next = enter("> text\n> ");
  expect(next).toEqual({value:"> text\n\n", selection:{anchor:8, focus:8}});
  expect(enter("> text\n>   ").value).toBe("> text\n\n");
  expect(enter("> ").value).toBe("");
  expect(enter("> > ").value).toBe("");
});

test("ordinary paragraphs, code and pasted source have no synthetic quote prefix", () => {
  expect(enter("text").value).toBe("text\n");
  expect(enter("```\n> text\n```", 10).value).toBe("```\n> text\n\n```");
  expect(() => enter("x", -1)).toThrow(RangeError);
});
