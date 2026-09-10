import { beforeEach, describe, expect, test, vi } from "vitest";
import { fromMarkdown } from "mdast-util-from-markdown";
import { createMarkdownParser, projectMarkdown } from "../src/index.js";

vi.mock("mdast-util-from-markdown", async importOriginal => {
  const actual = await importOriginal<typeof import("mdast-util-from-markdown")>();
  return { ...actual, fromMarkdown: vi.fn(actual.fromMarkdown) };
});
beforeEach(() => vi.mocked(fromMarkdown).mockClear());

describe("persistent Markdown parsing", () => {
  test("reuses a long paragraph across repeated Korean composition and Enter appends", () => {
    let source = "Start **강조** " + "일반문장 ".repeat(10_000) + "tail";
    const parser = createMarkdownParser(source);
    for (const insert of ["한글\n", "다음\n", "third", "\n"]) {
      const calls = vi.mocked(fromMarkdown).mock.calls.length;
      const result = parser.update(source.length, source.length, insert);
      expect(fromMarkdown).toHaveBeenCalledTimes(calls);
      source += insert;
      expect(result.projection).toEqual(projectMarkdown(source));
    }
    // A second line ending creates a real block boundary.
    expect(parser.update(source.length, source.length, "\n").projection).toEqual(projectMarkdown(source + "\n"));
  });

  test("letter edits in a long paragraph reuse syntax without calling the parser", () => {
    const source = "Start **강조문장** " + "일반문장 ".repeat(20_000) + "tail";
    const parser = createMarkdownParser(source);
    const previous = parser.projection;
    const from = source.indexOf("강조") + 1;
    const result = parser.update(from, from, "추가");
    expect(fromMarkdown).toHaveBeenCalledTimes(1);
    expect(result.projection).toEqual(projectMarkdown(source.slice(0, from) + "추가" + source.slice(from)));
    expect(previous.source).toBe(source);
    expect(previous.strong[0]?.to).toBe(source.indexOf("**", 8) + 2);
  });

  test("inline syntax edits reparse the containing paragraph and move later fragments", () => {
    const source = "Before **first**\n\nMiddle **second** text\n\nAfter __third__";
    const parser = createMarkdownParser(source);
    const from = source.indexOf("second");
    const result = parser.update(from, from + 6, "*changed*");
    expect(vi.mocked(fromMarkdown).mock.calls.map(call => call[0])).toEqual([source, "Middle ***changed*** text"]);
    expect(result.changed).toEqual({ from: source.indexOf("Middle"), to: source.indexOf("\n\nAfter"), newTo: source.indexOf("\n\nAfter") + 3 });
    expect(result.projection).toEqual(projectMarkdown(source.replace("second", "*changed*")));
  });

  test("reference definitions invalidate unchanged earlier strong syntax", () => {
    const source = "[a][**b**]\n\nUnchanged **tail**";
    const parser = createMarkdownParser(source);
    expect(parser.projection.strong).toHaveLength(2);
    const insert = "\n\n[**b**]: /target";
    const result = parser.update(source.length, source.length, insert);
    expect(result.changed).toEqual({ from: 0, to: source.length, newTo: source.length + insert.length });
    expect(result.projection).toEqual(projectMarkdown(source + insert));
    expect(result.projection.strong).toHaveLength(1);
    expect(parser.update(source.length, source.length + insert.length, "").projection).toEqual(projectMarkdown(source));
  });

  test.each([
    ["A **text**\n\nB __tail__", 0, 0, "```\n"],
    ["A **text**\n\nB __tail__", 0, 0, "- "],
    ["A **text**\n\nB __tail__", 3, 3, "\n\n"],
    ["Before\n\nA **text**\n\nAfter", 8, 8, "> "],
    ["[name]: /target\n\nA [**name**] text", 23, 23, "x"],
    ["😀 **한글**\r\nsecond", 5, 5, "한"],
    ["A **한글**\r\nsecond", 8, 10, "\n"],
  ] as const)("matches full parsing after structural or UTF-16 edits: %s", (source, from, to, insert) => {
    const parser = createMarkdownParser(source);
    const expected = source.slice(0, from) + insert + source.slice(to);
    expect(parser.update(from, to, insert).projection).toEqual(projectMarkdown(expected));
    expect(parser.update(from, from + insert.length, source.slice(from, to)).projection).toEqual(projectMarkdown(source));
  });

  test("preserves no-op identity and rejects invalid ranges without changing state", () => {
    const parser = createMarkdownParser("A **text**");
    const previous = parser.projection;
    expect(parser.update(0, 1, "A")).toEqual({ projection: previous, changed: null });
    expect(() => parser.update(-1, 0, "x")).toThrow(RangeError);
    expect(() => parser.update(0, 100, "x")).toThrow(RangeError);
    expect(parser.projection).toBe(previous);
  });

  test("mixed edit sequences match full parsing at every step", () => {
    let random = 763;
    const next = (max: number) => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random % max; };
    const inserts = ["x", "한글", " ", "\n", "\r\n", "**", "__", "`", "[a]", "\n[a]: /url", "<script>", "- ", "", "😀"];
    for (const initial of ["Start **one** and __two__\n\nLast paragraph", "[a][**b**]\n\n[**b**]: /url", "- **one**\n  continued\n\nAfter", "**outer __inner__ tail**"]) {
      const parser = createMarkdownParser(initial);
      let source = initial;
      for (let index = 0; index < 150; index++) {
        const from = next(source.length + 1), to = Math.min(source.length, from + next(5));
        const insert = inserts[next(inserts.length)]!;
        source = source.slice(0, from) + insert + source.slice(to);
        expect(parser.update(from, to, insert).projection, JSON.stringify({ source, from, to, insert })).toEqual(projectMarkdown(source));
      }
    }
  });
});
