import type { RichTextDocument, RichTextNode, RichTextText } from "@interactive-os/json-document-rich-text";

/** Finds a text node for the Rich Text Demo's sample commands. */
export function findRichTextDemoTextNode(
  node: RichTextDocument | RichTextNode,
  id: string,
): RichTextText | null {
  if (node.type === "text") return node.id === id ? node as RichTextText : null;
  if (!("content" in node) || !Array.isArray(node.content)) return null;
  for (const child of node.content) {
    const found = findRichTextDemoTextNode(child as RichTextNode, id);
    if (found) return found;
  }
  return null;
}

/** Collects stable node IDs for the Rich Text Demo inspector projection. */
export function collectRichTextDemoNodeIds(node: RichTextDocument | RichTextNode): string[] {
  const ids = [node.id];
  if (!("content" in node) || !Array.isArray(node.content)) return ids;
  return ids.concat(node.content.flatMap((child) => collectRichTextDemoNodeIds(child as RichTextNode)));
}
