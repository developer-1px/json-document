import {
  RICH_TEXT_CLIPBOARD_MIME,
  RICH_TEXT_PROFILE_V1,
  richTextSchemaV1,
  validateRichText,
  type RichTextClipboard,
  type RichTextBlockNode,
  type RichTextListItem,
  type RichTextMark,
  type RichTextInlineNode,
  type RichTextNode,
  type RichTextSlice,
  type RichTextText,
  type RichTextParagraph,
  type RichTextSchema,
} from "@interactive-os/json-document-rich-text";
import type { WebClipboardCodec, WebClipboardRepresentation } from "@interactive-os/json-document-web";

export function createRichTextClipboardCodec(schema: RichTextSchema = richTextSchemaV1): WebClipboardCodec<RichTextClipboard> {
  return {
    mimeType: RICH_TEXT_CLIPBOARD_MIME,
    encode: (clipboard) => JSON.stringify(clipboard.slice),
    decode(serialized) {
      if (serialized.length === 0) return null;
      let value: unknown;
      try { value = JSON.parse(serialized); } catch { return null; }
      if (!isSlice(value, schema)) return null;
      return clipboardFromSlice(value);
    },
  };
}

export const richTextClipboardCodec = createRichTextClipboardCodec();

export function createRichTextClipboardRepresentations(options: {
  readonly createId?: () => string;
  readonly schema?: RichTextSchema;
} = {}): ReadonlyArray<WebClipboardRepresentation<RichTextClipboard>> {
  let sequence = 0;
  const createId = options.createId ?? (() => `pasted-${++sequence}`);
  const schema = options.schema ?? richTextSchemaV1;
  return [
    createRichTextClipboardCodec(schema),
    {
      mimeType: "text/html",
      encode: (clipboard) => clipboard.html || serializeRichTextSlice(clipboard.slice),
      decode: (html) => parseRichTextHTML(html, createId, schema.profile),
    },
    {
      mimeType: "text/plain",
      encode: (clipboard) => clipboard.text,
      decode: (text) => text.length === 0 ? null : plainTextClipboard(text, createId, schema.profile),
    },
  ];
}

export function serializeRichTextSlice(slice: RichTextSlice): string {
  return slice.content.map(serializeNode).join("");
}

export function parseRichTextHTML(html: string, createId: () => string, profile: string = RICH_TEXT_PROFILE_V1): RichTextClipboard | null {
  if (html.length === 0 || typeof DOMParser === "undefined") return null;
  const document = new DOMParser().parseFromString(html, "text/html");
  const blocks: RichTextNode[] = [];
  for (const child of Array.from(document.body.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      blocks.push(paragraph([textNode(child.textContent, [], createId)], createId));
      continue;
    }
    if (!(child instanceof HTMLElement)) continue;
    blocks.push(...parseBlocks(child, createId));
  }
  if (blocks.length === 0) return null;
  const slice: RichTextSlice = { profile, content: blocks, openStart: 0, openEnd: 0 };
  return { type: RICH_TEXT_CLIPBOARD_MIME, slice, text: plainText(slice.content), html: serializeRichTextSlice(slice) };
}

function plainTextClipboard(text: string, createId: () => string, profile: string): RichTextClipboard {
  const content = text.split(/\r?\n/).map((line) => paragraph([textNode(line, [], createId)], createId));
  const slice: RichTextSlice = { profile, content, openStart: 0, openEnd: 0 };
  return { type: RICH_TEXT_CLIPBOARD_MIME, slice, text, html: serializeRichTextSlice(slice) };
}

function clipboardFromSlice(slice: RichTextSlice): RichTextClipboard {
  return {
    type: RICH_TEXT_CLIPBOARD_MIME,
    slice,
    text: plainText(slice.content),
    html: serializeRichTextSlice(slice),
  };
}

function serializeNode(node: RichTextNode): string {
  if (node.type === "text" && "text" in node) {
    let output = escapeHTML(String(node.text));
    for (const mark of node.marks as ReadonlyArray<RichTextMark>) output = wrapMark(mark, output);
    return output;
  }
  if (node.type === "hardBreak") return "<br>";
  const children = "content" in node && Array.isArray(node.content) ? node.content.map(serializeNode).join("") : "";
  if (node.type === "paragraph") return `<p>${children}</p>`;
  if (node.type === "heading") {
    const level = Math.min(6, Math.max(1, Number((node as { readonly attrs?: { readonly level?: number } }).attrs?.level ?? 2)));
    return `<h${level}>${children}</h${level}>`;
  }
  if (node.type === "blockquote") return `<blockquote>${children}</blockquote>`;
  if (node.type === "codeBlock") {
    const language = (node as { readonly attrs: { readonly language: string | null } }).attrs.language;
    return `<pre><code${language === null ? "" : ` class="language-${escapeAttribute(language)}"`}>${children}</code></pre>`;
  }
  if (node.type === "bulletList") return `<ul>${children}</ul>`;
  if (node.type === "orderedList") {
    const start = Number((node as { readonly attrs?: { readonly start?: number } }).attrs?.start ?? 1);
    return `<ol${start === 1 ? "" : ` start="${start}"`}>${children}</ol>`;
  }
  if (node.type === "listItem") return `<li>${children}</li>`;
  return `<div>${children}</div>`;
}

