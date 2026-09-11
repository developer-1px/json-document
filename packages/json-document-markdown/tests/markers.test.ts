import {expect, test} from "vitest";
import {createMarkdownParser, projectMarkdown} from "../src/index.js";

test("concrete markers come from recognized syntax, including nested continuation lines", () => {
  const source = "> one\n> - [x] **two**\n\n12) item\n\n~~~js\n> - [x] **literal**\n~~~\n\n\\*literal*\n\n| a |\n| :- |\n| b |";
  const markers = projectMarkdown(source).markers;
  expect(markers.map(marker => [marker.kind, source.slice(marker.from, marker.to)])).toEqual([
    ["blockquote", ">"], ["blockquote", ">"], ["list", "-"], ["task", "[x]"],
    ["strong", "**"], ["strong", "**"], ["list", "12)"], ["fence", "~~~"], ["fence", "~~~"],
    ["escape", "\\"], ["table", "|"], ["table", "|"], ["table", "|"], ["table", ":"],
    ["table", "-"], ["table", "|"], ["table", "|"], ["table", "|"],
  ]);
  for (let i=1; i<markers.length; i++) expect(markers[i]!.from).toBeGreaterThanOrEqual(markers[i-1]!.to);
  expect(Object.isFrozen(markers)).toBe(true);
});

test("marker ranges survive incremental text edits and grammar changes", () => {
  let source = "Before **한글** after\n\n> quote\n\n- [ ] task";
  const parser = createMarkdownParser(source);
  for (const [needle, value] of [["한", "추가한"], ["**", "*"], ["[ ]", "[x]"], [">", ""], ["task", "`task`"]]) {
    const from = source.indexOf(needle!);
    const result = parser.update(from, from + needle!.length, value!);
    source = source.slice(0, from) + value + source.slice(from + needle!.length);
    expect(result.projection).toEqual(projectMarkdown(source));
  }
});

test("unmatched punctuation and HTML contents are not syntax projections", () => {
  expect(projectMarkdown("**unfinished [link\n\n<div>**literal** - [x]</div>").markers).toEqual([]);
});

test("character references preserve source ranges and decoded values beside escapes", () => {
  const source = "one \\* &amp; &#x1f600; end";
  expect(projectMarkdown(source).markers.map(m=>[m.kind, source.slice(m.from,m.to),m.value])).toEqual([
    ["escape","\\",undefined], ["entity","&amp;","&"], ["entity","&#x1f600;","😀"],
  ]);
});
