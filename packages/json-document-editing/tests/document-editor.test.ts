import { describe, expect, test } from "vitest";
import { createDocumentEditor, documentSelectionFocus, type DocumentSelection } from "../src/index.js";

describe("document editing vertical slice", () => {
  test("moves, extends, and collapses offsets inside the same block without editing its contents", () => {
    const initial = { blocks: [{ id: "a", text: "Alpha" }] };
    const editor = createDocumentEditor(initial);
    const published: DocumentSelection[] = [];
    const release = editor.subscribe((snapshot) => published.push(snapshot.selection));
    const selection = (anchor: number, focus = anchor): DocumentSelection => ({
      kind: "range", primaryIndex: 0,
      ranges: [{ anchor: { blockId: "a", offset: anchor }, focus: { blockId: "a", offset: focus } }],
    });
    const steps = [
      { offset: 2, mode: "replace", expected: selection(2) },
      { offset: 4, mode: "extend", expected: selection(2, 4) },
      { offset: 1, mode: "extend", expected: selection(2, 1) },
      { offset: 3, mode: "replace", expected: selection(3) },
      { offset: 99, mode: "extend", expected: selection(3, 5) },
      { offset: -1, mode: "extend", expected: selection(3, 0) },
      { offset: 99, mode: "replace", expected: selection(5) },
      { offset: -1, mode: "replace", expected: selection(0) },
    ] as const;
    try {
      for (const { offset, mode, expected } of steps) {
        expect(editor.dispatch({ type: "selection.set", blockId: "a", offset, mode }))
          .toMatchObject({ ok: true, snapshot: { value: initial, selection: expected, canUndo: false, canRedo: false } });
        expect(editor.snapshot.selection).toEqual(expected);
        expect(editor.selectedBlockIds).toEqual(["a"]);
        expect(editor.copy()?.blocks).toEqual(initial.blocks);
        expect(published.at(-1)).toEqual(expected);
      }
      expect(published).toEqual(steps.map((step) => step.expected));
    } finally { release(); }
  });

  test("keeps block toggle independent of the selected offsets", () => {
    const editor = createDocumentEditor({ blocks: [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }] });
    editor.dispatch({ type: "selection.set", blockId: "a", offset: 2 });
    editor.dispatch({ type: "selection.set", blockId: "a", offset: 4, mode: "extend" });
    const original = editor.snapshot.selection;
    editor.dispatch({ type: "selection.set", blockId: "b", offset: 1, mode: "toggle" });
    expect(editor.selectedBlockIds).toEqual(["a", "b"]);
    editor.dispatch({ type: "selection.set", blockId: "b", offset: 3, mode: "toggle" });
    expect(editor.snapshot.selection).toEqual(original);
    expect(editor.selectedBlockIds).toEqual(["a"]);
    editor.dispatch({ type: "selection.set", blockId: "a", offset: 0, mode: "toggle" });
    expect(editor.selectedBlockIds).toEqual([]);
    expect(editor.snapshot.selection).toEqual({ kind: "range", ranges: [], primaryIndex: null });
  });

  test("restores offset ranges on undo and preserves redo through caret-only movement", () => {
    const initial = { blocks: [{ id: "a", text: "Alpha" }] };
    const editor = createDocumentEditor(initial);
    editor.dispatch({ type: "selection.set", blockId: "a", offset: 4 });
    editor.dispatch({ type: "selection.set", blockId: "a", offset: 1, mode: "extend" });
    const before = {
      value: initial,
      selection: { kind: "range", primaryIndex: 0, ranges: [{
        anchor: { blockId: "a", offset: 4 }, focus: { blockId: "a", offset: 1 },
      }] },
    };
    expect(editor.snapshot).toMatchObject(before);
    expect(editor.dispatch({ type: "text.replace", blockId: "a", text: "Alps", offset: 3 }).ok).toBe(true);
    const after = editor.snapshot;
    expect(editor.undo()).toMatchObject({ ok: true, snapshot: { ...before, canUndo: false, canRedo: true } });
    expect(editor.dispatch({ type: "selection.set", blockId: "a", offset: 2 }))
      .toMatchObject({ ok: true, snapshot: { value: initial, canUndo: false, canRedo: true } });
    expect(documentSelectionFocus(editor.snapshot.selection)?.offset).toBe(2);
    expect(editor.redo()).toMatchObject({ ok: true, snapshot: {
      value: after.value, selection: after.selection, canUndo: true, canRedo: false,
    } });
    expect(editor.undo()).toMatchObject({ ok: true, snapshot: { ...before, canUndo: false, canRedo: true } });
  });

  test("preserves group placement for every selection and direction up to six blocks", () => {
    for (let size = 1; size <= 6; size += 1) {
      for (let mask = 1; mask < 2 ** size; mask += 1) {
        for (const direction of [-1, 1] as const) {
          const initial = { blocks: Array.from({ length: size }, (_, index) => ({ id: String(index), text: String(index) })) };
          const editor = createDocumentEditor(initial);
          const selected = initial.blocks.filter((_, index) => mask & (1 << index));
          selected.forEach((block, index) => editor.dispatch({ type: "selection.set", blockId: block.id, mode: index === 0 ? "replace" : "toggle" }));
          const start = Number(selected[0]!.id);
          const end = Number(selected.at(-1)!.id);
          const context = `size=${size}, mask=${mask}, direction=${direction}`;
          const result = editor.dispatch({ type: "selection.move", direction });
          if ((direction < 0 && start === 0) || (direction > 0 && end === size - 1)) {
            expect(result, context).toMatchObject({ ok: false, code: "move.boundary" });
            expect(editor.snapshot.value, context).toEqual(initial);
            continue;
          }
          const expected = initial.blocks.filter((block) => !selected.includes(block));
          expected.splice(start + direction, 0, ...selected);
          expect(result.ok, context).toBe(true);
          if (!result.ok) throw new Error(result.code);
          expect(result.change?.applied.every((operation) => operation.op === "move"), context).toBe(true);
          expect(editor.snapshot.value, context).toEqual({ blocks: expected });
          expect(editor.undo().ok, context).toBe(true);
          expect(editor.snapshot.value, context).toEqual(initial);
          expect(editor.redo().ok, context).toBe(true);
          expect(editor.snapshot.value, context).toEqual({ blocks: expected });
        }
      }
    }
  });

  test("reads the primary Document focus through the public selector", () => {
    const empty = createDocumentEditor({ blocks: [] });
    expect(documentSelectionFocus(empty.snapshot.selection)).toBeNull();
    expect(documentSelectionFocus({
      kind: "range",
      ranges: [{
        anchor: { blockId: "a", offset: 0 },
        focus: { blockId: "a", offset: 3 },
      }],
      primaryIndex: 0,
    })).toEqual({ blockId: "a", offset: 3 });
  });

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
    const moved = editor.dispatch({ type: "selection.move", direction: -1 });
    expect(moved.ok).toBe(true);
    if (moved.ok) {
      expect(moved.change?.applied.some((operation) => operation.op === "replace" && operation.path === "/blocks")).toBe(false);
    }

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
