import type { JSONValue } from "@interactive-os/json-document";
import type { FileCandidate } from "@interactive-os/json-document-file-intake";
import type { RichTextDocument } from "@interactive-os/json-document-rich-text";
import { RICH_TEXT_MENTION_NODE, type RichTextMention } from "@interactive-os/json-document-rich-text-mention";

export const COMPOSER_PROFILE_V1 = "urn:interactive-os:json-document:composer:1" as const;
export const COMPOSER_MENTION_NODE = RICH_TEXT_MENTION_NODE;
export const COMPOSER_SKILL_NODE = "os.interactive/skill" as const;

export type ComposerReference =
  | ({ readonly kind: "mention" } & RichTextMention)
  | { readonly kind: "skill"; readonly id: string; readonly label: string };

export interface ComposerAttachment extends Record<string, JSONValue> {
  readonly id: string;
  readonly kind: "document" | "image";
  readonly name: string;
  readonly size: number;
  readonly mediaType: string | null;
}

export type ComposerAttachmentCandidate = FileCandidate;

export interface ComposerDraft<Model extends string = string> extends Record<string, JSONValue> {
  readonly id: string;
  readonly profile: typeof COMPOSER_PROFILE_V1;
  readonly instruction: RichTextDocument;
  readonly attachments: ReadonlyArray<ComposerAttachment>;
  readonly model: Model;
}

export interface ComposerTrigger {
  readonly kind: "mention" | "skill";
  readonly query: string;
  readonly range: { readonly nodeId: string; readonly from: number; readonly to: number };
}

export function createComposerDraft<Model extends string>(options: {
  readonly id: string;
  readonly instructionId: string;
  readonly paragraphId: string;
  readonly model: Model;
}): ComposerDraft<Model> {
  return {
    id: options.id,
    profile: COMPOSER_PROFILE_V1,
    instruction: { profile: COMPOSER_PROFILE_V1, id: options.instructionId, type: "doc", content: [{ id: options.paragraphId, type: "paragraph", content: [] }] },
    attachments: [],
    model: options.model,
  };
}
