import {
  RICH_TEXT_CLIPBOARD_MIME,
  type RichTextDocument,
  type RichTextEditor,
  type RichTextNode,
  type RichTextPoint,
} from "@interactive-os/json-document-rich-text";
import { COMPOSER_MENTION_NODE, COMPOSER_PROFILE_V1, COMPOSER_SKILL_NODE, type ComposerDraft, type ComposerReference, type ComposerTrigger } from "./model.js";

export type ComposerCommandResult = ReturnType<RichTextEditor["dispatch"]>;

export function insertComposerReference(editor: RichTextEditor, trigger: ComposerTrigger, reference: ComposerReference, options: { readonly createId: () => string }): ComposerCommandResult {
  const anchor: RichTextPoint = { kind: "text", nodeId: trigger.range.nodeId, offset: trigger.range.from, affinity: "forward" };
  const focus: RichTextPoint = { kind: "text", nodeId: trigger.range.nodeId, offset: trigger.range.to, affinity: "forward" };
  const selected = editor.dispatch({ type: "selection.set", selection: { kind: "range", ranges: [{ anchor, focus }], primaryIndex: 0 } });
  if (!selected.ok) return selected;
  const atom: RichTextNode = reference.kind === "skill"
    ? { id: options.createId(), type: COMPOSER_SKILL_NODE, attrs: { skillId: reference.id, label: reference.label } }
    : { id: options.createId(), type: COMPOSER_MENTION_NODE, attrs: { entityId: reference.id, label: reference.label } };
  const prefix = reference.kind === "skill" ? "/" : "@";
  return editor.dispatch({
    type: "clipboard.paste",
    clipboard: {
      type: RICH_TEXT_CLIPBOARD_MIME,
      slice: { profile: COMPOSER_PROFILE_V1, content: [atom, { id: options.createId(), type: "text", text: " ", marks: [] }], openStart: 1, openEnd: 1 },
      text: `${prefix}${reference.label} `,
      html: `<span>${prefix}${reference.label}</span> `,
    },
  });
}

export function insertComposerText(editor: RichTextEditor, text: string): ComposerCommandResult { return editor.dispatch({ type: "text.insert", text }); }

export function composerText(document: RichTextDocument): string {
  const read = (nodes: ReadonlyArray<RichTextNode>): string => nodes.map((node) => {
    if (node.type === "text" && "text" in node) return node.text;
    if (node.type === COMPOSER_MENTION_NODE) return `@${referenceLabel(node)}`;
    if (node.type === COMPOSER_SKILL_NODE) return `/${referenceLabel(node)}`;
    return "content" in node && Array.isArray(node.content) ? read(node.content as ReadonlyArray<RichTextNode>) : "";
  }).join("");
  return read(document.content);
}

function referenceLabel(node: RichTextNode): string {
  const attrs = "attrs" in node && node.attrs !== null && typeof node.attrs === "object" && !Array.isArray(node.attrs)
    ? node.attrs as Readonly<Record<string, unknown>>
    : {};
  return typeof attrs.label === "string" ? attrs.label : "";
}

export function hasComposerContent(draft: ComposerDraft): boolean {
  return draft.attachments.length > 0 || draft.instruction.content.some((node) => "content" in node && Array.isArray(node.content) && node.content.length > 0);
}
