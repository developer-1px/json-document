import { COMPOSER_SKILL_NODE } from "@interactive-os/json-document-composer";
import type { RichTextNode } from "@interactive-os/json-document-rich-text";
import { RICH_TEXT_MENTION_NODE } from "@interactive-os/json-document-rich-text-mention";
import { RichTextMentionAtom } from "@interactive-os/json-document-rich-text-mention-react";
import type { HTMLAttributes, ReactNode } from "react";

export interface ComposerReferenceAtomProps extends HTMLAttributes<HTMLSpanElement> {
  readonly node: RichTextNode;
}

/** Projects a canonical Composer mention or skill node into an editable React surface. */
export function ComposerReferenceAtom({ node, ...props }: ComposerReferenceAtomProps): ReactNode {
  const kind = referenceKind(node);
  if (kind === null) return null;
  if (kind === "mention") return <RichTextMentionAtom {...props} node={node} data-composer-reference-kind="mention" />;
  const attrs = "attrs" in node ? node.attrs as { readonly label?: unknown } : {};
  const label = typeof attrs.label === "string" ? attrs.label : node.type;
  return <span {...props} contentEditable={false} data-composer-reference-kind={kind} data-rich-text-node-id={node.id}>
    /{label}
  </span>;
}

function referenceKind(node: RichTextNode): "mention" | "skill" | null {
  if (node.type === RICH_TEXT_MENTION_NODE) return "mention";
  if (node.type === COMPOSER_SKILL_NODE) return "skill";
  return null;
}
