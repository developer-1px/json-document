import type { JSONValue } from "@interactive-os/json-document";
import type { RangeSelection } from "@interactive-os/json-document-selection";

export const RICH_TEXT_PROFILE_V1 = "urn:interactive-os:json-document:rich-text:1" as const;
export type RichTextNodeId = string;

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

export type RichTextOfficialMark =
  | { readonly type: "strong" }
  | { readonly type: "emphasis" }
  | { readonly type: "underline" }
  | { readonly type: "strikethrough" }
  | { readonly type: "code" }
  | { readonly type: "link"; readonly attrs: { readonly href: string; readonly title?: string } };

export type RichTextExtensionMark = {
  readonly type: `${string}/${string}`;
  readonly attrs?: Readonly<Record<string, JSONValue>>;
};

export type RichTextMark = RichTextOfficialMark | RichTextExtensionMark;

export interface RichTextNodeValue extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
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

export interface RichTextBlockquote extends RichTextNodeValue {
  readonly type: "blockquote";
  readonly content: ReadonlyArray<RichTextBlockNode>;
}

export interface RichTextCodeBlock extends RichTextNodeValue {
  readonly type: "codeBlock";
  readonly attrs: { readonly language: string | null };
  readonly content: readonly [] | readonly [RichTextPlainText];
}

export interface RichTextBulletList extends RichTextNodeValue {
  readonly type: "bulletList";
  readonly content: ReadonlyArray<RichTextListItem>;
}

export interface RichTextOrderedList extends RichTextNodeValue {
  readonly type: "orderedList";
  readonly attrs: { readonly start: number };
  readonly content: ReadonlyArray<RichTextListItem>;
}

export interface RichTextListItem extends RichTextNodeValue {
  readonly type: "listItem";
  readonly content: ReadonlyArray<RichTextBlockNode>;
}

export interface RichTextPlainText extends RichTextText {
  readonly marks: readonly [];
}

type RichTextExtensionBase = RichTextNodeValue & { readonly type: `${string}/${string}` };
export type RichTextExtensionNode = RichTextExtensionBase & (
  | { readonly attrs: Readonly<Record<string, JSONValue>>; readonly content: ReadonlyArray<RichTextNode> }
  | { readonly attrs: Readonly<Record<string, JSONValue>> }
  | { readonly content: ReadonlyArray<RichTextNode> }
  | Record<never, never>
);

export type RichTextBlockNode =
  | RichTextParagraph
  | RichTextHeading
  | RichTextBlockquote
  | RichTextCodeBlock
  | RichTextBulletList
  | RichTextOrderedList;

export type RichTextContentNode = RichTextBlockNode | RichTextListItem | RichTextInlineNode | RichTextExtensionNode;
export type RichTextNode = RichTextContentNode;

export interface RichTextDocument extends RichTextNodeValue {
  readonly profile: string;
  readonly type: "doc";
  readonly content: ReadonlyArray<RichTextBlockNode | RichTextExtensionNode>;
}

export const RICH_TEXT_CLIPBOARD_MIME = "application/vnd.interactive-os.rich-text+json" as const;

export interface RichTextSlice extends Record<string, JSONValue> {
  readonly profile: string;
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
    && typeof value.profile === "string"
    && value.profile.length > 0
    && value.type === "doc"
    && typeof value.id === "string"
    && value.id.length > 0
    && Array.isArray(value.content);
}

export function isRichTextText(node: RichTextNode | RichTextDocument): node is RichTextText {
  return node.type === "text" && typeof node.text === "string" && Array.isArray(node.marks);
}

export function hasRichTextContent(node: RichTextNode | RichTextDocument): node is (RichTextNode & { readonly content: ReadonlyArray<RichTextNode> }) | RichTextDocument {
  return "content" in node && Array.isArray(node.content);
}

function isRecord(value: JSONValue): value is { readonly [key: string]: JSONValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
