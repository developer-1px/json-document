import { describe, expect, test } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createRichTextEditor, type RichTextDocument, type RichTextSelection } from "@interactive-os/json-document-rich-text";
import {
  COMPOSER_MENTION_NODE,
  COMPOSER_HOST_PROFILE_V1,
  COMPOSER_PROFILE_V1,
  addComposerAttachments,
  composerHostConfigSchema,
  composerInteractionFromKeyStroke,
  composerSchema,
  composerText,
  createComposerDraft,
  createComposerAttachments,
  findComposerTrigger,
  hasComposerContent,
  insertComposerReference,
  removeComposerAttachment,
  selectComposerModel,
} from "../src/index.js";

const textDocument: RichTextDocument = {
  profile: COMPOSER_PROFILE_V1,
  id: "instruction",
  type: "doc",
  content: [{ id: "paragraph", type: "paragraph", content: [{ id: "text", type: "text", text: "Ask @al", marks: [] }] }],
};
const selection: RichTextSelection = {
  kind: "range",
  ranges: [{
    anchor: { kind: "text", nodeId: "text", offset: 7, affinity: "forward" },
    focus: { kind: "text", nodeId: "text", offset: 7, affinity: "forward" },
  }],
  primaryIndex: 0,
};

describe("Composer domain", () => {
  test("creates a profiled draft without product fixtures", () => {
    const draft = createComposerDraft({ id: "draft", instructionId: "instruction", paragraphId: "paragraph", model: "fast" });
    expect(draft).toMatchObject({ id: "draft", profile: COMPOSER_PROFILE_V1, model: "fast", attachments: [], instruction: { id: "instruction" } });
    expect(hasComposerContent(draft)).toBe(false);
  });

  test("validates mention and skill atoms in the Composer schema", () => {
    expect(composerSchema.nodes[COMPOSER_MENTION_NODE]?.atom).toBe(true);
    expect(composerSchema.nodes[COMPOSER_MENTION_NODE]?.attrs.entityId?.validate?.("alpha")).toBe(true);
    expect(composerSchema.nodes[COMPOSER_MENTION_NODE]?.attrs.entityId?.validate?.("")).toBe(false);
  });

  test("finds trigger boundaries from document and selection only", () => {
    expect(findComposerTrigger(textDocument, selection)).toEqual({ kind: "mention", query: "al", range: { nodeId: "text", from: 4, to: 7 } });
    expect(findComposerTrigger(textDocument, { ...selection, ranges: [{ ...selection.ranges[0]!, focus: { kind: "text", nodeId: "text", offset: 3, affinity: "forward" } }] })).toBeNull();
  });

  test("inserts a reference with injected IDs and projects text", () => {
    const ids = ["mention", "space"];
    const editor = createRichTextEditor({ document: createJSONDocument(textDocument), schema: composerSchema, selection });
    const trigger = findComposerTrigger(textDocument, selection)!;
    expect(insertComposerReference(editor, trigger, { kind: "mention", id: "alpha", label: "Alpha" }, { createId: () => ids.shift()! }).ok).toBe(true);
    expect(composerText(editor.snapshot.value as RichTextDocument)).toContain("@Alpha");
    expect(JSON.stringify(editor.snapshot.value)).toContain("\"entityId\":\"alpha\"");
    expect(editor.undo().ok).toBe(true);
  });

  test("publishes a serializable Host policy schema without runtime ports", () => {
    expect(composerHostConfigSchema.$id).toBe(COMPOSER_HOST_PROFILE_V1);
    expect(composerHostConfigSchema.required).toEqual(["profile", "models", "suggestions", "attachments", "interaction"]);
    expect("submit" in composerHostConfigSchema.properties).toBe(false);
    expect("createId" in composerHostConfigSchema.properties).toBe(false);
  });

  test("creates policy-validated attachments with injected IDs", () => {
    const result = createComposerAttachments(
      [{ name: "brief.png", size: 24, mediaType: "image/png" }],
      { createId: () => "attachment-1", policy: { acceptedMediaTypes: ["image/*"], maxFiles: 2, maxBytesPerFile: 100 } },
    );
    expect(result).toEqual({ ok: true, attachments: [{ id: "attachment-1", kind: "image", name: "brief.png", size: 24, mediaType: "image/png" }] });
    expect(createComposerAttachments(
      [{ name: "brief.pdf", size: 24, mediaType: "application/pdf" }],
      { createId: () => "attachment-2", policy: { acceptedMediaTypes: ["image/*"], maxFiles: 2, maxBytesPerFile: 100 } },
    )).toMatchObject({ ok: false, code: "composer.attachments.media-type" });
    expect(createComposerAttachments(
      [{ name: "", size: -1, mediaType: null }],
      { createId: () => "attachment-3", policy: { acceptedMediaTypes: ["*/*"], maxFiles: null, maxBytesPerFile: null } },
    )).toMatchObject({ ok: false, code: "composer.attachments.invalid" });
  });

  test("owns draft mutations as Composer commands", () => {
    const draft = createComposerDraft({ id: "draft", instructionId: "instruction", paragraphId: "paragraph", model: "fast" });
    const document = createJSONDocument(draft);
    const editor = createRichTextEditor({ document, pointer: "/instruction", schema: composerSchema });
    const attachment = { id: "attachment-1", kind: "document" as const, name: "brief.pdf", size: 24, mediaType: "application/pdf" };
    expect(addComposerAttachments(editor, draft, [attachment]).ok).toBe(true);
    expect((document.value as typeof draft).attachments).toEqual([attachment]);
    expect(selectComposerModel(editor, "quality").ok).toBe(true);
    expect((document.value as typeof draft).model).toBe("quality");
    expect(removeComposerAttachment(editor, document.value as typeof draft, attachment.id)?.ok).toBe(true);
    expect((document.value as typeof draft).attachments).toEqual([]);
  });

  test("resolves product-configured Composer interaction meaning", () => {
    const policy = { submit: "enter", newline: "shift-enter" } as const;
    expect(composerInteractionFromKeyStroke({ key: "Enter" }, policy)).toBe("submit");
    expect(composerInteractionFromKeyStroke({ key: "Enter", shiftKey: true }, policy)).toBe("newline");
    expect(composerInteractionFromKeyStroke({ key: "z", commandKey: true }, policy)).toBe("history.undo");
    expect(composerInteractionFromKeyStroke({ key: "z", commandKey: true, shiftKey: true }, policy)).toBe("history.redo");
    expect(composerInteractionFromKeyStroke({ key: "Escape" }, policy)).toBe("dismiss");
  });
});
