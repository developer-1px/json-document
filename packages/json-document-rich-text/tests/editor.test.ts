import { createJSONDocument } from "@interactive-os/json-document";
import { describe, expect, it } from "vitest";
import {
  createRichTextEditor,
  renderRichText,
  type RichTextDocument,
  type RichTextRenderAdapter,
  type RichTextSelection,
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

describe("Rich Text vertical slice", () => {
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
