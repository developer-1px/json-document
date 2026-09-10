import type { MarkdownNode } from "./nodes.js";
import { parseMarkdownSyntax, syntaxProjection } from "./syntax.js";

/** Half-open UTF-16 source coordinates, including the original delimiters. */
export interface MarkdownStrongSpan {
  readonly from: number;
  readonly to: number;
  readonly contentFrom: number;
  readonly contentTo: number;
}
export interface MarkdownProjection {
  readonly source: string;
  readonly nodes: ReadonlyArray<MarkdownNode>;
  readonly strong: ReadonlyArray<MarkdownStrongSpan>;
}

/** CommonMark recognition with exact source preservation. Includes CommonMark and GFM block and inline syntax. */
export function projectMarkdown(source: string): MarkdownProjection {
  return syntaxProjection(source, parseMarkdownSyntax(source));
}
