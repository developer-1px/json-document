import type { MarkdownNode, MarkdownNodeKind, MarkdownProjection } from "@interactive-os/json-document-markdown";

interface SourceRange { readonly from: number; readonly to: number }
export interface SourceRun extends SourceRange {
  readonly kind: MarkdownNodeKind | "source" | "delimiter" | "imagePreview";
  readonly tag: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly value?: string;
  readonly children?: ReadonlyArray<SourceRun>;
  readonly owner?: SourceRange;
  readonly conceal?: boolean;
}

const tags: Record<MarkdownNodeKind, string> = {
  paragraph: "span", heading: "span", thematicBreak: "span", blockquote: "span",
  list: "span", listItem: "span", code: "code", html: "code", definition: "span",
  text: "span", emphasis: "em", strong: "strong", delete: "s", inlineCode: "code",
  break: "span", link: "a", image: "span", linkReference: "a", imageReference: "span",
  table: "span", tableRow: "span", tableCell: "span", footnoteDefinition: "span", footnoteReference: "sup",
};
const concealedGaps = new Set<MarkdownNodeKind>(["heading", "emphasis", "strong", "delete", "link", "linkReference", "table", "tableRow", "tableCell"]);
const markerGaps = new Set<MarkdownNodeKind>([...concealedGaps, "listItem", "blockquote", "footnoteDefinition"]);

/** Only navigable document URLs can become DOM attributes; raw HTML stays text. */
function safeURL(value: string | undefined, image = false): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/[\u0000-\u0020\u007f]/g, "");
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(normalized)?.[1]?.toLowerCase();
  if (scheme && !(image ? ["http", "https"] : ["http", "https", "mailto", "tel"]).includes(scheme)) return undefined;
  return value;
}

/** A source-complete tree: visual decoration never adds text to the document. */
export function sourceRuns(projection: MarkdownProjection): SourceRun[] {
  const { source } = projection;
  const definitions = new Map<string, MarkdownNode>();
  const collect = (nodes: ReadonlyArray<MarkdownNode>) => {
    for (const node of nodes) {
      if (node.kind === "definition" && node.identifier && !definitions.has(node.identifier)) definitions.set(node.identifier, node);
      if (node.children) collect(node.children);
    }
  };
  collect(projection.nodes);
  const raw = (from: number, to: number, owner?: SourceRange, conceal = false): SourceRun => ({
    kind: owner ? "delimiter" : "source", tag: "span", from, to, value: source.slice(from, to),
    attributes: owner ? { "data-markdown-delimiter": "" } : {}, ...(owner ? { owner, conceal } : {}),
  });
  const gap = (from: number, to: number, parent?: MarkdownNode, table?: MarkdownNode): SourceRun => {
    if (parent?.kind === "listItem" && typeof parent.checked === "boolean" && /\[[ xX]\]/.test(source.slice(from, to))) {
      return { kind: "delimiter", tag: "span", from, to, owner: parent,
        attributes: { "data-markdown-display": parent.checked ? "☑ " : "☐ ", "data-markdown-delimiter": "" },
        children: [raw(from, to, parent, true)],
      };
    }
    return raw(from, to, parent && markerGaps.has(parent.kind) ? table ?? parent : undefined, !!parent && concealedGaps.has(parent.kind));
  };
  const children = (nodes: ReadonlyArray<MarkdownNode>, from: number, to: number, parent?: MarkdownNode, table?: MarkdownNode): SourceRun[] => {
    const result: SourceRun[] = [];
    let cursor = from;
    for (const [index, node] of nodes.entries()) {
      if (node.from > cursor) result.push(gap(cursor, node.from, parent, table));
      result.push(visit(node, parent, index, table));
      cursor = node.to;
    }
    if (cursor < to) result.push(gap(cursor, to, parent, table));
    return result;
  };
  const visit = (node: MarkdownNode, parent?: MarkdownNode, index = 0, table?: MarkdownNode): SourceRun => {
    const attributes: Record<string, string> = { "data-markdown-kind": node.kind };
    if (node.depth) { attributes.role = "heading"; attributes["aria-level"] = String(node.depth); attributes["data-depth"] = String(node.depth); }
    if (node.kind === "list") attributes.role = "list";
    if (node.kind === "listItem") {
      attributes.role = "listitem";
      if (node.checked !== null && node.checked !== undefined) attributes["data-checked"] = String(node.checked);
    }
    if (node.kind === "table") attributes.role = "table";
    if (node.kind === "tableRow") attributes.role = "row";
    if (node.kind === "tableCell") {
      attributes.role = "cell";
      const align = table?.align?.[index];
      if (align) attributes["data-align"] = align;
    }
    if (node.lang) attributes["data-language"] = node.lang;
    const definition = node.identifier ? definitions.get(node.identifier) : undefined;
    const image = node.kind === "image" || node.kind === "imageReference";
    const url = safeURL(node.url ?? definition?.url, image);
    if ((node.kind === "link" || node.kind === "linkReference") && url) {
      attributes.href = url; attributes.rel = "noreferrer noopener";
      attributes.target = "_blank";
    }
    const title = node.title ?? definition?.title;
    if (title) attributes.title = title;
    let content: SourceRun[];
    if (node.children) content = children(node.children, node.from, node.to, node, node.kind === "table" ? node : table);
    else if (image && url) {
      content = [raw(node.from, node.to, node, true), {
        kind: "imagePreview", tag: "img", from: node.from, to: node.from,
        attributes: { src: url, alt: node.alt ?? "", contenteditable: "false", draggable: "false", loading: "lazy" }, owner: node,
      }];
    } else if (node.kind === "thematicBreak") {
      attributes.role = "separator";
      content = [raw(node.from, node.to, node, true)];
    } else if (node.value !== undefined && node.kind !== "html" && node.value !== source.slice(node.from, node.to)) {
      attributes["data-markdown-display"] = node.value;
      content = [raw(node.from, node.to, node, true)];
    } else if (node.kind === "break") {
      attributes["data-markdown-display"] = "\n";
      content = [raw(node.from, node.to, node, true)];
    } else content = [raw(node.from, node.to)];
    return { kind: node.kind, tag: tags[node.kind], from: node.from, to: node.to, attributes, children: content, owner: node };
  };
  return children(projection.nodes, 0, source.length);
}
