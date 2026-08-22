import { describe, expect, test } from "vitest";
import { createOrderEditor, type OrderDocument } from "../src/index.js";

const initial: OrderDocument = {
  items: [
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
    { id: "c", label: "Gamma" },
    { id: "d", label: "Delta" },
  ],
};

describe("ordered structural selection", () => {
  test("keeps logical focus on the next survivor, then previous, then null", () => {
    const next = createOrderEditor(initial);
    next.dispatch({ type: "selection.set", itemId: "b" });
    next.dispatch({ type: "selection.remove" });
    expect(next.snapshot.selection.ranges[0]?.focus.itemId).toBe("c");

    const previous = createOrderEditor(initial);
    previous.dispatch({ type: "selection.set", itemId: "d" });
    previous.dispatch({ type: "selection.remove" });
    expect(previous.snapshot.selection.ranges[0]?.focus.itemId).toBe("c");

    const empty = createOrderEditor(initial);
    empty.dispatch({ type: "selection.set", itemId: "a" });
    empty.dispatch({ type: "selection.set", itemId: "d", mode: "extend" });
    empty.dispatch({ type: "selection.remove" });
    expect(empty.snapshot.selection).toEqual({ kind: "range", ranges: [], primaryIndex: null });
  });

  test("selects ranges without text offsets and restores deletion selection", () => {
    const editor = createOrderEditor(initial);
    editor.dispatch({ type: "selection.set", itemId: "b" });
    editor.dispatch({ type: "selection.set", itemId: "d", mode: "extend" });
    const selectionBefore = editor.snapshot.selection;

    expect(editor.selectedItemIds).toEqual(["b", "c", "d"]);
    expect(selectionBefore).toEqual({
      kind: "range",
      ranges: [{ anchor: { itemId: "b" }, focus: { itemId: "d" } }],
      primaryIndex: 0,
    });
    expect(editor.dispatch({ type: "selection.remove" }).ok).toBe(true);
    expect((editor.snapshot.value as OrderDocument).items.map((item) => item.id)).toEqual(["a"]);
    expect(editor.snapshot.selection.ranges[0]?.focus.itemId).toBe("a");

    expect(editor.undo().ok).toBe(true);
    expect(editor.snapshot.selection).toEqual(selectionBefore);
  });

  test("copies, pastes, and cuts selected items with selection-restoring undo", () => {
    let sequence = 0;
    const editor = createOrderEditor(initial, { createId: () => `n${++sequence}` });
    editor.dispatch({ type: "selection.set", itemId: "b" });
    editor.dispatch({ type: "selection.set", itemId: "c", mode: "extend" });
    const clipboard = editor.copy();
    expect(clipboard?.text).toBe("Beta\nGamma");

    expect(editor.dispatch({ type: "clipboard.paste", clipboard: clipboard!, afterId: "d" }).ok).toBe(true);
    expect(editor.selectedItemIds).toEqual(["n1", "n2"]);
    expect((editor.snapshot.value as OrderDocument).items.map((item) => item.id)).toEqual([
      "a", "b", "c", "d", "n1", "n2",
    ]);

    const cut = editor.cut();
    expect(cut?.clipboard.text).toBe("Beta\nGamma");
    expect((editor.snapshot.value as OrderDocument).items.map((item) => item.id)).toEqual([
      "a", "b", "c", "d",
    ]);
    expect(editor.undo().ok).toBe(true);
    expect(editor.selectedItemIds).toEqual(["n1", "n2"]);
  });

  test("renames an item and preserves its selection through undo", () => {
    const editor = createOrderEditor(initial);
    editor.dispatch({ type: "selection.set", itemId: "b" });
    expect(editor.dispatch({ type: "item.rename", itemId: "b", label: "Bravo" }).ok).toBe(true);
    expect((editor.snapshot.value as OrderDocument).items[1]?.label).toBe("Bravo");
    expect(editor.selectedItemIds).toEqual(["b"]);
    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as OrderDocument).items[1]?.label).toBe("Beta");
    expect(editor.selectedItemIds).toEqual(["b"]);
  });
});