function wrapMark(mark: RichTextMark, children: string): string {
  if (mark.type === "strong") return `<strong>${children}</strong>`;
  if (mark.type === "emphasis") return `<em>${children}</em>`;
  if (mark.type === "underline") return `<u>${children}</u>`;
  if (mark.type === "strikethrough") return `<s>${children}</s>`;
  if (mark.type === "code") return `<code>${children}</code>`;
  if (mark.type !== "link") return children;
  return safeHref(mark.attrs.href)
    ? `<a href="${escapeAttribute(mark.attrs.href)}"${mark.attrs.title ? ` title="${escapeAttribute(mark.attrs.title)}"` : ""}>${children}</a>`
    : children;
}

function parseBlocks(element: HTMLElement, createId: () => string): RichTextBlockNode[] {
  const tag = element.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tag)) {
    return [{ id: createId(), type: "heading", attrs: { level: Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6 }, content: parseInline(element, [], createId) }];
  }
  if (tag === "p") return [paragraph(parseInline(element, [], createId), createId)];
  if (tag === "blockquote") {
    const content = parseBlockChildren(element, createId);
    return content.length > 0 ? [{ id: createId(), type: "blockquote", content }] : [];
  }
  if (tag === "pre") {
    const text = element.textContent ?? "";
    return [{
      id: createId(),
      type: "codeBlock",
      attrs: { language: languageFromCode(element.querySelector("code")) },
      content: text.length > 0 ? [{ id: createId(), type: "text", text, marks: [] }] : [],
    }];
  }
  if (tag === "ul" || tag === "ol") {
    const items = Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child) => parseListItem(child as HTMLElement, createId));
    if (items.length === 0) return [];
    return [tag === "ul"
      ? { id: createId(), type: "bulletList", content: items }
      : { id: createId(), type: "orderedList", attrs: { start: Math.max(1, Number(element.getAttribute("start") ?? 1)) }, content: items }];
  }
  const childBlocks = parseBlockChildren(element, createId);
  if (childBlocks.length > 0) return childBlocks;
  const inline = parseInline(element, [], createId);
  return inline.length > 0 ? [paragraph(inline, createId)] : [];
}

function parseBlockChildren(element: HTMLElement, createId: () => string): RichTextBlockNode[] {
  const blocks: RichTextBlockNode[] = [];
  let inline: RichTextInlineNode[] = [];
  const flush = () => {
    if (inline.length > 0) blocks.push(paragraph(mergeAdjacentText(inline), createId));
    inline = [];
  };
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent) {
      inline.push(textNode(child.textContent, [], createId));
    } else if (child instanceof HTMLElement && isBlockElement(child)) {
      flush();
      blocks.push(...parseBlocks(child, createId));
    } else if (child instanceof HTMLElement) {
      inline.push(...parseInline(child, [], createId));
    }
  }
  flush();
  return blocks;
}

function parseListItem(element: HTMLElement, createId: () => string): RichTextListItem {
  const content: RichTextBlockNode[] = [];
  let inline: RichTextInlineNode[] = [];
  const flushInline = () => {
    if (inline.length > 0) content.push(paragraph(inline, createId));
    inline = [];
  };
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent) {
      inline.push(textNode(child.textContent, [], createId));
    } else if (child instanceof HTMLElement && isBlockElement(child)) {
      flushInline();
      content.push(...parseBlocks(child, createId));
    } else if (child instanceof HTMLElement) {
      inline.push(...parseInline(child, [], createId));
    }
  }
  flushInline();
  if (content.length === 0) content.push(paragraph([], createId));
  return { id: createId(), type: "listItem", content };
}

function parseInline(element: HTMLElement, marks: ReadonlyArray<RichTextMark>, createId: () => string): RichTextInlineNode[] {
  const nextMarks = markFor(element) ? [...marks, markFor(element)!] : marks;
  const output: RichTextInlineNode[] = [];
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent) output.push(textNode(child.textContent, nextMarks, createId));
    else if (child instanceof HTMLElement && child.tagName.toLowerCase() === "br") output.push({ id: createId(), type: "hardBreak" });
    else if (child instanceof HTMLElement && !isBlockElement(child)) output.push(...parseInline(child, nextMarks, createId));
  }
  return mergeAdjacentText(output);
}

