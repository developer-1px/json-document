import { describe, expect, test } from "vitest";
import { projectMarkdown } from "../src/index.js";

describe("Markdown source projection", () => {
  test("keeps original UTF-16 positions, delimiters, whitespace and CRLF", () => {
    const source = "😀 **한글**  \r\n__raw__\r\n";
    const projection = projectMarkdown(source);
    expect(projection.source).toBe(source);
    expect(projection.strong).toEqual([
      { from: 3, to: 9, contentFrom: 5, contentTo: 7 },
      { from: 13, to: 20, contentFrom: 15, contentTo: 18 },
    ]);
    expect(projection.strong.map(span => source.slice(span.contentFrom, span.contentTo))).toEqual(["한글", "raw"]);
  });

  test("CommonMark recognition excludes code, escaped and unclosed delimiters", () => {
    for (const source of ["\`**code**\`", "\\**escaped**", "**unfinished", "snake__word__case"]) {
      expect(projectMarkdown(source).strong, source).toEqual([]);
    }
  });

  test("HTML stays source data and nested strong retains source ranges", () => {
    const source = "<img src=x onerror=alert(1)> **outer __inner__ tail**";
    const projection = projectMarkdown(source);
    expect(projection.source).toBe(source);
    expect(projection.strong.map(span => source.slice(span.from, span.to))).toEqual(["**outer __inner__ tail**", "__inner__"]);
  });
});
