import { describe, expect, test } from "vitest";
import {
  createObjectEditor,
  type ObjectDocument,
} from "../src/index.js";

const initial: ObjectDocument = {
  objects: [
    { id: "a", label: "Alpha", x: 10, y: 10, width: 60, height: 40, color: "amber" },
    { id: "b", label: "Beta", x: 100, y: 20, width: 70, height: 50, color: "blue" },
    { id: "c", label: "Gamma", x: 210, y: 80, width: 80, height: 60, color: "green" },
  ],
};

describe("object editing selection family", () => {
  test("uses set transitions for click and host-resolved marquee candidates", () => {
    const editor = createObjectEditor(initial);
    editor.dispatch({ type: "selection.set", objectIds: ["b"], mode: "toggle" });
    editor.dispatch({ type: "selection.set", objectIds: ["b", "c"], mode: "add" });

    expect(editor.snapshot.selection).toEqual({
      kind: "explicit",
      keys: ["a", "b", "c"],
      primaryKey: "c",
    });
    expect(editor.snapshot.canUndo).toBe(false);
  });

  test("fills selection and restores value with its causal selection", () => {
    const editor = createObjectEditor(initial);
    editor.dispatch({ type: "selection.set", objectIds: ["a", "c"], mode: "replace" });
    const selectionBefore = editor.snapshot.selection;

    expect(editor.dispatch({ type: "selection.fill", color: "violet" }).ok).toBe(true);
    expect((editor.snapshot.value as ObjectDocument).objects.map((object) => object.color)).toEqual([
      "violet",
      "blue",
      "violet",
    ]);

    editor.dispatch({ type: "selection.set", objectIds: ["b"] });
    expect(editor.undo().ok).toBe(true);
    expect(editor.snapshot.value).toEqual(initial);
    expect(editor.snapshot.selection).toEqual(selectionBefore);
  });

  test("deletes selected objects and restores them selected", () => {
    const editor = createObjectEditor(initial);
    editor.dispatch({ type: "selection.set", objectIds: ["a", "c"] });
    expect(editor.dispatch({ type: "selection.remove" }).ok).toBe(true);
    expect((editor.snapshot.value as ObjectDocument).objects.map((object) => object.id)).toEqual(["b"]);

    expect(editor.undo().ok).toBe(true);
    expect(editor.selectedObjects.map((object) => object.id)).toEqual(["a", "c"]);
  });
});
