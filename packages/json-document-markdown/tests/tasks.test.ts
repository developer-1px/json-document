import {expect, test} from "vitest";
import {setMarkdownTaskChecked} from "../src/index.js";

test("task edits preserve source, offsets and unrelated syntax", () => {
  const source = "- [ ] first\r\n  - [X] 한글  \r\n";
  expect(setMarkdownTaskChecked(source, 2, true)).toBe(source.replace("[ ]", "[x]"));
  expect(setMarkdownTaskChecked(source, source.indexOf("[X]"), true)).toBe(source);
  expect(setMarkdownTaskChecked(source, source.indexOf("[X]"), false)).toBe(source.replace("[X]", "[ ]"));
  expect(setMarkdownTaskChecked(source, 0, true)).toBe(source);
  const code = "```\n- [ ] text\n```";
  expect(setMarkdownTaskChecked(code, code.indexOf("[ ]"), true)).toBe(code);
});
