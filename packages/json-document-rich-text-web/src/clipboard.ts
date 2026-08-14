import {
  RICH_TEXT_CLIPBOARD_MIME,
  RICH_TEXT_PROFILE_V1,
  type RichTextClipboard,
  type RichTextMark,
  type RichTextNode,
  type RichTextSlice,
  type RichTextText,
} from "@interactive-os/json-document-rich-text";
import type { WebClipboardCodec, WebClipboardRepresentation } from "@interactive-os/json-document-web";

export const richTextClipboardCodec: WebClipboardCodec<RichTextClipboard> = {
  mimeType: RICH_TEXT_CLIPBOARD_MIME,
  encode: (clipboard) => JSON.stringify(clipboard.slice),
  decode(serialized) {
    if (serialized.length === 0) return null;
    const value: unknown = JSON.parse(serialized);
    if (!isSlice(value)) return null;
    return clipboardFromSlice(value);
  },
};

export function createRichTextClipboardRepresentations(options: {
  readonly createId?: () => string;
} = {}): ReadonlyArray<WebClipboardRepresentation<RichTextClipboard>> {
  let sequence = 0;
  const createId = options.createId ?? (() => `pasted-${++sequence}`);
  return [
    richTextClipboardCodec,
    {
      mimeType: "text/html",
      encode: (clipboard) => clipboard.html || serializeRichTextSlice(clipboard.slice),
      decode: (html) => parseRichTextHTML(html, createId),
    },
    {
      mimeType: "text/plain",
      encode: (clipboard) => clipboard.text,
      decode: (text) => text.length === 0 ? null : plainTextClipboard(text, createId),
    },
  ];
}

export function serializeRichTextSlice(slice: RichTextSlice): string {
  return slice.content.map(serializeNode).join("");
}

export function parseRichTextHTML(html: string, createId: () => string): RichTextClipboard | null {
  if (html.length === 0 || typeof DOMParser === "undefined") return null;
  const document = new DOMParser().parseFromString(html, "text/html");
  const blocks: RichTextNode[] = [];
  for (const child of Array.from(document.body.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      blocks.push(paragraph([textNode(child.textContent, [], createId)], createId));
      continue;
    }
    if (!(child instanceof HTMLElement)) continue;
    const inline = parseInline(child, [], createId);
    if (inline.length === 0) continue;
    const tag = child.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      blocks.push({ id: createId(), type: "heading", attrs: { level: Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6 }, content: inline });
    } else {
      blocks.push(paragraph(inline, createId));
    }
  }
  if (blocks.length === 0) return null;
  const slice: RichTextSlice = { profile: RICH_TEXT_PROFILE_V1, content: blocks, openStart: 0, openEnd: 0 };
  return { type: RICH_TEXT_CLIPBOARD_MIME, slice, text: plainText(slice.content), html: serializeRichTextSlice(slice) };
}

function plainTextClipboard(text: string, createId: () => string): RichTextClipboard {
  const content = text.split(/\r?\n/).map((line) => paragraph([textNode(line, [], createId)], createId));
  const slice: RichTextSlice = { profile: RICH_TEXT_PROFILE_V1, content, openStart: 0, openEnd: 0 };
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
  return `<div>${children}</div>`;
}

function wrapMark(mark: RichTextMark, children: string): string {
  if (mark.type === "strong") return `<strong>${children}</strong>`;
  if (mark.type === "emphasis") return `<em>${children}</em>`;
  if (mark.type === "underline") return `<u>${children}</u>`;
  if (mark.type === "strikethrough") return `<s>${children}</s>`;
  if (mark.type === "code") return `<code>${children}</code>`;
  return safeHref(mark.attrs.href)
    ? `<a href="${escapeAttribute(mark.attrs.href)}"${mark.attrs.title ? ` title="${escapeAttribute(mark.attrs.title)}"` : ""}>${children}</a>`
    : children;
}

function parseInline(element: HTMLElement, marks: ReadonlyArray<RichTextMark>, createId: () => string): RichTextText[] {
  const nextMarks = markFor(element) ? [...marks, markFor(element)!] : marks;
  const output: RichTextText[] = [];
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent) output.push(textNode(child.textContent, nextMarks, createId));
    else if (child instanceof HTMLElement) output.push(...parseInline(child, nextMarks, createId));
  }
  return output;
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

function paragraph(content: ReadonlyArray<RichTextText>, createId: () => string): RichTextNode {
  return { id: createId(), type: "paragraph", content };
}

function textNode(text: string, marks: ReadonlyArray<RichTextMark>, createId: () => string): RichTextText {
  return { id: createId(), type: "text", text, marks };
}

function plainText(nodes: ReadonlyArray<RichTextNode>): string {
  return nodes.map((node) => {
    if (node.type === "text" && "text" in node) return String(node.text);
    if (!("content" in node) || !Array.isArray(node.content)) return node.type === "hardBreak" ? "\n" : "";
    return plainText(node.content);
  }).join(nodes.some((node) => node.type === "paragraph" || node.type === "heading") ? "\n" : "");
}

function isSlice(value: unknown): value is RichTextSlice {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const slice = value as Partial<RichTextSlice>;
  return slice.profile === RICH_TEXT_PROFILE_V1
    && Array.isArray(slice.content)
    && Number.isInteger(slice.openStart) && Number(slice.openStart) >= 0
    && Number.isInteger(slice.openEnd) && Number(slice.openEnd) >= 0;
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