function markFor(element: HTMLElement): RichTextMark | null {
  const tag = element.tagName.toLowerCase();
  if (tag === "strong" || tag === "b") return { type: "strong" };
  if (tag === "em" || tag === "i") return { type: "emphasis" };
  if (tag === "u") return { type: "underline" };
  if (tag === "s" || tag === "strike") return { type: "strikethrough" };
  if (tag === "code") return { type: "code" };
  if (tag === "a" && safeHref(element.getAttribute("href") ?? "")) {
    const title = element.getAttribute("title");
    return { type: "link", attrs: { href: element.getAttribute("href")!, ...(title ? { title } : {}) } };
  }
  return null;
}

function paragraph(content: ReadonlyArray<RichTextInlineNode>, createId: () => string): RichTextParagraph {
  return { id: createId(), type: "paragraph", content };
}

function languageFromCode(code: HTMLElement | null): string | null {
  const match = code?.className.match(/(?:^|\s)language-([^\s]+)/);
  return match?.[1] ?? null;
}

function isBlockElement(element: HTMLElement): boolean {
  return /^(p|h[1-6]|blockquote|pre|ul|ol|li|div)$/.test(element.tagName.toLowerCase());
}

function textNode(text: string, marks: ReadonlyArray<RichTextMark>, createId: () => string): RichTextText {
  const byType = new Map(marks.map((mark) => [mark.type, mark]));
  const canonical = [...byType.values()].sort((left, right) => markRank(left.type) - markRank(right.type));
  return { id: createId(), type: "text", text, marks: canonical.some((mark) => mark.type === "code") ? canonical.filter((mark) => mark.type === "code") : canonical };
}

function mergeAdjacentText(nodes: ReadonlyArray<RichTextInlineNode>): RichTextInlineNode[] {
  const merged: RichTextInlineNode[] = [];
  for (const node of nodes) {
    const previous = merged.at(-1);
    if (previous?.type === "text" && node.type === "text" && JSON.stringify(previous.marks) === JSON.stringify(node.marks)) {
      merged[merged.length - 1] = { ...previous, text: previous.text + node.text };
    } else {
      merged.push(node);
    }
  }
  return merged;
}

function markRank(type: RichTextMark["type"]): number {
  const rank = ["link", "strong", "emphasis", "underline", "strikethrough", "code"].indexOf(type);
  return rank < 0 ? Number.MAX_SAFE_INTEGER : rank;
}

function plainText(nodes: ReadonlyArray<RichTextNode>): string {
  return nodes.map(plainTextNode).join("\n");
}

function plainTextNode(node: RichTextNode): string {
  if (node.type === "text" && "text" in node) return String(node.text);
  if (node.type === "hardBreak") return "\n";
  if (!("content" in node) || !Array.isArray(node.content)) return "";
  const children = node.content as ReadonlyArray<RichTextNode>;
  if (node.type === "paragraph" || node.type === "heading" || node.type === "codeBlock") {
    return children.map(plainTextNode).join("");
  }
  if (node.type === "bulletList") return children.map((child) => `• ${plainTextNode(child)}`).join("\n");
  if (node.type === "orderedList") return children.map((child, index) => `${node.attrs.start + index}. ${plainTextNode(child)}`).join("\n");
  return children.map(plainTextNode).join("\n");
}

function isSlice(value: unknown, schema: RichTextSchema): value is RichTextSlice {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const slice = value as Partial<RichTextSlice>;
  if (!(slice.profile === schema.profile
    && Array.isArray(slice.content)
    && Number.isInteger(slice.openStart) && Number(slice.openStart) >= 0
    && Number.isInteger(slice.openEnd) && Number(slice.openEnd) >= 0
    && (slice.openStart === 0 || slice.openStart === 1)
    && slice.openStart === slice.openEnd)) return false;
  const ids = collectIds(slice.content as RichTextNode[]);
  const unique = (prefix: string) => {
    let id = prefix;
    while (ids.has(id)) id += "_";
    return id;
  };
  const document = slice.openStart === 0
    ? { profile: schema.profile, id: unique("clipboard-doc"), type: "doc" as const, content: slice.content }
    : {
        profile: schema.profile,
        id: unique("clipboard-doc"),
        type: "doc" as const,
        content: [{ id: unique("clipboard-paragraph"), type: "paragraph" as const, content: slice.content }],
      };
  return validateRichText(document as import("@interactive-os/json-document-rich-text").RichTextDocument, { schema }).ok;
}

function collectIds(nodes: ReadonlyArray<RichTextNode>): Set<string> {
  const ids = new Set<string>();
  const visit = (node: RichTextNode) => {
    ids.add(node.id);
    if ("content" in node && Array.isArray(node.content)) node.content.forEach((child) => visit(child as RichTextNode));
  };
  nodes.forEach(visit);
  return ids;
}

function safeHref(href: string): boolean {
  return !/[\u0000-\u001f\u007f]/.test(href)
    && (/^(https?:|mailto:|tel:)/i.test(href) || /^(\/|\.\/|\.\.\/|#|\?)/.test(href));
}

function escapeHTML(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHTML(value).replaceAll('"', "&quot;");
}
