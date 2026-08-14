import type { JSONValue } from "@interactive-os/json-document";
import {
  hasRichTextContent,
  isRichTextText,
  type RichTextDocument,
  type RichTextMark,
  type RichTextNode,
  type RichTextText,
} from "./model.js";

export interface RichTextRenderAdapter<Output> {
  document(document: RichTextDocument, children: readonly Output[]): Output;
  text(node: RichTextText): Output;
  node(node: Exclude<RichTextNode, RichTextText>, children: readonly Output[]): Output;
  mark(mark: RichTextMark, children: readonly Output[]): Output;
  unknown(value: JSONValue): Output;
}

export interface RichTextRenderResult<Output> {
  readonly output: Output;
  readonly diagnostics: ReadonlyArray<never>;
}

export function renderRichText<Output>(
  document: RichTextDocument,
  adapter: RichTextRenderAdapter<Output>,
): RichTextRenderResult<Output> {
  return {
    output: adapter.document(document, document.content.map(renderNode)),
    diagnostics: [],
  };

  function renderNode(node: RichTextNode): Output {
    if (isRichTextText(node)) {
      return node.marks.reduceRight<Output>(
        (children, mark) => adapter.mark(mark, [children]),
        adapter.text(node),
      );
    }
    const children = hasRichTextContent(node) ? node.content.map(renderNode) : [];
    return adapter.node(node, children);
  }
}
