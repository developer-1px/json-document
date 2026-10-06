import { projectMarkdown } from "./projection.js";

/** Markdown source cells, including the header as row zero. */
export interface MarkdownTable {
  readonly from: number;
  readonly to: number;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
  readonly align: ReadonlyArray<"left" | "right" | "center" | null>;
}

/** Locate a top-level GFM table by source coordinate; cell values retain inline Markdown. */
export function readMarkdownTable(source: string, at: number): MarkdownTable | null {
  const node = projectMarkdown(source).nodes.find(node => node.kind === "table" && node.from <= at && at <= node.to);
  if (!node) return null;
  return {from: node.from, to: node.to, align: node.align ?? [], rows: (node.children ?? []).map(row =>
    (row.children ?? []).map(cell => cell.children?.length ? source.slice(cell.children[0]!.from, cell.children.at(-1)!.to) : ""))};
}

/** Replace only the selected table. New lines cannot escape into surrounding blocks. */
export function replaceMarkdownTable(source: string, table: MarkdownTable, rows: ReadonlyArray<ReadonlyArray<string>>, align = table.align): string {
  const width = rows[0]?.length ?? 0;
  if (!width || !rows.length || rows.some(row => row.length !== width)) throw new RangeError("Markdown tables need a nonempty rectangular header");
  const cell = (value: string) => value.replace(/[\r\n]+/g, " ").replace(/(\\*)\|/g, (match, escapes: string) => escapes.length % 2 ? match : `${escapes}\\|`);
  const line = (row: ReadonlyArray<string>) => `| ${row.map(cell).join(" | ")} |`;
  const ending = source.slice(table.from, table.to).includes("\r\n") ? "\r\n" : "\n";
  const separator = rows[0]!.map((_, i) => align[i] === "center" ? ":---:" : align[i] === "right" ? "---:" : align[i] === "left" ? ":---" : "---");
  const replacement = [line(rows[0]!), line(separator), ...rows.slice(1).map(line)].join(ending);
  return source.slice(0, table.from) + replacement + source.slice(table.to);
}

/** Source boundary in the adjacent block, beyond the blank line separating a table. */
export function markdownTableBoundary(source: string, table: MarkdownTable, edge: "before" | "after"): number {
  return edge === "before" ? Math.max(0, table.from - 1)
    : Math.min(source.length, table.to + (/^\r?\n(?:\r?\n)?/.exec(source.slice(table.to))?.[0].length ?? 0));
}
