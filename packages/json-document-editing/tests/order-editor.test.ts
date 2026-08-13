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
});
