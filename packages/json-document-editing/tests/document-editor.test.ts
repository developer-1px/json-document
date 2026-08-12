import { describe, expect, test } from "vitest";
import { createDocumentEditor } from "../src/index.js";

describe("document editing vertical slice", () => {
  test("copies multiple blocks, edits, moves, and restores document with selection", () => {
    let id = 10;
    const editor = createDocumentEditor({
      blocks: [
        { id: "a", text: "Alpha" },
        { id: "b", text: "Beta" },
        { id: "c", text: "Gamma" },
      ],
    }, { createId: () => `n${id++}` });

    editor.dispatch({ type: "selection.set", blockId: "a" });
    editor.dispatch({ type: "selection.set", blockId: "b", mode: "toggle" });
    const clipboard = editor.copy();
    expect(clipboard?.text).toBe("Alpha\nBeta");

    expect(editor.dispatch({ type: "clipboard.paste", clipboard: clipboard!, afterId: "c" }).ok).toBe(true);
    expect(editor.selectedBlockIds).toEqual(["n10", "n11"]);
    expect(editor.dispatch({ type: "text.replace", blockId: "n10", text: "Alpha edited" }).ok).toBe(true);
    expect(editor.dispatch({ type: "selection.set", blockId: "n10" }).ok).toBe(true);
    expect(editor.dispatch({ type: "selection.set", blockId: "n11", mode: "toggle" }).ok).toBe(true);
    expect(editor.dispatch({ type: "selection.move", direction: -1 }).ok).toBe(true);

    expect((editor.snapshot.value as { blocks: Array<{ id: string }> }).blocks.map((block) => block.id)).toEqual(["a", "b", "n10", "n11", "c"]);
    expect(editor.undo().ok).toBe(true);
    expect(editor.selectedBlockIds).toEqual(["n10", "n11"]);
    expect(editor.undo().ok).toBe(true);
    expect(editor.selectedBlockIds).toEqual(["n10", "n11"]);
    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as { blocks: Array<{ id: string }> }).blocks.map((block) => block.id)).toEqual(["a", "b", "c"]);
    expect(editor.selectedBlockIds).toEqual(["a", "b"]);

    expect(editor.redo().ok).toBe(true);
    expect(editor.redo().ok).toBe(true);
    expect(editor.redo().ok).toBe(true);
    expect((editor.snapshot.value as { blocks: Array<{ id: string; text: string }> }).blocks.find((block) => block.id === "n10")?.text).toBe("Alpha edited");
  });

  test("coalesces consecutive text input into one history entry", () => {
    const editor = createDocumentEditor({ blocks: [{ id: "a", text: "" }] });
    editor.dispatch({ type: "text.replace", blockId: "a", text: "ㅎ" });
    editor.dispatch({ type: "text.replace", blockId: "a", text: "하" });
    editor.dispatch({ type: "text.replace", blockId: "a", text: "한" });

    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as { blocks: Array<{ text: string }> }).blocks[0]?.text).toBe("");
    expect(editor.snapshot.selection.ranges[0]?.focus.offset).toBe(0);
    expect(editor.snapshot.canUndo).toBe(false);
  });

  test("ends a text history group when selection changes", () => {
    const editor = createDocumentEditor({ blocks: [{ id: "a", text: "" }, { id: "b", text: "" }] });
    editor.dispatch({ type: "text.replace", blockId: "a", text: "first" });
    editor.dispatch({ type: "selection.set", blockId: "b" });
    editor.dispatch({ type: "selection.set", blockId: "a" });
    editor.dispatch({ type: "text.replace", blockId: "a", text: "second" });

    editor.undo();
    expect((editor.snapshot.value as { blocks: Array<{ text: string }> }).blocks[0]?.text).toBe("first");
    editor.undo();
    expect((editor.snapshot.value as { blocks: Array<{ text: string }> }).blocks[0]?.text).toBe("");
  });

  test("requires unique ids across every block in one clipboard transaction", () => {
    const ids = ["copy", "copy", "copy-2"];
    const editor = createDocumentEditor({ blocks: [{ id: "a", text: "A" }, { id: "b", text: "B" }] }, {
      createId: () => ids.shift() ?? "fallback",
    });
    editor.dispatch({ type: "selection.set", blockId: "a" });
    editor.dispatch({ type: "selection.set", blockId: "b", mode: "toggle" });
    const clipboard = editor.copy();

    expect(editor.dispatch({ type: "clipboard.paste", clipboard: clipboard! }).ok).toBe(true);
    expect((editor.snapshot.value as { blocks: Array<{ id: string }> }).blocks.map((block) => block.id)).toEqual(["a", "b", "copy", "copy-2"]);
  });

  test("supports range selection, insert, duplicate, cut, delete, and selection-restoring undo", () => {
    let id = 0;
    const editor = createDocumentEditor({
      blocks: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }],
    }, { createId: () => `new-${++id}` });

    editor.dispatch({ type: "selection.set", blockId: "a" });
    editor.dispatch({ type: "selection.set", blockId: "c", mode: "extend" });
    expect(editor.selectedBlockIds).toEqual(["a", "b", "c"]);

    editor.dispatch({ type: "selection.duplicate" });
    expect(editor.selectedBlockIds).toEqual(["new-1", "new-2", "new-3"]);
    const cut = editor.cut();
    expect(cut?.clipboard.text).toBe("A\nB\nC");
    expect((editor.snapshot.value as { blocks: unknown[] }).blocks).toHaveLength(3);
    editor.undo();
    expect(editor.selectedBlockIds).toEqual(["new-1", "new-2", "new-3"]);

    editor.dispatch({ type: "block.insert", afterId: "new-3", text: "Inserted" });
    expect(editor.selectedBlockIds).toEqual(["new-4"]);
    editor.dispatch({ type: "selection.remove" });
    expect((editor.snapshot.value as { blocks: Array<{ text: string }> }).blocks.some((block) => block.text === "Inserted")).toBe(false);
  });

  test("extends the primary range created by toggle selection", () => {
    const editor = createDocumentEditor({
      blocks: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
        { id: "c", text: "C" },
        { id: "d", text: "D" },
      ],
    });

    editor.dispatch({ type: "selection.set", blockId: "a" });
    editor.dispatch({ type: "selection.set", blockId: "c", mode: "toggle" });
    editor.dispatch({ type: "selection.set", blockId: "d", mode: "extend" });

    expect(editor.selectedBlockIds).toEqual(["a", "c", "d"]);
    expect(editor.snapshot.selection).toEqual({
      kind: "range",
      ranges: [
        {
          anchor: { blockId: "a", offset: 0 },
          focus: { blockId: "a", offset: 0 },
        },
        {
          anchor: { blockId: "c", offset: 0 },
          focus: { blockId: "d", offset: 0 },
        },
      ],
      primaryIndex: 1,
    });
    expect(editor.snapshot.canUndo).toBe(false);
  });
});
