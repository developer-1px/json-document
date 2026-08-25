import {
  RICH_TEXT_CLIPBOARD_MIME,
  type RichTextEditor,
  type RichTextNode,
  type RichTextNodeSpec,
  type RichTextPoint,
  type RichTextSelection,
} from "@interactive-os/json-document-rich-text";
import {
  findRichTextSuggestionTrigger,
  resolveRichTextSuggestions,
  type RichTextSuggestionCandidate,
  type RichTextSuggestionTrigger,
} from "@interactive-os/json-document-rich-text-suggestion";

export const RICH_TEXT_MENTION_NODE = "os.interactive/mention" as const;

export interface RichTextMention {
  readonly id: string;
  readonly label: string;
}

export interface RichTextMentionSuggestion extends RichTextMention, RichTextSuggestionCandidate {
  readonly description?: string;
  readonly iconUrl?: string;
  readonly iconText?: string;
}

export interface RichTextMentionRange {
  readonly nodeId: string;
  readonly from: number;
  readonly to: number;
}

const requiredNonEmptyString = { required: true, validate: (value: unknown) => typeof value === "string" && value.length > 0 } as const;

export const richTextMentionNodeSpec: RichTextNodeSpec = {
  group: "inline",
  atom: true,
  content: null,
  allowedMarks: "none",
  attrs: { entityId: requiredNonEmptyString, label: requiredNonEmptyString },
};

export function createRichTextMentionNode(mention: RichTextMention, nodeId: string): RichTextNode {
  return { id: nodeId, type: RICH_TEXT_MENTION_NODE, attrs: { entityId: mention.id, label: mention.label } };
}

export function findRichTextMentionTrigger(
  document: import("@interactive-os/json-document-rich-text").RichTextDocument,
  selection: RichTextSelection,
): RichTextSuggestionTrigger | null {
  return findRichTextSuggestionTrigger(document, selection, ["@"]);
}

export function resolveRichTextMentionSuggestions<Suggestion extends RichTextMentionSuggestion>(
  trigger: RichTextSuggestionTrigger | null,
  suggestions: ReadonlyArray<Suggestion>,
): ReadonlyArray<Suggestion> {
  return trigger?.trigger === "@" ? resolveRichTextSuggestions(trigger, suggestions) : [];
}

export function insertRichTextMentionSuggestion(
  editor: RichTextEditor,
  trigger: RichTextSuggestionTrigger,
  suggestion: RichTextMentionSuggestion,
  options: { readonly createId: () => string },
): ReturnType<RichTextEditor["dispatch"]> {
  return insertRichTextMention(editor, trigger.range, suggestion, options);
}

/** Replaces a text range with one canonical mention atom and a trailing space. */
export function insertRichTextMention(
  editor: RichTextEditor,
  range: RichTextMentionRange,
  mention: RichTextMention,
  options: { readonly createId: () => string },
): ReturnType<RichTextEditor["dispatch"]> {
  const anchor: RichTextPoint = { kind: "text", nodeId: range.nodeId, offset: range.from, affinity: "forward" };
  const focus: RichTextPoint = { kind: "text", nodeId: range.nodeId, offset: range.to, affinity: "forward" };
  const selected = editor.dispatch({ type: "selection.set", selection: { kind: "range", ranges: [{ anchor, focus }], primaryIndex: 0 } });
  if (!selected.ok) return selected;
  return editor.dispatch({
    type: "clipboard.paste",
    clipboard: {
      type: RICH_TEXT_CLIPBOARD_MIME,
      slice: {
        profile: editor.schema.profile,
        content: [createRichTextMentionNode(mention, options.createId()), { id: options.createId(), type: "text", text: " ", marks: [] }],
        openStart: 1,
        openEnd: 1,
      },
      text: `@${mention.label} `,
      html: `<span>@${mention.label}</span> `,
    },
  });
}

export function isRichTextMentionNode(node: RichTextNode): boolean {
  return node.type === RICH_TEXT_MENTION_NODE;
}
