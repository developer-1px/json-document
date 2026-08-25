import { RICH_TEXT_MENTION_NODE } from "@interactive-os/json-document-rich-text-mention";
import type { RichTextNode } from "@interactive-os/json-document-rich-text";
import type { HTMLAttributes, ReactNode } from "react";

export interface RichTextMentionAtomProps extends HTMLAttributes<HTMLSpanElement> {
  readonly node: RichTextNode;
}

/** Projects a canonical entity mention into an editable React surface. */
export function RichTextMentionAtom({ node, ...props }: RichTextMentionAtomProps): ReactNode {
  if (node.type !== RICH_TEXT_MENTION_NODE) return null;
  const attrs = "attrs" in node ? node.attrs as { readonly label?: unknown } : {};
  const label = typeof attrs.label === "string" ? attrs.label : node.type;
  return <span {...props} contentEditable={false} data-rich-text-mention="" data-rich-text-node-id={node.id}>@{label}</span>;
}
