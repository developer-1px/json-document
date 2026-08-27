import { hasRichTextContent, isRichTextText, type RichTextNode } from "./model.js";

/** Projects Rich Text nodes to the canonical plain text used by clipboard and read-only surfaces. */
export function richTextPlainText(nodes: ReadonlyArray<RichTextNode>): string {
  return nodes.map((node) => {
    if (isRichTextText(node)) return node.text;
    if (node.type === "hardBreak") return "\n";
    return hasRichTextContent(node) ? richTextPlainText(node.content) : "";
  }).join(nodes.some((node) => node.type === "paragraph" || node.type === "heading" || node.type === "codeBlock") ? "\n" : "");
}
