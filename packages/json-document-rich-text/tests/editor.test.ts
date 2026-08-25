import { createJSONDocument } from "@interactive-os/json-document";
import { describe, expect, it } from "vitest";
import {
  createRichTextEditor,
  renderRichText,
  type RichTextDocument,
  type RichTextMark,
  type RichTextNode,
  type RichTextParagraph,
  type RichTextRenderAdapter,
  type RichTextSelection,
  type RichTextText,
} from "../src/index.js";

const initial: RichTextDocument = {
  profile: "urn:interactive-os:json-document:rich-text:1",
  id: "document-1",
  type: "doc",
  content: [
    {
      id: "heading-1",
      type: "heading",
      attrs: { level: 2 },
      content: [{ id: "text-1", type: "text", text: "Rich", marks: [{ type: "strong" }] }],
    },
    {
      id: "paragraph-1",
      type: "paragraph",
      content: [{ id: "text-2", type: "text", text: "Text", marks: [] }],
    },
  ],
};

describe("Official Rich Text editor", () => {
  it("uses a child boundary for an empty first block and splits at both text boundaries canonically", () => {
    const empty = createJSONDocument({
      profile: "urn:interactive-os:json-document:rich-text:1",
      id: "empty-doc",
      type: "doc",
      content: [{ id: "empty-p", type: "paragraph", content: [] }],
    });
    expect(createRichTextEditor({ document: empty }).snapshot.selection.ranges[0]?.anchor).toEqual({
      kind: "child", nodeId: "empty-p", offset: 0, affinity: "forward",
    });

    const document = createJSONDocument(initial);
    const editor = createRichTextEditor({ document, selection: collapsed("text-2", 0), createId: ids() });
    expect(editor.dispatch({ type: "block.split" }).ok).toBe(true);
    expect((document.value as RichTextDocument).content.slice(-2)).toMatchObject([
      { id: "paragraph-1", content: [] },
      { type: "paragraph", content: [{ text: "Text" }] },
    ]);
    const right = (document.value as RichTextDocument).content.at(-1)!;
    const rightText = (right as RichTextParagraph).content[0];
    expect(rightText).toBeDefined();
    editor.dispatch({ type: "selection.set", selection: collapsed(rightText!.id, (rightText as RichTextText).text.length) });
    expect(editor.dispatch({ type: "block.split" }).ok).toBe(true);
    expect((document.value as RichTextDocument).content.at(-1)).toMatchObject({ type: "paragraph", content: [] });
    expect(editor.snapshot.selection.ranges[0]?.anchor).toMatchObject({ kind: "child", offset: 0 });
  });
  it("commits text through EditingSession and restores value with selection", () => {
    const document = createJSONDocument(initial);
    const selection = collapsed("text-2", 4);
    const editor = createRichTextEditor({ document, selection });

    const edited = editor.dispatch({ type: "text.insert", text: " works" });
    expect(edited.ok).toBe(true);
    expect((document.value as RichTextDocument).content[1]).toMatchObject({
      content: [{ text: "Text works" }],
    });
    expect(editor.snapshot.selection.ranges[0]?.focus).toMatchObject({ nodeId: "text-2", offset: 10 });
    expect(editor.snapshot.canUndo).toBe(true);

    expect(editor.undo().ok).toBe(true);
    expect((document.value as RichTextDocument).content[1]).toMatchObject({
      content: [{ text: "Text" }],
    });
    expect(editor.snapshot.selection).toEqual(selection);

    expect(editor.redo().ok).toBe(true);
    expect((document.value as RichTextDocument).content[1]).toMatchObject({
      content: [{ text: "Text works" }],
    });
  });

  it("uses logical topology instead of a rendered DOM order", () => {
    const editor = createRichTextEditor({
      document: createJSONDocument(initial),
      selection: {
        kind: "range",
        ranges: [{
          anchor: { kind: "text", nodeId: "text-1", offset: 2, affinity: "forward" },
          focus: { kind: "text", nodeId: "text-2", offset: 2, affinity: "forward" },
        }],
        primaryIndex: 0,
      },
    });

    expect(editor.topology.interval(
      editor.snapshot.selection.ranges[0]!.anchor,
      editor.snapshot.selection.ranges[0]!.focus,
    )).toEqual([
      { kind: "text", nodeId: "text-1", from: 2, to: 4 },
      { kind: "text", nodeId: "text-2", from: 0, to: 2 },
    ]);
  });

  it("deletes a Unicode scalar and undo restores the original caret", () => {
    const document = createJSONDocument(initial);
    const selection = collapsed("text-2", 4);
    const editor = createRichTextEditor({ document, selection });

    expect(editor.dispatch({ type: "text.delete", direction: "backward", unit: "character" }).ok).toBe(true);
    expect((document.value as RichTextDocument).content[1]).toMatchObject({ content: [{ text: "Tex" }] });
    expect(editor.snapshot.selection.ranges[0]?.focus).toMatchObject({ offset: 3 });

    expect(editor.undo().ok).toBe(true);
    expect(editor.snapshot.selection).toEqual(selection);
  });

  it("deletes an adjacent inline atom from a text boundary in both directions", () => {
    const backwardDocument = createJSONDocument({
      profile: "urn:interactive-os:json-document:rich-text:1",
      id: "backward-atom-doc",
      type: "doc",
      content: [{
        id: "backward-paragraph",
        type: "paragraph",
        content: [
          { id: "backward-text-a", type: "text", text: "A", marks: [] },
          { id: "backward-atom", type: "hardBreak" },
          { id: "backward-text-b", type: "text", text: "B", marks: [] },
        ],
      }],
    } satisfies RichTextDocument);
    const backwardEditor = createRichTextEditor({ document: backwardDocument, selection: collapsed("backward-text-b", 0) });

    expect(backwardEditor.dispatch({ type: "text.delete", direction: "backward", unit: "character" }).ok).toBe(true);
    expect((backwardDocument.value as RichTextDocument).content[0]).toMatchObject({
      content: [{ id: "backward-text-a", text: "AB" }],
    });
    expect(backwardEditor.snapshot.selection.ranges[0]?.focus).toMatchObject({ offset: 1 });
    expect(backwardEditor.undo().ok).toBe(true);
    expect((backwardDocument.value as RichTextDocument).content[0]).toMatchObject({
      content: [{ id: "backward-text-a" }, { id: "backward-atom" }, { id: "backward-text-b" }],
    });

    const forwardDocument = createJSONDocument({
      profile: "urn:interactive-os:json-document:rich-text:1",
      id: "forward-atom-doc",
      type: "doc",
      content: [{
        id: "forward-paragraph",
        type: "paragraph",
        content: [
          { id: "forward-text-a", type: "text", text: "A", marks: [] },
          { id: "forward-atom", type: "hardBreak" },
          { id: "forward-text-b", type: "text", text: "B", marks: [] },
        ],
      }],
    } satisfies RichTextDocument);
    const forwardEditor = createRichTextEditor({ document: forwardDocument, selection: collapsed("forward-text-a", 1) });

    expect(forwardEditor.dispatch({ type: "text.delete", direction: "forward", unit: "character" }).ok).toBe(true);
    expect((forwardDocument.value as RichTextDocument).content[0]).toMatchObject({
      content: [{ id: "forward-text-a", text: "AB" }],
    });
    expect(forwardEditor.snapshot.selection.ranges[0]?.focus).toMatchObject({ offset: 1 });
    expect(forwardEditor.undo().ok).toBe(true);
    expect((forwardDocument.value as RichTextDocument).content[0]).toMatchObject({
      content: [{ id: "forward-text-a" }, { id: "forward-atom" }, { id: "forward-text-b" }],
    });
  });

  it("renders the canonical tree through a target-neutral adapter", () => {
    const adapter: RichTextRenderAdapter<string> = {
      document: (_node, children) => `<article>${children.join("")}</article>`,
      text: (node) => node.text,
      node: (node, children) => `<${node.type}>${children.join("")}</${node.type}>`,
      mark: (mark, children) => `<${mark.type}>${children.join("")}</${mark.type}>`,
      unknown: () => "?",
    };

    expect(renderRichText(initial, adapter).output).toBe(
      "<article><heading><strong>Rich</strong></heading><paragraph>Text</paragraph></article>",
    );
  });

  it("splits a block at Enter and restores the caret with undo", () => {
    const document = createJSONDocument(initial);
    let id = 0;
    const editor = createRichTextEditor({ document, selection: collapsed("text-2", 2), createId: () => `new-${++id}` });

    expect(editor.dispatch({ type: "block.split" }).ok).toBe(true);
    expect((document.value as RichTextDocument).content).toMatchObject([
      { type: "heading" },
      { id: "paragraph-1", type: "paragraph", content: [{ id: "text-2", text: "Te" }] },
      { id: "new-2", type: "paragraph", content: [{ id: "new-1", text: "xt" }] },
    ]);
    expect(editor.snapshot.selection.ranges[0]?.focus).toMatchObject({ nodeId: "new-1", offset: 0 });
    expect(editor.dispatch({ type: "text.delete", direction: "backward", unit: "character" }).ok).toBe(true);
    expect((document.value as RichTextDocument).content).toMatchObject([
      { type: "heading" },
      { id: "paragraph-1", type: "paragraph", content: [{ id: "text-2", text: "Text" }] },
    ]);
    expect(editor.undo().ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    expect(editor.snapshot.selection).toEqual(collapsed("text-2", 2));
  });

  it("splits empty blocks and joins schema-compatible heading/paragraph and code blocks", () => {
    const document = createJSONDocument({
      profile: "urn:interactive-os:json-document:rich-text:1",
      id: "join-doc",
      type: "doc",
      content: [
        { id: "h", type: "heading", attrs: { level: 2 }, content: [{ id: "ht", type: "text", text: "A", marks: [] }] },
        { id: "p", type: "paragraph", content: [{ id: "pt", type: "text", text: "B", marks: [] }] },
        { id: "code-a", type: "codeBlock", attrs: { language: "ts" }, content: [{ id: "ca", type: "text", text: "x", marks: [] }] },
        { id: "code-b", type: "codeBlock", attrs: { language: "ts" }, content: [{ id: "cb", type: "text", text: "y", marks: [] }] },
      ],
    });
    const editor = createRichTextEditor({ document, selection: collapsed("pt", 0), createId: ids() });
    expect(editor.dispatch({ type: "block.join", direction: "backward" }).ok).toBe(true);
    expect((document.value as RichTextDocument).content[0]).toMatchObject({ type: "heading", content: [{ text: "AB" }] });
    editor.dispatch({ type: "selection.set", selection: collapsed("cb", 0) });
    expect(editor.dispatch({ type: "block.join", direction: "backward" }).ok).toBe(true);
    expect((document.value as RichTextDocument).content.at(-1)).toMatchObject({ type: "codeBlock", content: [{ text: "xy" }] });

    const empty = createJSONDocument({ profile: "urn:interactive-os:json-document:rich-text:1", id: "d", type: "doc", content: [{ id: "p", type: "paragraph", content: [] }] });
    const emptyEditor = createRichTextEditor({ document: empty, createId: ids() });
    expect(emptyEditor.dispatch({ type: "block.split" }).ok).toBe(true);
    expect((empty.value as RichTextDocument).content).toHaveLength(2);
  });

  it("repeatedly joins empty child-point blocks in both deletion directions", () => {
    const backwardDocument = createJSONDocument({
      profile: "urn:interactive-os:json-document:rich-text:1",
      id: "backward-doc",
      type: "doc",
      content: [
        { id: "backward-text-block", type: "paragraph", content: [{ id: "backward-text", type: "text", text: "A", marks: [] }] },
        { id: "backward-empty-a", type: "paragraph", content: [] },
        { id: "backward-empty-b", type: "paragraph", content: [] },
      ],
    } satisfies RichTextDocument);
    const backwardEditor = createRichTextEditor({
      document: backwardDocument,
      selection: childCollapsed("backward-empty-b", 0),
    });

    expect(backwardEditor.dispatch({ type: "text.delete", direction: "backward", unit: "character" }).ok).toBe(true);
    expect((backwardDocument.value as RichTextDocument).content).toHaveLength(2);
    expect(backwardEditor.snapshot.selection.ranges[0]?.focus).toMatchObject({ kind: "child", nodeId: "backward-empty-a", offset: 0 });
    expect(backwardEditor.dispatch({ type: "text.delete", direction: "backward", unit: "character" }).ok).toBe(true);
    expect((backwardDocument.value as RichTextDocument).content).toMatchObject([
      { id: "backward-text-block", content: [{ id: "backward-text", text: "A" }] },
    ]);

    const forwardDocument = createJSONDocument({
      profile: "urn:interactive-os:json-document:rich-text:1",
      id: "forward-doc",
      type: "doc",
      content: [
        { id: "forward-empty-a", type: "paragraph", content: [] },
        { id: "forward-empty-b", type: "paragraph", content: [] },
        { id: "forward-text-block", type: "paragraph", content: [{ id: "forward-text", type: "text", text: "B", marks: [] }] },
      ],
    } satisfies RichTextDocument);
    const forwardEditor = createRichTextEditor({
      document: forwardDocument,
      selection: childCollapsed("forward-empty-a", 0),
    });

    expect(forwardEditor.dispatch({ type: "text.delete", direction: "forward", unit: "character" }).ok).toBe(true);
    expect((forwardDocument.value as RichTextDocument).content).toHaveLength(2);
    expect(forwardEditor.dispatch({ type: "text.delete", direction: "forward", unit: "character" }).ok).toBe(true);
    expect((forwardDocument.value as RichTextDocument).content).toMatchObject([
      { id: "forward-empty-a", content: [{ id: "forward-text", text: "B" }] },
    ]);
  });

  it("groups one IME composition and preserves structured marks through clipboard paste", () => {
    const document = createJSONDocument(initial);
    let id = 0;
    const editor = createRichTextEditor({ document, selection: collapsed("text-2", 4), createId: () => `new-${++id}` });
    expect(editor.dispatch({ type: "text.insert", text: "한", historyGroup: "composition:1" }).ok).toBe(true);
    expect(editor.dispatch({ type: "text.insert", text: "글", historyGroup: "composition:1" }).ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    expect((document.value as RichTextDocument).content[1]).toMatchObject({ content: [{ text: "Text" }] });

    expect(editor.dispatch({ type: "selection.set", selection: {
      kind: "range",
      ranges: [{
        anchor: { kind: "text", nodeId: "text-1", offset: 0, affinity: "forward" },
        focus: { kind: "text", nodeId: "text-1", offset: 4, affinity: "forward" },
      }],
      primaryIndex: 0,
    } }).ok).toBe(true);
    const clipboard = editor.copy();
    expect(clipboard).toMatchObject({ text: "Rich", slice: { openStart: 1, openEnd: 1 } });
    expect(editor.dispatch({ type: "selection.set", selection: collapsed("text-2", 4) }).ok).toBe(true);
    expect(editor.dispatch({ type: "clipboard.paste", clipboard: clipboard! }).ok).toBe(true);
    expect((document.value as RichTextDocument).content[1]).toMatchObject({
      content: [
        { id: "text-2", text: "Text", marks: [] },
        { text: "Rich", marks: [{ type: "strong" }] },
      ],
    });
  });

  it("supports multi-range insertion and cross-node selection removal", () => {
    const document = createJSONDocument(initial);
    const editor = createRichTextEditor({
      document,
      selection: {
        kind: "range",
        ranges: [
          { anchor: point("text-1", 1), focus: point("text-1", 3) },
          { anchor: point("text-2", 1), focus: point("text-2", 3) },
        ],
        primaryIndex: 1,
      },
      createId: ids(),
    });
    expect(editor.dispatch({ type: "text.insert", text: "X" }).ok).toBe(true);
    expect(textById(document.value as RichTextDocument, "text-1")?.text).toBe("RXh");
    expect(textById(document.value as RichTextDocument, "text-2")?.text).toBe("TXt");
    expect(editor.snapshot.selection.ranges).toHaveLength(2);

    expect(editor.dispatch({ type: "selection.set", selection: {
      kind: "range",
      ranges: [{ anchor: point("text-1", 1), focus: point("text-2", 2) }],
      primaryIndex: 0,
    } }).ok).toBe(true);
    expect(editor.dispatch({ type: "selection.remove" }).ok).toBe(true);
    expect(textById(document.value as RichTextDocument, "text-1")?.text).toBe("R");
    expect(textById(document.value as RichTextDocument, "text-2")?.text).toBe("t");
  });

  it("toggles marks across text nodes and changes block type without losing identity", () => {
    const document = createJSONDocument(initial);
    const editor = createRichTextEditor({
      document,
      selection: {
        kind: "range",
        ranges: [{ anchor: point("text-1", 1), focus: point("text-2", 2) }],
        primaryIndex: 0,
      },
      createId: ids(),
    });
    expect(editor.dispatch({ type: "mark.toggle", mark: { type: "underline" } }).ok).toBe(true);
    const marked = allTexts(document.value as RichTextDocument).filter((node) => node.marks.some((mark: RichTextMark) => mark.type === "underline"));
    expect(marked.map((node) => node.text).join("")).toBe("ichTe");

    expect(editor.dispatch({ type: "block.set-type", nodeType: "heading", attrs: { level: 3 } }).ok).toBe(true);
    expect((document.value as RichTextDocument).content).toMatchObject([
      { id: "heading-1", type: "heading", attrs: { level: 3 } },
      { id: "paragraph-1", type: "heading", attrs: { level: 3 } },
    ]);
  });

  it("inserts, moves, removes, and updates nodes through schema-aware intents", () => {
    const document = createJSONDocument(initial);
    const editor = createRichTextEditor({ document, selection: collapsed("text-2", 2), createId: ids() });
    expect(editor.dispatch({
      type: "node.insert",
      point: { kind: "child", nodeId: "paragraph-1", offset: 1, affinity: "forward" },
      node: { id: "break-1", type: "hardBreak" },
    }).ok).toBe(true);
    expect((document.value as RichTextDocument).content[1]).toMatchObject({ content: [{ id: "text-2" }, { id: "break-1" }] });

    expect(editor.dispatch({ type: "node.move", nodeId: "paragraph-1", point: { kind: "child", nodeId: "document-1", offset: 0, affinity: "forward" } }).ok).toBe(true);
    expect((document.value as RichTextDocument).content[0]).toMatchObject({ id: "paragraph-1" });
    expect(editor.dispatch({ type: "node.remove", nodeId: "break-1" }).ok).toBe(true);
    expect(textById(document.value as RichTextDocument, "text-2")).not.toBeNull();
    expect(editor.dispatch({ type: "node.set-attrs", nodeId: "heading-1", attrs: { level: 4 } }).ok).toBe(true);
    expect((document.value as RichTextDocument).content[1]).toMatchObject({ id: "heading-1", attrs: { level: 4 } });
  });

  it("copies a cross-node range and pastes every range with fresh IDs", () => {
    const document = createJSONDocument(initial);
    const editor = createRichTextEditor({
      document,
      selection: { kind: "range", ranges: [{ anchor: point("text-1", 1), focus: point("text-2", 2) }], primaryIndex: 0 },
      createId: ids(),
    });
    const clipboard = editor.copy();
    expect(clipboard).toMatchObject({ text: "ich\nTe", slice: { openStart: 0, openEnd: 0 } });
    expect(editor.dispatch({ type: "selection.set", selection: {
      kind: "range",
      ranges: [
        { anchor: point("text-1", 4), focus: point("text-1", 4) },
        { anchor: point("text-2", 4), focus: point("text-2", 4) },
      ],
      primaryIndex: 0,
    } }).ok).toBe(true);
    expect(editor.dispatch({ type: "clipboard.paste", clipboard: clipboard! }).ok).toBe(true);
    const idsAfter = allNodes(document.value as RichTextDocument).map((node) => node.id);
    expect(new Set(idsAfter).size).toBe(idsAfter.length);
  });
});

function collapsed(nodeId: string, offset: number): RichTextSelection {
  return {
    kind: "range",
    ranges: [{
      anchor: { kind: "text", nodeId, offset, affinity: "forward" },
      focus: { kind: "text", nodeId, offset, affinity: "forward" },
    }],
    primaryIndex: 0,
  };
}

function childCollapsed(nodeId: string, offset: number): RichTextSelection {
  const point = { kind: "child" as const, nodeId, offset, affinity: "forward" as const };
  return { kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0 };
}

function point(nodeId: string, offset: number) {
  return { kind: "text" as const, nodeId, offset, affinity: "forward" as const };
}

function ids(): () => string {
  let sequence = 0;
  return () => `generated-${++sequence}`;
}

function allNodes(document: RichTextDocument): Array<RichTextDocument | RichTextNode> {
  const output: Array<RichTextDocument | RichTextNode> = [];
  const visit = (node: RichTextDocument | RichTextNode) => {
    output.push(node);
    if ("content" in node && Array.isArray(node.content)) node.content.forEach((child) => visit(child as RichTextNode));
  };
  visit(document);
  return output;
}

function allTexts(document: RichTextDocument): RichTextText[] {
  return allNodes(document).filter((node): node is RichTextText => node.type === "text");
}

function textById(document: RichTextDocument, id: string): RichTextText | null {
  return allTexts(document).find((node) => node.id === id) ?? null;
}
