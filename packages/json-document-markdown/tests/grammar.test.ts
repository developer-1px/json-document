import { describe, expect, test } from "vitest";
import type { RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { createMarkdownParser, projectMarkdown, type MarkdownNode } from "../src/index.js";

const examples = [
  ["# Heading\n\nTitle\n=====\n\nSubtitle\n---", ["heading", "text"]],
  ["> quote\n>\n> - nested\n>   1. ordered", ["blockquote", "list", "listItem", "paragraph", "text"]],
  ["    indented code\n\n~~~js\nconst x = 1;\n~~~", ["code"]],
  ["---\n\n***\n\n___", ["thematicBreak"]],
  ["**bold** *italic* ***both*** ~~gone~~ `**code**`", ["paragraph", "strong", "emphasis", "delete", "inlineCode", "text"]],
  ["[inline](https://example.com) ![alt](image.png) <https://example.com> https://example.com\n\n[ref][a] ![image][a]\n\n[a]: /path \"title\"", ["link", "image", "linkReference", "imageReference", "definition", "paragraph", "text"]],
  ["- [x] done\n- [ ] pending", ["list", "listItem", "paragraph", "text"]],
  ["| Left | Right |\n| :--- | ---: |\n| *one* | two |", ["table", "tableRow", "tableCell", "emphasis", "text"]],
  ["| a | b |\n| - | - |\n| c |", ["table", "tableRow", "tableCell", "text"]],
  ["Note[^a]\n\n[^a]: footnote", ["paragraph", "text", "footnoteReference", "footnoteDefinition"]],
  ["\\*escaped* &amp; &#x1f600;  \nnext\\\nline\nsoft", ["paragraph", "text", "break"]],
  ["<script>alert(1)</script>\n\ntext <b>inline HTML</b>", ["html", "paragraph", "text"]],
] as const;
function flatten(nodes: ReadonlyArray<MarkdownNode>): MarkdownNode[] { return nodes.flatMap(node => [node, ...flatten(node.children ?? [])]); }

describe("CommonMark and GFM grammar", () => {
  test.each(examples)("projects every recognized node with exact ranges: %s", (source, kinds) => {
    const projection = projectMarkdown(source);
    const nodes = flatten(projection.nodes);
    expect(new Set(nodes.map(node => node.kind))).toEqual(new Set(kinds));
    const ast = fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
    const expected: Array<{kind: string; from: number; to: number}> = [];
    const visit = (node: RootContent, fallback = 0) => { const from = node.position?.start.offset ?? fallback, to = node.position?.end.offset ?? fallback; expected.push({ kind: node.type, from, to }); if ("children" in node) node.children.forEach(child => visit(child, to)); };
    ast.children.forEach(node => visit(node));
    expect(nodes.map(({kind, from, to}) => ({kind, from, to}))).toEqual(expected);
    expect(projection.source).toBe(source);
  });

  test.each(examples)("incremental edits and undo agree with full parsing: %s", (initial) => {
    const parser = createMarkdownParser(initial);
    let source: string = initial;
    for (const insert of ["한글", "\n", "|", "]", "*", "😀", "> ", "- [ ] ", "\n---\n", "\\"]) {
      const from = Math.floor(source.length / 2);
      const to = Math.min(from + 2, source.length);
      const before = source;
      source = source.slice(0, from) + insert + source.slice(to);
      expect(parser.update(from, to, insert).projection).toEqual(projectMarkdown(source));
      expect(parser.update(from, from + insert.length, before.slice(from, to)).projection).toEqual(projectMarkdown(before));
      source = before;
    }
  });
});
