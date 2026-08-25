import { createJSONDocument } from "@interactive-os/json-document";
import { createRichTextEditor, createRichTextSchema, type RichTextDocument } from "@interactive-os/json-document-rich-text";
import { describe, expect, test } from "vitest";
import { RICH_TEXT_MENTION_NODE, findRichTextMentionTrigger, insertRichTextMention, resolveRichTextMentionSuggestions, richTextMentionNodeSpec } from "../src/index.js";

const profile = "urn:example:mention-test:1";
const schema = createRichTextSchema({ profile, nodes: { [RICH_TEXT_MENTION_NODE]: richTextMentionNodeSpec } });

describe("Rich Text mention", () => {
  test("publishes a non-empty entity reference atom contract", () => {
    expect(richTextMentionNodeSpec).toMatchObject({ group: "inline", atom: true, content: null, allowedMarks: "none" });
    expect(richTextMentionNodeSpec.attrs.entityId?.validate("entity-1")).toBe(true);
    expect(richTextMentionNodeSpec.attrs.entityId?.validate("")).toBe(false);
  });

  test("owns the @ trigger and entity candidate resolution", () => {
    const document: RichTextDocument = { profile, id: "doc", type: "doc", content: [{ id: "p", type: "paragraph", content: [{ id: "text", type: "text", text: "Ask @re", marks: [] }] }] };
    const selection = { kind: "range" as const, ranges: [{ anchor: { kind: "text" as const, nodeId: "text", offset: 7, affinity: "forward" as const }, focus: { kind: "text" as const, nodeId: "text", offset: 7, affinity: "forward" as const } }], primaryIndex: 0 };
    const trigger = findRichTextMentionTrigger(document, selection);
    expect(trigger).toMatchObject({ trigger: "@", query: "re" });
    expect(resolveRichTextMentionSuggestions(trigger, [{ id: "research", label: "Research" }, { id: "review", label: "Review" }, { id: "meeting", label: "Meeting" }]).map((item) => item.id)).toEqual(["research", "review"]);
  });

  test("inserts the canonical mention atom with injected IDs", () => {
    const document: RichTextDocument = { profile, id: "doc", type: "doc", content: [{ id: "p", type: "paragraph", content: [{ id: "text", type: "text", text: "Ask @al", marks: [] }] }] };
    const editor = createRichTextEditor({ document: createJSONDocument(document), schema, selection: { kind: "range", ranges: [{ anchor: { kind: "text", nodeId: "text", offset: 7, affinity: "forward" }, focus: { kind: "text", nodeId: "text", offset: 7, affinity: "forward" } }], primaryIndex: 0 } });
    const ids = ["mention", "space"];
    expect(insertRichTextMention(editor, { nodeId: "text", from: 4, to: 7 }, { id: "alpha", label: "Alpha" }, { createId: () => ids.shift()! }).ok).toBe(true);
    expect(JSON.stringify(editor.snapshot.value)).toContain('"type":"os.interactive/mention"');
    expect(JSON.stringify(editor.snapshot.value)).toContain('"entityId":"alpha"');
  });
});
