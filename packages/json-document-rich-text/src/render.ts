import type { JSONValue } from "@interactive-os/json-document";
import {
  hasRichTextContent,
  isRichTextText,
  type RichTextDocument,
  type RichTextMark,
  type RichTextNode,
  type RichTextText,
} from "./model.js";
import { richTextSchemaV1, type RichTextSchema } from "./schema.js";

export interface RichTextRenderAdapter<Output> {
  document(document: RichTextDocument, children: readonly Output[]): Output;
  text(node: RichTextText): Output;
  node(node: Exclude<RichTextNode, RichTextText>, children: readonly Output[]): Output;
  mark(mark: RichTextMark, children: readonly Output[]): Output;
  unknown(value: JSONValue): Output;
}

export interface RichTextRenderResult<Output> {
  readonly output: Output;
  readonly diagnostics: ReadonlyArray<RichTextRenderDiagnostic>;
}

export type RichTextRenderDiagnosticCode = "rich-text.unsafe-link" | "rich-text.unknown-node" | "rich-text.unknown-mark";

export interface RichTextRenderDiagnostic {
  readonly code: RichTextRenderDiagnosticCode;
  readonly reason: string;
  readonly nodeId?: string;
  readonly markType?: string;
}

export function renderRichText<Output>(
  document: RichTextDocument,
  adapter: RichTextRenderAdapter<Output>,
): RichTextRenderResult<Output>;
export function renderRichText<Output>(
  document: RichTextDocument,
  schema: RichTextSchema | null,
  adapter: RichTextRenderAdapter<Output>,
): RichTextRenderResult<Output>;
export function renderRichText<Output>(
  document: RichTextDocument,
  schemaOrAdapter: RichTextSchema | RichTextRenderAdapter<Output> | null,
  possibleAdapter?: RichTextRenderAdapter<Output>,
): RichTextRenderResult<Output> {
  const schema = possibleAdapter === undefined ? richTextSchemaV1 : schemaOrAdapter as RichTextSchema | null;
  const adapter = (possibleAdapter ?? schemaOrAdapter) as RichTextRenderAdapter<Output>;
  const diagnostics: RichTextRenderDiagnostic[] = [];
  return {
    output: adapter.document(document, document.content.map(renderNode)),
    diagnostics,
  };

  function renderNode(node: RichTextNode): Output {
    if (schema === null || schema.nodes[node.type] === undefined) {
      diagnostics.push({ code: "rich-text.unknown-node", reason: `No renderer schema for ${node.type}.`, nodeId: node.id });
      return adapter.unknown(node);
    }
    if (isRichTextText(node)) {
      return node.marks.reduceRight<Output>(
        (children, mark) => {
          if (schema.marks[mark.type] === undefined) {
            diagnostics.push({ code: "rich-text.unknown-mark", reason: `No renderer schema for ${mark.type}.`, nodeId: node.id, markType: mark.type });
            return children;
          }
          if (mark.type === "link" && !safeHref(mark.attrs.href)) {
            diagnostics.push({ code: "rich-text.unsafe-link", reason: `Unsafe link href ${JSON.stringify(mark.attrs.href)}.`, nodeId: node.id, markType: mark.type });
            return children;
          }
          return adapter.mark(mark, [children]);
        },
        adapter.text(node),
      );
    }
    const children = hasRichTextContent(node) ? node.content.map(renderNode) : [];
    return adapter.node(node, children);
  }
}

function safeHref(href: string): boolean {
  return !/[\u0000-\u001f\u007f]/.test(href)
    && (/^(https?:|mailto:|tel:)/i.test(href) || /^(\/|\.\/|\.\.\/|#|\?)/.test(href));
}
