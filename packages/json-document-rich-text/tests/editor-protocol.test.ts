import { buildPointer, createJSONDocument, trackPointer, type JSONDocument, type JSONPatchOperation } from "@interactive-os/json-document";
import { createHistoryRuntime } from "@interactive-os/json-document-collaboration/history";
import { createDocumentEditor } from "@interactive-os/json-document-editing";
import { describe, expect, it } from "vitest";
import { createRichTextBlockFixture, createRichTextEditor, richTextSchemaV1, validateRichText, type RichTextDocument, type RichTextIntent } from "../src/index.js";

function rich(text = "hello"): RichTextDocument {
  return { profile: "urn:interactive-os:json-document:rich-text:1", id: "doc", type: "doc", content: [
    { id: "p", type: "paragraph", content: [{ id: "t", type: "text", text, marks: [] }] },
    { id: "q", type: "paragraph", content: [] },
  ] };
}
function selection(offset = 4) {
  const point = { kind: "text" as const, nodeId: "t", offset, affinity: "forward" as const };
  return { kind: "range" as const, ranges: [{ anchor: point, focus: point }], primaryIndex: 0 };
}

describe("Rich Text extension protocol", () => {
  it("repeats structural edit and undo after an optimized large-array snapshot", () => {
    const document = createJSONDocument(createRichTextBlockFixture(100));
    const point = { kind: "text" as const, nodeId: "block-text-50", offset: 1, affinity: "forward" as const };
    const editor = createRichTextEditor({ document, selection: { kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0 } });
    const initial = document.value;
    for (let index = 0; index < 3; index++) {
      expect(editor.dispatch({ type: "block.split" }).ok).toBe(true);
      expect(editor.undo().ok).toBe(true);
      expect(document.value).toEqual(initial);
    }
  });
  it("rejects descendant schema errors, invalid marks, ID provider collisions and custom cardinality", () => {
    const intents: RichTextIntent[] = [
      { type: "node.insert", point: { kind: "child", nodeId: "doc", offset: 1, affinity: "forward" },
        node: { id: "nested", type: "paragraph", content: [{ id: "wrong", type: "paragraph", content: [] }] } as unknown as Extract<RichTextIntent, { type: "node.insert" }>["node"] },
      { type: "mark.toggle", mark: { type: "link", attrs: { href: "javascript:alert(1)" } } },
      { type: "block.split" },
    ];
    for (const intent of intents) {
      const initial = rich();
      const document = createJSONDocument(initial);
      const editor = createRichTextEditor({ document, createId: () => "collision", selection: {
        ...selection(), ranges: [{ anchor: selection(1).ranges[0]!.anchor, focus: selection(intent.type === "mark.toggle" ? 4 : 1).ranges[0]!.focus }],
      } });
      expect(editor.dispatch(intent).ok, intent.type).toBe(false);
      expect(document.value).toEqual(initial);
      expect(editor.snapshot.canUndo).toBe(false);
    }
    const initial = rich();
    const document = createJSONDocument(initial);
    const schema = { ...richTextSchemaV1, nodes: { ...richTextSchemaV1.nodes,
      doc: { ...richTextSchemaV1.nodes.doc!, content: { ...richTextSchemaV1.nodes.doc!.content!, maximum: 2 } },
    } };
    const editor = createRichTextEditor({ document, schema });
    expect(editor.dispatch({ type: "node.insert", point: { kind: "child", nodeId: "doc", offset: 2, affinity: "forward" },
      node: { id: "extra", type: "paragraph", content: [] } }).ok).toBe(false);
    expect(document.value).toEqual(initial);
  });

  it("validates the source container when moving a node to another parent", () => {
    const initial: RichTextDocument = { ...rich(), content: [
      { id: "quote", type: "blockquote", content: [{ id: "p", type: "paragraph", content: [{ id: "t", type: "text", text: "hello", marks: [] }] }] },
      { id: "q", type: "paragraph", content: [] },
    ] };
    const document = createJSONDocument(initial);
    const editor = createRichTextEditor({ document });
    expect(editor.dispatch({ type: "node.move", nodeId: "p",
      point: { kind: "child", nodeId: "doc", offset: 2, affinity: "forward" } }).ok).toBe(false);
    expect(document.value).toEqual(initial);
  });

  it("keeps adjacent apply usable after a large structural edit", () => {
    const document = createJSONDocument({ instruction: createRichTextBlockFixture(64), attachments: [] });
    const editor = createRichTextEditor({ document, pointer: "/instruction" });
    expect(editor.dispatch({ type: "block.split" }).ok).toBe(true);
    expect(editor.apply([{ op: "add", path: "/attachments/0", value: "file" }]).ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    expect(document.at("/attachments")).toMatchObject({ ok: true, value: [] });
  });

  it("moves a selected block group repeatedly and round trips history", () => {
    const initial = { blocks: Array.from({ length: 64 }, (_, index) => ({ id: String(index), text: String(index) })) };
    const document = createJSONDocument(initial);
    const editor = createDocumentEditor(document);
    editor.dispatch({ type: "selection.set", blockId: "1" });
    editor.dispatch({ type: "selection.set", blockId: "2", mode: "extend" });
    expect(editor.dispatch({ type: "selection.move", direction: 1 }).ok).toBe(true);
    expect(editor.dispatch({ type: "selection.move", direction: 1 }).ok).toBe(true);
    expect((document.value as typeof initial).blocks.slice(0, 5).map((block) => block.id)).toEqual(["0", "3", "4", "1", "2"]);
    expect(editor.undo().ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    expect(document.value).toEqual(initial);
    expect(editor.redo().ok).toBe(true);
    expect(editor.redo().ok).toBe(true);
  });

  it("does not seed a stale topology after an unobserved structural change", () => {
    const document = createJSONDocument(rich());
    const editor = createRichTextEditor({ document, selection: selection() });
    expect(document.commit([{ op: "remove", path: "/content/1" }]).ok).toBe(true);
    expect(editor.dispatch({ type: "text.insert", text: "!" }).ok).toBe(true);
    expect(editor.topology.locate("q")).toBeNull();
    expect(editor.topology.locate("t")?.node).toMatchObject({ text: "hell!o" });
  });

  it.each(["plain", "a/b", "a~b", "01", ""])("edits exactly the bound subtree %j", (key) => {
    const pointer = buildPointer([key]);
    const wrongKey = pointer.slice(1);
    const initial = { [wrongKey]: rich("world"), [key]: rich() };
    const document = createJSONDocument(initial);
    const editor = createRichTextEditor({ document, pointer, selection: {
      ...selection(), ranges: [{ anchor: selection(1).ranges[0]!.anchor, focus: selection(4).ranges[0]!.focus }],
    } });
    expect(editor.dispatch({ type: "selection.remove" }).ok).toBe(true);
    expect(document.at(pointer + "/content/0/content/0/text")).toMatchObject({ ok: true, value: "ho" });
    if (wrongKey !== key) expect(document.at(buildPointer([wrongKey]))).toMatchObject({ ok: true, value: rich("world") });
    expect(editor.undo().ok).toBe(true);
    expect(document.value).toEqual(initial);
  });

  it.each([
    { type: "node.remove", nodeId: "p" },
    { type: "node.move", nodeId: "p", point: { kind: "child", nodeId: "q", offset: 0, affinity: "forward" } },
    { type: "node.insert", point: { kind: "child", nodeId: "doc", offset: 1, affinity: "forward" },
      node: { id: "new-p", type: "paragraph", content: [{ id: "t", type: "text", text: "duplicate", marks: [] }] } },
  ] satisfies RichTextIntent[])("rejects invalid structure atomically: $type", (intent) => {
    const initial = intent.type === "node.remove" ? { ...rich(), content: rich().content.slice(0, 1) } : rich();
    const document = createJSONDocument(initial);
    const editor = createRichTextEditor({ document, selection: selection() });
    const before = editor.snapshot;
    let notifications = 0;
    const unsubscribe = editor.subscribe(() => notifications++);
    expect(editor.dispatch(intent).ok).toBe(false);
    expect(document.value).toEqual(initial);
    expect(editor.snapshot).toEqual(before);
    expect(notifications).toBe(0);
    unsubscribe();
  });

  it("validates public apply without rejecting adjacent Composer fields", () => {
    const initial = { instruction: rich(), attachments: [] };
    const document = createJSONDocument(initial);
    const editor = createRichTextEditor({ document, pointer: "/instruction", selection: selection() });
    expect(editor.apply([{ op: "replace", path: "/instruction/content", value: [] }]).ok).toBe(false);
    expect(document.value).toEqual(initial);
    expect(editor.apply([{ op: "add", path: "/attachments/0", value: "file" }]).ok).toBe(true);
    expect(validateRichText(document.at("/instruction").ok && (document.value as typeof initial).instruction).ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    expect(document.value).toEqual(initial);
  });

  it.each([false, true])("reconciles external selection with lazy subscription (observed=%s)", (observed) => {
    const inner = createJSONDocument(rich());
    let active = 0;
    const document: JSONDocument = {
      ...inner,
      get value() { return inner.value; },
      subscribe(listener) {
        active++;
        const unsubscribe = inner.subscribe(listener);
        return () => { active--; unsubscribe(); };
      },
    };
    const editor = createRichTextEditor({ document, selection: selection() });
    const seen: number[] = [];
    const unsubscribe = observed ? editor.subscribe((snapshot) => seen.push(snapshot.selection.ranges[0]!.focus.offset)) : () => {};
    inner.commit([{ op: "replace", path: "/content/0/content/0/text", value: "a" }]);
    expect(editor.snapshot.selection).toEqual(selection(1));
    if (observed) expect(seen).toEqual([1]);
    expect(editor.dispatch({ type: "text.insert", text: "!" }).ok).toBe(true);
    expect(inner.at("/content/0/content/0/text")).toMatchObject({ ok: true, value: "a!" });
    unsubscribe();
    expect(active).toBe(0);
  });

  it.each(["document", "rich-text"] as const)("preserves a concurrent edit when %s moves a node", (domain) => {
    const initial = domain === "document" ? { blocks: [{ id: "a", text: "A" }, { id: "b", text: "B" }] } : rich();
    const shared = { epochId: "move-protocol", ruleset: { id: "test", digest: "1" } };
    const left = createHistoryRuntime(initial, { ...shared, actorId: "left" });
    const right = createHistoryRuntime(initial, { ...shared, actorId: "right" });
    const from = domain === "document" ? "/blocks/0/text" : "/content/0/content/0/text";
    const to = domain === "document" ? "/blocks/1/text" : "/content/1/content/0/text";
    expect(right.document.commit([{ op: "replace", path: from, value: "REMOTE" }]).ok).toBe(true);
    const moved = domain === "document"
      ? createDocumentEditor(left.document).dispatch({ type: "selection.move", direction: 1 })
      : createRichTextEditor({ document: left.document }).dispatch({
        type: "node.move", nodeId: "p", point: { kind: "child", nodeId: "doc", offset: 2, affinity: "forward" },
      });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.change?.applied.map((op) => op.op)).toEqual(["move"]);
    expect(moved.change?.applied[0]).toMatchObject({ from: domain === "document" ? "/blocks/0" : "/content/0" });
    expect(trackPointer(from, moved.change!.applied as JSONPatchOperation[], initial)).toBe(to);
    expect(left.replica.ingest(right.replica.exportBundle()).ok).toBe(true);
    expect(right.replica.ingest(left.replica.exportBundle()).ok).toBe(true);
    expect(left.document.value).toEqual(right.document.value);
    expect(left.document.at(to)).toMatchObject({ ok: true, value: "REMOTE" });
  });
});
