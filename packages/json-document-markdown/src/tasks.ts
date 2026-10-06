import { projectMarkdown } from "./projection.js";

/** Change a recognized task checkbox; keep all other source and offsets intact. */
export function setMarkdownTaskChecked(source: string, from: number, checked: boolean): string {
  const marker = projectMarkdown(source).markers.find(marker => marker.kind === "task" && marker.from === from);
  if (!marker) return source;
  const current = source[marker.from + 1]!;
  if ((current.toLowerCase() === "x") === checked) return source;
  return source.slice(0, marker.from + 1) + (checked ? "x" : " ") + source.slice(marker.from + 2);
}
