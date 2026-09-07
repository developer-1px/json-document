import { createTextRuntime } from "@interactive-os/json-document-collaboration/text";
import { createCollaborationEditingHistory } from "@interactive-os/json-document-collaboration/editing";
import { describe, expect, test } from "vitest";
import { createRichTextEditor, type RichTextDocument, type RichTextPoint } from "../src/index.js";

const initial: RichTextDocument = {
  profile: "urn:interactive-os:json-document:rich-text:1", id: "doc", type: "doc",
  content: [{ id: "p", type: "paragraph", content: [{ id: "t", type: "text", text: "abcd", marks: [] }] }],
};

describe.each([true, false])("Rich Text selective history (observed: %s)", (observed) => {
  test("preserves concurrent text and restores positions through remote insertion", () => {
    const shared = { epochId: "rich-history", ruleset: { id: "rich-history", digest: "1" } };
    const local = createTextRuntime(initial, { ...shared, actorId: "local" });
    const remote = createTextRuntime(initial, { ...shared, actorId: "remote" });
    const point: RichTextPoint = { kind: "text", nodeId: "t", offset: 2, affinity: "forward" };
    const editor = createRichTextEditor({ document: local.document, history: createCollaborationEditingHistory(local), selection: {
      kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0,
    } });
    const release = observed ? editor.subscribe(() => {}) : () => {};
    expect(editor.dispatch({ type: "text.insert", text: "!" }).ok).toBe(true);
    expect(remote.document.commit([{ op: "replace", path: "/content/0/content/0/text", value: "Xabcd" }]).ok).toBe(true);
    expect(local.replica.ingest(remote.replica.exportBundle()).ok).toBe(true);
    expect(local.document.at("/content/0/content/0/text")).toMatchObject({ ok: true, value: "Xab!cd" });
    expect(editor.snapshot.selection.ranges[0]!.focus.offset).toBe(4);
    expect(editor.snapshot.canUndo).toBe(true);
    expect(editor.undo().ok).toBe(true);
    expect(local.document.at("/content/0/content/0/text")).toMatchObject({ ok: true, value: "Xabcd" });
    expect(editor.snapshot.selection.ranges[0]!.focus.offset).toBe(3);
    expect(editor.redo().ok).toBe(true);
    expect(local.document.at("/content/0/content/0/text")).toMatchObject({ ok: true, value: "Xab!cd" });
    expect(editor.snapshot.selection.ranges[0]!.focus.offset).toBe(4);
    release();
  });
});
