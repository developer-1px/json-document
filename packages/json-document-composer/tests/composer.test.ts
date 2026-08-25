import { describe, expect, test } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createRichTextEditor, type RichTextDocument, type RichTextSelection } from "@interactive-os/json-document-rich-text";
import {
  COMPOSER_MENTION_NODE,
  COMPOSER_PROFILE_V1,
  composerSchema,
  composerText,
  createComposerDraft,
  findComposerTrigger,
  hasComposerContent,
  insertComposerReference,
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
});
