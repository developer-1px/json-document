import {
  RICH_TEXT_CLIPBOARD_MIME,
  type RichTextDocument,
  type RichTextEditor,
  type RichTextNode,
  type RichTextPoint,
} from "@interactive-os/json-document-rich-text";
import { validateFileCandidates } from "@interactive-os/json-document-file-intake";
import { insertRichTextMention } from "@interactive-os/json-document-rich-text-mention";
import { COMPOSER_MENTION_NODE, COMPOSER_PROFILE_V1, COMPOSER_SKILL_NODE, type ComposerAttachment, type ComposerAttachmentCandidate, type ComposerDraft, type ComposerReference, type ComposerTrigger } from "./model.js";
import type { ComposerAttachmentPolicy } from "./host-config.js";

export type ComposerCommandResult = ReturnType<RichTextEditor["dispatch"]>;
export type ComposerDraftCommandResult = ReturnType<RichTextEditor["apply"]>;

export type ComposerAttachmentResult =
  | { readonly ok: true; readonly attachments: ReadonlyArray<ComposerAttachment> }
  | { readonly ok: false; readonly code: "composer.attachments.invalid" | "composer.attachments.limit" | "composer.attachments.media-type" | "composer.attachments.size"; readonly candidate: ComposerAttachmentCandidate };

export function createComposerAttachments(
  candidates: ReadonlyArray<ComposerAttachmentCandidate>,
  options: { readonly createId: () => string; readonly policy: ComposerAttachmentPolicy; readonly currentCount?: number },
): ComposerAttachmentResult {
  const validated = validateFileCandidates(candidates, options.policy, options.currentCount === undefined ? {} : { currentCount: options.currentCount });
  if (!validated.ok) return { ok: false, code: composerAttachmentError(validated.code), candidate: validated.candidate };
  const attachments: ComposerAttachment[] = validated.candidates.map((candidate) => ({ id: options.createId(), kind: candidate.mediaType?.startsWith("image/") ? "image" : "document", ...candidate }));
  return { ok: true, attachments };
}

export function addComposerAttachments(editor: RichTextEditor, draft: ComposerDraft, attachments: ReadonlyArray<ComposerAttachment>): ComposerDraftCommandResult {
  return editor.apply(attachments.map((value, index) => ({ op: "add" as const, path: `/attachments/${draft.attachments.length + index}`, value })), { origin: "composer.attachments.add" });
}

export function removeComposerAttachment(editor: RichTextEditor, draft: ComposerDraft, attachmentId: string): ComposerDraftCommandResult | null {
  const index = draft.attachments.findIndex((attachment) => attachment.id === attachmentId);
  return index < 0 ? null : editor.apply([{ op: "remove", path: `/attachments/${index}` }], { origin: "composer.attachments.remove" });
}

export function selectComposerModel<Model extends string>(editor: RichTextEditor, model: Model): ComposerDraftCommandResult {
  return editor.apply([{ op: "replace", path: "/model", value: model }], { origin: "composer.model.select" });
}

export function insertComposerReference(editor: RichTextEditor, trigger: ComposerTrigger, reference: ComposerReference, options: { readonly createId: () => string }): ComposerCommandResult {
  if (reference.kind === "mention") return insertRichTextMention(editor, trigger.range, reference, options);
  const anchor: RichTextPoint = { kind: "text", nodeId: trigger.range.nodeId, offset: trigger.range.from, affinity: "forward" };
  const focus: RichTextPoint = { kind: "text", nodeId: trigger.range.nodeId, offset: trigger.range.to, affinity: "forward" };
  const selected = editor.dispatch({ type: "selection.set", selection: { kind: "range", ranges: [{ anchor, focus }], primaryIndex: 0 } });
  if (!selected.ok) return selected;
  const atom: RichTextNode = { id: options.createId(), type: COMPOSER_SKILL_NODE, attrs: { skillId: reference.id, label: reference.label } };
  const prefix = "/";
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

function composerAttachmentError(code: "file-intake.invalid" | "file-intake.limit" | "file-intake.media-type" | "file-intake.size"): "composer.attachments.invalid" | "composer.attachments.limit" | "composer.attachments.media-type" | "composer.attachments.size" {
  return `composer.attachments.${code.slice("file-intake.".length)}` as "composer.attachments.invalid" | "composer.attachments.limit" | "composer.attachments.media-type" | "composer.attachments.size";
}
