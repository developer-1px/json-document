import type { RichTextDocument, RichTextNode, RichTextSelection } from "@interactive-os/json-document-rich-text";
import type { ComposerTrigger } from "./model.js";

export function findComposerTrigger(document: RichTextDocument, selection: RichTextSelection): ComposerTrigger | null {
  const index = selection.primaryIndex;
  const caret = index === null ? null : selection.ranges[index]?.focus ?? null;
  if (caret === null || caret.kind !== "text") return null;
  const text = findText(document.content, caret.nodeId);
  if (text === null) return null;
  const match = text.slice(0, caret.offset).match(/(?:^|\s)([/@])([^\s]*)$/);
  if (!match) return null;
  const query = match[2] ?? "";
  return {
    kind: match[1] === "/" ? "skill" : "mention",
    query: query.toLowerCase(),
    range: { nodeId: caret.nodeId, from: caret.offset - query.length - 1, to: caret.offset },
  };
}

function findText(nodes: ReadonlyArray<RichTextNode>, id: string): string | null {
  for (const node of nodes) {
    if (node.id === id && node.type === "text" && "text" in node) return node.text;
    if ("content" in node && Array.isArray(node.content)) {
      const found = findText(node.content as ReadonlyArray<RichTextNode>, id);
      if (found !== null) return found;
    }
  }
  return null;
}
