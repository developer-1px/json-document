import type { RootContent } from "mdast";

export type MarkdownNodeKind = "paragraph" | "heading" | "thematicBreak" | "blockquote" | "list" | "listItem" | "code" | "html" | "definition" | "text" | "emphasis" | "strong" | "delete" | "inlineCode" | "break" | "link" | "image" | "linkReference" | "imageReference" | "table" | "tableRow" | "tableCell" | "footnoteDefinition" | "footnoteReference";

/** Source coordinates are half-open UTF-16 offsets. Values never replace source. */
export interface MarkdownNode {
  readonly kind: MarkdownNodeKind;
  readonly from: number;
  readonly to: number;
  readonly children?: ReadonlyArray<MarkdownNode>;
  readonly value?: string;
  readonly depth?: number;
  readonly ordered?: boolean;
  readonly start?: number | null;
  readonly checked?: boolean | null;
  readonly align?: ReadonlyArray<"left" | "right" | "center" | null>;
  readonly url?: string;
  readonly title?: string | null;
  readonly alt?: string | null;
  readonly identifier?: string;
  readonly lang?: string | null;
}

/** Convert the parser's syntax tree once at the canonical document boundary. */
export function markdownNode(node: RootContent, offset: number, fallback = offset): MarkdownNode {
  const from = node.position?.start.offset ?? fallback;
  const to = node.position?.end.offset ?? fallback;
  const result: MarkdownNode = {
    kind: node.type === "yaml" ? "html" : node.type,
    from: from - offset,
    to: to - offset,
    ...("children" in node ? { children: Object.freeze(node.children.map(child => markdownNode(child, offset, to))) } : {}),
    ...("value" in node ? { value: node.value } : {}),
    ...("depth" in node ? { depth: node.depth } : {}),
    ...("ordered" in node ? { ordered: node.ordered ?? false, start: node.start ?? null } : {}),
    ...("checked" in node ? { checked: node.checked ?? null } : {}),
    ...("align" in node ? { align: Object.freeze([...(node.align ?? [])]) } : {}),
    ...("url" in node ? { url: node.url, title: node.title ?? null } : {}),
    ...("alt" in node ? { alt: node.alt ?? null } : {}),
    ...("identifier" in node ? { identifier: node.identifier } : {}),
    ...("lang" in node ? { lang: node.lang ?? null } : {}),
  };
  return Object.freeze(result);
}

export function offsetNode(node: MarkdownNode, offset: number): MarkdownNode {
  if (offset === 0) return node;
  return Object.freeze({ ...node, from: node.from + offset, to: node.to + offset,
    ...(node.children ? { children: Object.freeze(node.children.map(child => offsetNode(child, offset))) } : {}),
  });
}

/** Safe literal edits move syntax coordinates without invoking the grammar again. */
export function editNode(node: MarkdownNode, from: number, to: number, insert: string): MarkdownNode {
  const delta = insert.length - (to - from);
  if (node.to < from) return node;
  if (node.from >= to) return offsetNode(node, delta);
  const value = node.kind === "text" && node.value !== undefined && from >= node.from && to <= node.to
    ? node.value.slice(0, from - node.from) + insert + node.value.slice(to - node.from) : node.value;
  return Object.freeze({ ...node, to: node.to >= to ? node.to + delta : node.to,
    ...(value !== undefined ? { value } : {}),
    ...(node.children ? { children: Object.freeze(node.children.map(child => editNode(child, from, to, insert))) } : {}),
  });
}
