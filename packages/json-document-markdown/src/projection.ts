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
  readonly strong: ReadonlyArray<MarkdownStrongSpan>;
}

/** CommonMark recognition with exact source preservation. Only strong is styled by this experiment. */
export function projectMarkdown(source: string): MarkdownProjection {
  return syntaxProjection(source, parseMarkdownSyntax(source));
}
