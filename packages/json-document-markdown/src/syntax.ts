import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { markdownNode, offsetNode, editNode, type MarkdownNode } from "./nodes.js";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { MarkdownProjection, MarkdownStrongSpan } from "./projection.js";

interface TextRange { readonly from: number; readonly to: number }
export interface MarkdownBlock {
  readonly from: number;
  readonly to: number;
  readonly syntax: {
    readonly node: MarkdownNode;
    readonly paragraph: boolean;
    readonly literal: boolean;
    readonly strong: ReadonlyArray<MarkdownStrongSpan>;
    readonly text: ReadonlyArray<TextRange>;
  };
}
export interface MarkdownSyntax {
  readonly blocks: ReadonlyArray<MarkdownBlock>;
  readonly definitions: boolean;
}

/** Retain block-relative syntax fragments so moving a block does not rewrite its descendants. */
export function parseMarkdownSyntax(source: string): MarkdownSyntax {
  const tree = fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  let definitions = false;
  const blocks = tree.children.map(node => {
    const from = node.position!.start.offset!, to = node.position!.end.offset!;
    const raw = source.slice(from, to);
    const strong: MarkdownStrongSpan[] = [], text: TextRange[] = [];
    const visit = (node: (typeof tree.children)[number], textContext: boolean): void => {
      // GFM pads short table rows with empty cells that have no source position.
      if (!node.position) return;
      const start = node.position!.start.offset! - from, end = node.position!.end.offset! - from;
      if ((node.type === "definition" || node.type === "footnoteDefinition")) definitions = true;
      if (node.type === "strong") strong.push(Object.freeze({ from: start, to: end, contentFrom: start + 2, contentTo: end - 2 }));
      if (node.type === "text" && textContext) text.push({ from: start, to: end });
      if ("children" in node) for (const child of node.children) visit(child, textContext && (node.type === "paragraph" || node.type === "strong" || node.type === "emphasis"));
    };
    visit(node, node.type === "paragraph");
    return {
      from, to,
      syntax: {
        node: markdownNode(node, from),
        paragraph: node.type === "paragraph",
        // These constructs can make letter edits alter distant inline recognition or reference labels.
        literal: !["\\", "[", "]", "<", ">", "&", "~", ".", ":", "@", String.fromCharCode(96)].some(marker => raw.includes(marker)),
        strong, text,
      },
    };
  });
  return { blocks, definitions };
}

export function syntaxProjection(source: string, syntax: MarkdownSyntax): MarkdownProjection {
  let nodes: ReadonlyArray<MarkdownNode> | undefined;
  let strong: ReadonlyArray<MarkdownStrongSpan> | undefined;
  return Object.freeze({
    source,
    get nodes() { return nodes ??= Object.freeze(syntax.blocks.map(block => offsetNode(block.syntax.node, block.from))); },
    get strong() {
      return strong ??= Object.freeze(syntax.blocks.flatMap(block => block.syntax.strong.map(span => offsetStrong(span, block.from))));
    },
  });
}

export function offsetStrong(span: MarkdownStrongSpan, offset: number): MarkdownStrongSpan {
  return offset === 0 ? span : Object.freeze({ from: span.from + offset, to: span.to + offset, contentFrom: span.contentFrom + offset, contentTo: span.contentTo + offset });
}

/** Editing letters after an existing letter preserves block markers and delimiter flanking. */
export function replaceLiteralText(block: MarkdownBlock, source: string, from: number, to: number, insert: string): MarkdownBlock | null {
  if (!block.syntax.paragraph || !block.syntax.literal || !/^\p{L}*$/u.test(insert) || !/^\p{L}*$/u.test(source.slice(from, to))
    || !/\p{L}$/u.test(source.slice(Math.max(0, from - 2), from))) return null;
  const start = from - block.from, end = to - block.from;
  if (!block.syntax.text.some(range => start > range.from && end <= range.to)) return null;
  const delta = insert.length - (to - from);
  const move = (offset: number) => offset >= end ? offset + delta : offset;
  return {
    ...block, to: block.to + delta,
    syntax: {
      ...block.syntax,
      node: editNode(block.syntax.node, start, end, insert),
      text: block.syntax.text.map(range => ({ from: range.from >= end ? range.from + delta : range.from, to: move(range.to) })),
      strong: block.syntax.strong.map(span => Object.freeze({ from: move(span.from), to: move(span.to), contentFrom: move(span.contentFrom), contentTo: move(span.contentTo) })),
    },
  };
}

/** Plain letters after at most one line ending continue the final paragraph without new syntax. */
export function appendParagraphText(block: MarkdownBlock, source: string, from: number, to: number, insert: string): MarkdownBlock | null {
  if (from !== source.length || to !== from || !block.syntax.paragraph || !block.syntax.literal
    || !/^(?:\p{L}+\n?|\n)$/u.test(insert) || !/^(?:\r?\n)?$/.test(source.slice(block.to))
    || !/\p{L}$/u.test(source.slice(Math.max(block.from, block.to - 2), block.to))) return null;
  const text = block.syntax.text[block.syntax.text.length - 1];
  if (!text || text.to !== block.to - block.from || (source.length > block.to && insert === "\n")) return null;
  const nextTo = from + insert.length - (insert.endsWith("\n") ? 1 : 0);
  return {
    ...block, to: nextTo,
    syntax: { ...block.syntax, node: editNode(block.syntax.node, block.to - block.from, block.to - block.from, source.slice(block.to, from) + insert.slice(0, insert.length - (insert.endsWith("\n") ? 1 : 0))), text: [...block.syntax.text.slice(0, -1), { ...text, to: nextTo - block.from }] },
  };
}
