import { fromMarkdown } from "mdast-util-from-markdown";

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
  const strong: MarkdownStrongSpan[] = [];
  const visit = (node: ReturnType<typeof fromMarkdown> | ReturnType<typeof fromMarkdown>["children"][number]): void => {
    if (node.type === "strong") {
      const from = node.position?.start.offset;
      const to = node.position?.end.offset;
      if (from !== undefined && to !== undefined) {
        strong.push(Object.freeze({ from, to, contentFrom: from + 2, contentTo: to - 2 }));
      }
    }
    if ("children" in node) for (const child of node.children) visit(child);
  };
  visit(fromMarkdown(source));
  return Object.freeze({ source, strong: Object.freeze(strong) });
}
