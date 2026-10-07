import { assertMarkdownSelection } from "./source-edit.js";
import { continueMarkdownList } from "./list-editing.js";
import { projectMarkdown } from "./projection.js";

/** Source-only Enter edit; the caller owns selection application and History. */
export function insertMarkdownParagraph(source: string, selection: { readonly anchor: number; readonly focus: number }): {
  readonly value: string;
  readonly selection: { readonly anchor: number; readonly focus: number };
} {
  const from = Math.min(selection.anchor, selection.focus), to = Math.max(selection.anchor, selection.focus);
  assertMarkdownSelection(source,selection);
  const lineFrom = from === 0 ? 0 : source.lastIndexOf("\n", from - 1) + 1;
  const end = source.indexOf("\n", from);
  const lineTo = end < 0 ? source.length : end;
  const projection = projectMarkdown(source);
  const list = continueMarkdownList(source, selection, projection);
  if (list) return list;
  const markers = projection.markers.filter(marker => marker.kind === "blockquote" && marker.from >= lineFrom && marker.to <= from);
  const last = markers.at(-1);
  const prefixTo = last ? last.to + (/[ \t]/.test(source[last.to] ?? "") ? 1 : 0) : lineFrom;
  const prefix = last && /^[ \t>]*$/.test(source.slice(lineFrom, prefixTo)) ? source.slice(lineFrom, prefixTo) : "";
  const newline = source.slice(lineFrom, lineTo).endsWith("\r") || source.includes("\r\n") ? "\r\n" : "\n";
  const empty = prefix && from === to && !source.slice(prefixTo, lineTo).trim();
  const start = empty ? lineFrom : from;
  const finish = empty ? lineTo - (source[lineTo - 1] === "\r" ? 1 : 0) : to;
  const insert = empty ? (lineFrom > 0 ? newline : "") : newline + prefix;
  const focus = start + insert.length;
  return { value: source.slice(0, start) + insert + source.slice(finish), selection: { anchor: focus, focus } };
}
