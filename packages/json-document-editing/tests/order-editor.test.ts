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
      ranges: [{ anchor: { itemId: "b" }, focus: { itemId: "d" } }],
      primaryIndex: 0,
    });
    expect(editor.dispatch({ type: "selection.remove" }).ok).toBe(true);
    expect((editor.snapshot.value as OrderDocument).items.map((item) => item.id)).toEqual(["a"]);

    expect(editor.undo().ok).toBe(true);
    expect(editor.snapshot.selection).toEqual(selectionBefore);
  });
});
