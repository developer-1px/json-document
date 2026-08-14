import type { JSONValue } from "@interactive-os/json-document";
import type { RangeSelection } from "@interactive-os/json-document-selection";

export const RICH_TEXT_PROFILE_V1 = "urn:interactive-os:json-document:rich-text:1" as const;

export type RichTextAffinity = "backward" | "forward";

export type RichTextPoint =
  | ({
      readonly kind: "text";
      readonly nodeId: string;
      readonly offset: number;
      readonly affinity: RichTextAffinity;
    } & Readonly<Record<string, JSONValue>>)
  | ({
      readonly kind: "child";
      readonly nodeId: string;
      readonly offset: number;
      readonly affinity: RichTextAffinity;
    } & Readonly<Record<string, JSONValue>>);

export type RichTextSelection = RangeSelection<RichTextPoint> & Readonly<Record<string, JSONValue>>;

export type RichTextTarget =
  | { readonly kind: "text"; readonly nodeId: string; readonly from: number; readonly to: number }
  | { readonly kind: "node"; readonly nodeId: string };

export type RichTextMark =
  | { readonly type: "strong" }
  | { readonly type: "emphasis" }
  | { readonly type: "underline" }
  | { readonly type: "strikethrough" }
  | { readonly type: "code" }
  | { readonly type: "link"; readonly attrs: { readonly href: string; readonly title?: string } };

export interface RichTextNodeValue extends Record<string, JSONValue> {
  readonly id: string;
  readonly type: string;
}

export interface RichTextText extends RichTextNodeValue {
  readonly type: "text";
  readonly text: string;
  readonly marks: ReadonlyArray<RichTextMark>;
}

export interface RichTextHardBreak extends RichTextNodeValue {
  readonly type: "hardBreak";
}

export type RichTextInlineNode = RichTextText | RichTextHardBreak;

export interface RichTextParagraph extends RichTextNodeValue {
  readonly type: "paragraph";
  readonly content: ReadonlyArray<RichTextInlineNode>;
}

export interface RichTextHeading extends RichTextNodeValue {
  readonly type: "heading";
  readonly attrs: { readonly level: 1 | 2 | 3 | 4 | 5 | 6 };
  readonly content: ReadonlyArray<RichTextInlineNode>;
}

export interface RichTextContainerNode extends RichTextNodeValue {
  readonly content: ReadonlyArray<RichTextNode>;
}

export type RichTextNode = RichTextText | RichTextHardBreak | RichTextParagraph | RichTextHeading | RichTextContainerNode;

export interface RichTextDocument extends RichTextNodeValue {
  readonly profile: typeof RICH_TEXT_PROFILE_V1;
  readonly type: "doc";
  readonly content: ReadonlyArray<RichTextNode>;
}

export const RICH_TEXT_CLIPBOARD_MIME = "application/vnd.interactive-os.rich-text+json" as const;

export interface RichTextSlice extends Record<string, JSONValue> {
  readonly profile: typeof RICH_TEXT_PROFILE_V1;
  readonly content: ReadonlyArray<RichTextNode>;
  readonly openStart: number;
  readonly openEnd: number;
}

export interface RichTextClipboard {
  readonly type: typeof RICH_TEXT_CLIPBOARD_MIME;
  readonly slice: RichTextSlice;
  readonly text: string;
  readonly html: string;
}

export function isRichTextDocument(value: JSONValue): value is RichTextDocument {
  return isRecord(value)
    && value.profile === RICH_TEXT_PROFILE_V1
    && value.type === "doc"
    && typeof value.id === "string"
    && value.id.length > 0
    && Array.isArray(value.content);
}

export function isRichTextText(node: RichTextNode): node is RichTextText {
  return node.type === "text" && typeof node.text === "string" && Array.isArray(node.marks);
}

export function hasRichTextContent(node: RichTextNode | RichTextDocument): node is RichTextContainerNode | RichTextDocument {
  return "content" in node && Array.isArray(node.content);
}

function isRecord(value: JSONValue): value is { readonly [key: string]: JSONValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
