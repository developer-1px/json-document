import { describe, expect, test } from "vitest";
import {
  applyAffordance,
  dragAffordance,
  dropAffordance,
  escapeAffordance,
  historyAffordance,
  keyboardCommandFrom,
  pointerSelect,
  resolveAffordanceKey,
  selectOperationFrom,
  snapAffordance,
  treeAffordance,
  typeaheadAffordance,
} from "../src/index.js";

describe("pointerSelect", () => {
  test("maps conventional modifiers to replace, extend, and toggle", () => {
    expect(selectOperationFrom(pointerSelect({ shiftKey: false, metaKey: false, ctrlKey: false }))).toBe("replace");
    expect(selectOperationFrom(pointerSelect({ shiftKey: true, metaKey: false, ctrlKey: false }))).toBe("extend");
    expect(selectOperationFrom(pointerSelect({ shiftKey: false, metaKey: true, ctrlKey: false }))).toBe("toggle");
    expect(selectOperationFrom(pointerSelect({ shiftKey: false, metaKey: false, ctrlKey: true }))).toBe("toggle");
  });
});

describe("resolveAffordanceKey", () => {
  test("closes the conventional keymap without a host override", () => {
    expect(keyboardCommandFrom(resolveAffordanceKey({ key: "ArrowDown", shiftKey: false, metaKey: false, ctrlKey: false }))).toEqual({
      type: "move",
      direction: "down",
      operation: "replace",
    });
    expect(keyboardCommandFrom(resolveAffordanceKey({ key: "ArrowDown", shiftKey: true, metaKey: false, ctrlKey: false }))).toEqual({
      type: "move",
      direction: "down",
      operation: "extend",
    });
    expect(keyboardCommandFrom(resolveAffordanceKey({ key: "z", shiftKey: false, metaKey: true, ctrlKey: false }))).toEqual({ type: "undo" });
    expect(keyboardCommandFrom(resolveAffordanceKey({ key: "z", shiftKey: true, metaKey: true, ctrlKey: false }))).toEqual({ type: "redo" });
    expect(keyboardCommandFrom(resolveAffordanceKey({ key: "Delete", shiftKey: false, metaKey: false, ctrlKey: false }))).toEqual({ type: "delete" });
  });
});

describe("treeAffordance", () => {
  test("uses right to expand a collapsed parent and left to collapse an expanded parent", () => {
    expect(treeAffordance({ type: "move", direction: "right" }, { expanded: false, hasChildren: true }).hand).toEqual({
      type: "expand",
    });
    expect(treeAffordance({ type: "move", direction: "left" }, { expanded: true, hasChildren: true }).hand).toEqual({
      type: "collapse",
    });
    expect(treeAffordance({ type: "move", direction: "right" }, { expanded: true, hasChildren: true }).hand).toEqual({
      type: "move",
      direction: "right",
      operation: "replace",
    });
  });
});

describe("dragAffordance", () => {
  test("commits only when the pointer actually moved", () => {
    expect(dragAffordance({ x: 10, y: 20 }, { x: 14, y: 18 })).toEqual({
      hand: { type: "translate", dx: 4, dy: -2 },
      cursor: "grabbing",
      commit: true,
    });
    expect(dragAffordance({ x: 10, y: 20 }, { x: 10, y: 20 }).commit).toBe(false);
  });
});

describe("historyAffordance", () => {
  test("binds disabled to canUndo and canRedo", () => {
    expect(historyAffordance({ canUndo: false, canRedo: true }).hand).toEqual({
      type: "history",
      undo: { name: "undo", disabled: true },
      redo: { name: "redo", disabled: false },
    });
  });
});

describe("applyAffordance", () => {
  test("applies cursor and hand from the same result", () => {
    const cursors: string[] = [];
    const hands: string[] = [];
    applyAffordance(
      { hand: { type: "select", operation: "extend" }, cursor: "cell" },
      {
        cursor: (cursor) => cursors.push(cursor),
        hand: (hand) => hands.push(hand.type),
      },
    );
    expect(cursors).toEqual(["cell"]);
    expect(hands).toEqual(["select"]);
  });
});

describe("typeaheadAffordance", () => {
  test("jumps to the next name with the typed prefix", () => {
    expect(typeaheadAffordance({
      buffer: "",
      key: "A",
      elapsedMs: 0,
      names: ["Inbox", "Today", "Later"],
      from: "Inbox",
    }).hand).toEqual({ type: "typeahead", buffer: "A", name: null });
    expect(typeaheadAffordance({
      buffer: "",
      key: "T",
      elapsedMs: 0,
      names: ["Inbox", "Today", "Later"],
      from: "Inbox",
    }).hand).toEqual({ type: "typeahead", buffer: "T", name: "Today" });
  });
});

describe("snapAffordance", () => {
  test("snaps to the grid unless disabled", () => {
    expect(snapAffordance({ x: 47, y: 51 }, { grid: 8 }).hand).toEqual({ type: "translate", dx: 48, dy: 48 });
    expect(snapAffordance({ x: 47, y: 51 }, { grid: 8, disable: true }).hand).toEqual({ type: "translate", dx: 47, dy: 51 });
  });
});

describe("escapeAffordance", () => {
  test("cancels Escape and pointercancel", () => {
    expect(escapeAffordance({ key: "Escape" }).hand).toEqual({ type: "cancel" });
    expect(escapeAffordance({ type: "pointercancel" }).hand).toEqual({ type: "cancel" });
    expect(escapeAffordance({ key: "Enter" }).hand).toBeNull();
  });
});

describe("dropAffordance", () => {
  test("forbids a drop the host cannot accept", () => {
    expect(dropAffordance({ canDrop: false })).toEqual({ hand: null, cursor: "no-drop", commit: false });
    expect(dropAffordance({ canDrop: true }).hand).toEqual({ type: "move-drop" });
  });
});
