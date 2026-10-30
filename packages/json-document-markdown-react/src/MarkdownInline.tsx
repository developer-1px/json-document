import {Fragment, type ReactNode} from "react";
import {projectMarkdown, type MarkdownNode} from "@interactive-os/json-document-markdown";

const tags: Partial<Record<MarkdownNode["kind"], "strong" | "em" | "s" | "code">> = {strong: "strong", emphasis: "em", delete: "s", inlineCode: "code"};

function renderNode(node: MarkdownNode, source: string, key: number): ReactNode {
  const children = node.children ? node.children.map((child, index) => renderNode(child, source, index)) : node.value ?? source.slice(node.from, node.to);
  if (node.kind === "break") return <br key={key} />;
  if (node.kind === "link" && node.url) return <a key={key} href={node.url} rel="noopener noreferrer">{children}</a>;
  const Tag = tags[node.kind];
  return Tag ? <Tag key={key}>{children}</Tag> : <Fragment key={key}>{children}</Fragment>;
}

/** Inline Markdown read view from the canonical projection: marks become elements, delimiters stay hidden, no block wrapper. */
export function MarkdownInline({source}: {readonly source: string}): ReactNode {
  const projection = projectMarkdown(source);
  return <>{projection.nodes.map((node, index) => renderNode(node, projection.source, index))}</>;
}
