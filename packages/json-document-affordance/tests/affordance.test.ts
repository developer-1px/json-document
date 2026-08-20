import { describe, expect, test } from "vitest";
import {
  dragOffset,
  dragShouldCommit,
  historyAffordance,
  pointerSelect,
  resolveAffordanceKey,
  treeAffordance,
} from "../src/index.js";

describe("pointerSelect", () => {
  test("maps conventional modifiers to replace, extend, and toggle", () => {
    expect(pointerSelect({ shiftKey: false, metaKey: false, ctrlKey: false })).toBe("replace");
    expect(pointerSelect({ shiftKey: true, metaKey: false, ctrlKey: false })).toBe("extend");
    expect(pointerSelect({ shiftKey: false, metaKey: true, ctrlKey: false })).toBe("toggle");
    expect(pointerSelect({ shiftKey: false, metaKey: false, ctrlKey: true })).toBe("toggle");
  });
});

describe("resolveAffordanceKey", () => {
  test("closes the conventional keymap without a host override", () => {
    expect(resolveAffordanceKey({ key: "ArrowDown", shiftKey: false, metaKey: false, ctrlKey: false })).toEqual({
      type: "move",
      direction: "down",
      operation: "replace",
    });
    expect(resolveAffordanceKey({ key: "ArrowDown", shiftKey: true, metaKey: false, ctrlKey: false })).toEqual({
      type: "move",
      direction: "down",
      operation: "extend",
    });
    expect(resolveAffordanceKey({ key: "z", shiftKey: false, metaKey: true, ctrlKey: false })).toEqual({ type: "undo" });
    expect(resolveAffordanceKey({ key: "z", shiftKey: true, metaKey: true, ctrlKey: false })).toEqual({ type: "redo" });
    expect(resolveAffordanceKey({ key: "Delete", shiftKey: false, metaKey: false, ctrlKey: false })).toEqual({ type: "delete" });
  });
});

describe("treeAffordance", () => {
  test("uses right to expand a collapsed parent and left to collapse an expanded parent", () => {
    expect(treeAffordance({ type: "move", direction: "right" }, { expanded: false, hasChildren: true })).toEqual({
      type: "expand",
    });
    expect(treeAffordance({ type: "move", direction: "left" }, { expanded: true, hasChildren: true })).toEqual({
      type: "collapse",
    });
    expect(treeAffordance({ type: "move", direction: "right" }, { expanded: true, hasChildren: true })).toEqual({
      type: "move",
      direction: "right",
    });
    expect(treeAffordance({ type: "move", direction: "left" }, { expanded: false, hasChildren: true })).toEqual({
      type: "move",
      direction: "left",
    });
    expect(treeAffordance({ type: "move", direction: "down" }, { expanded: true, hasChildren: true })).toEqual({
      type: "move",
      direction: "down",
    });
  });
});

describe("dragOffset", () => {
  test("commits only when the pointer actually moved", () => {
    expect(dragOffset({ x: 10, y: 20 }, { x: 14, y: 18 })).toEqual({ dx: 4, dy: -2 });
    expect(dragShouldCommit({ dx: 0, dy: 0 })).toBe(false);
    expect(dragShouldCommit({ dx: 4, dy: -2 })).toBe(true);
  });
});

describe("historyAffordance", () => {
  test("binds disabled to canUndo and canRedo", () => {
    expect(historyAffordance({ canUndo: false, canRedo: true })).toEqual({
      undo: { name: "undo", disabled: true },
      redo: { name: "redo", disabled: false },
    });
  });
});
