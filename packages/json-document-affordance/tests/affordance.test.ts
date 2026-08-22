import { describe, expect, test } from "vitest";
import {
  activateAffordance,
  applyAffordance,
  caretAffordance,
  caretCursor,
  clickCountAffordance,
  commitAffordance,
  dragAffordance,
  dropAffordance,
  marqueeAffordance,
  escapeAffordance,
  historyAffordance,
  focusAffordance,
  planeHitAffordance,
  pointerSelect,
  pressAffordance,
  renameAffordance,
  resolveAffordanceKey,
  snapAffordance,
  treeAffordance,
  typeaheadAffordance,
} from "../src/index.js";
import { pressInteractionFromWeb } from "@interactive-os/json-document-web";

describe("pointerSelect", () => {
  test("maps conventional modifiers to replace, extend, and toggle", () => {
    const operations: string[] = [];
    applyAffordance(pointerSelect({ shiftKey: false, metaKey: false, ctrlKey: false }), {
      hand: (hand) => {
        if (hand.type === "select") operations.push(hand.operation);
      },
    });
    applyAffordance(pointerSelect({ shiftKey: true, metaKey: false, ctrlKey: false }), {
      hand: (hand) => {
        if (hand.type === "select") operations.push(hand.operation);
      },
    });
    applyAffordance(pointerSelect({ shiftKey: false, metaKey: true, ctrlKey: false }), {
      hand: (hand) => {
        if (hand.type === "select") operations.push(hand.operation);
      },
    });
    applyAffordance(pointerSelect({ shiftKey: false, metaKey: false, ctrlKey: true }), {
      hand: (hand) => {
        if (hand.type === "select") operations.push(hand.operation);
      },
    });
    expect(operations).toEqual(["replace", "extend", "toggle", "toggle"]);
  });
});

describe("pressAffordance", () => {
  test("owns start, end, cancel, disabled, and native activation without persistent ARIA state", () => {
    const start = pressAffordance(
      pressInteractionFromWeb({ type: "keydown", key: " " }),
      { status: "idle" },
    );
    expect(start).toEqual({
      hand: { type: "press", phase: "start", source: "keyboard", key: "Space" },
      state: { status: "active", source: "keyboard", key: "Space" },
    });

    const repeated = pressAffordance(
      pressInteractionFromWeb({ type: "keydown", key: " ", repeat: true }),
      start.state,
    );
    expect(repeated).toEqual({ hand: null, state: start.state });

    const end = pressAffordance(
      pressInteractionFromWeb({ type: "keyup", key: " " }),
      repeated.state,
    );
    expect(end).toEqual({
      hand: { type: "press", phase: "end", source: "keyboard", key: "Space" },
      state: { status: "idle" },
    });

    expect(pressAffordance(
      pressInteractionFromWeb({ type: "blur" }),
      start.state,
    )).toEqual({
      hand: { type: "press", phase: "cancel", source: "keyboard", key: "Space" },
      state: { status: "idle" },
    });

    const pointerStart = pressAffordance(
      pressInteractionFromWeb({ type: "pointerdown", button: 0 }),
      { status: "idle" },
    );
    expect(pressAffordance(
      pressInteractionFromWeb({ type: "pointerleave" }),
      pointerStart.state,
    )).toEqual({
      hand: { type: "press", phase: "cancel", source: "pointer" },
      state: { status: "idle" },
    });
    expect(pressAffordance(
      pressInteractionFromWeb({ type: "keydown", key: "Enter" }),
      { status: "idle" },
      { disabled: true },
    )).toEqual({ hand: null, state: { status: "idle" } });
    expect(pressAffordance(
      pressInteractionFromWeb({ type: "click", detail: 0 }),
      { status: "idle" },
    )).toEqual({ hand: { type: "activate" }, state: { status: "idle" } });
  });

  test("maps normalized native and completed custom Press to activation once", () => {
    expect(activateAffordance(pressInteractionFromWeb({ type: "keydown", key: "Enter" })).hand)
      .toEqual({ type: "activate" });
    expect(activateAffordance(pressInteractionFromWeb({ type: "keyup", key: "Enter" })).hand).toBeNull();
    expect(activateAffordance(pressInteractionFromWeb({ type: "keydown", key: " " })).hand).toBeNull();
    expect(activateAffordance(pressInteractionFromWeb({ type: "keyup", key: " " })).hand)
      .toEqual({ type: "activate" });
    expect(activateAffordance({ type: "press", phase: "start", source: "keyboard", key: "Enter" }).hand)
      .toEqual({ type: "activate" });
    expect(activateAffordance({ type: "press", phase: "end", source: "keyboard", key: "Space" }).hand)
      .toEqual({ type: "activate" });
    expect(activateAffordance({ type: "press", phase: "end", source: "pointer" }).hand)
      .toEqual({ type: "activate" });
    expect(activateAffordance(pressInteractionFromWeb({ type: "click", detail: 0 })).hand)
      .toEqual({ type: "activate" });
  });
});

describe("resolveAffordanceKey", () => {
  test("closes the conventional keymap without a host override", () => {
    const hands: unknown[] = [];
    applyAffordance(resolveAffordanceKey({ key: "ArrowDown", shiftKey: false, metaKey: false, ctrlKey: false }), {
      hand: (hand) => hands.push(hand),
    });
    applyAffordance(resolveAffordanceKey({ key: "ArrowDown", shiftKey: true, metaKey: false, ctrlKey: false }), {
      hand: (hand) => hands.push(hand),
    });
    applyAffordance(resolveAffordanceKey({ key: "z", shiftKey: false, metaKey: true, ctrlKey: false }), {
      hand: (hand) => hands.push(hand),
    });
    applyAffordance(resolveAffordanceKey({ key: "z", shiftKey: true, metaKey: true, ctrlKey: false }), {
      hand: (hand) => hands.push(hand),
    });
    applyAffordance(resolveAffordanceKey({ key: "Delete", shiftKey: false, metaKey: false, ctrlKey: false }), {
      hand: (hand) => hands.push(hand),
    });
    expect(hands).toEqual([
      { type: "move", direction: "down", operation: "replace" },
      { type: "move", direction: "down", operation: "extend" },
      { type: "undo" },
      { type: "redo" },
      { type: "delete" },
    ]);
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
  test("preview carries translate facts without a commit slot", () => {
    expect(dragAffordance({ x: 10, y: 20 }, { x: 14, y: 18 })).toEqual({
      hand: { type: "translate", dx: 4, dy: -2 },
      cursor: "grabbing",
    });
    expect("commit" in dragAffordance({ x: 10, y: 20 }, { x: 14, y: 18 })).toBe(false);
  });
});

describe("commitAffordance", () => {
  test("commits a moved drag and ignores a stationary one", () => {
    expect(commitAffordance(dragAffordance({ x: 10, y: 20 }, { x: 14, y: 18 }))).toEqual({
      hand: { type: "translate", dx: 4, dy: -2 },
      cursor: "grabbing",
      commit: true,
    });
    expect(commitAffordance(dragAffordance({ x: 10, y: 20 }, { x: 10, y: 20 }))).toBeNull();
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
  test("applies cursor and hand from a preview", () => {
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

  test("applies commit only on a commit result", () => {
    const committed: string[] = [];
    const previewed: string[] = [];
    applyAffordance(
      { hand: { type: "translate", dx: 4, dy: -2 }, cursor: "grabbing", commit: true },
      {
        hand: (hand) => previewed.push(hand.type),
        commit: (hand) => committed.push(hand.type),
      },
    );
    expect(previewed).toEqual(["translate"]);
    expect(committed).toEqual(["translate"]);
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

  test.each([
    { metaKey: true },
    { ctrlKey: true },
    { altKey: true },
  ])("leaves modified printable keys for host commands", (modifier) => {
    expect(typeaheadAffordance({
      buffer: "",
      key: "T",
      elapsedMs: 0,
      names: ["Inbox", "Today", "Later"],
      from: "Inbox",
      ...modifier,
    }).hand).toBeNull();
  });
});

describe("focusAffordance", () => {
  test("keeps component traversal separate from internal movement", () => {
    expect(focusAffordance({ key: "Tab", shiftKey: false }).hand).toEqual({ type: "tab", direction: "next" });
    expect(focusAffordance({ key: "Tab", shiftKey: true }).hand).toEqual({ type: "tab", direction: "prev" });
    expect(focusAffordance({ key: "ArrowDown", shiftKey: true }).hand).toEqual({
      type: "move",
      direction: "down",
      operation: "replace",
    });
    expect(focusAffordance({ key: "Home", shiftKey: false }).hand).toEqual({
      type: "boundary",
      edge: "start",
      operation: "replace",
    });
  });
});

describe("caretAffordance", () => {
  test("leaves text geometry to the host while closing pointer and key intent", () => {
    expect(caretAffordance({ type: "pointer" })).toEqual({
      hand: { type: "caret", action: "place", operation: "replace" },
      cursor: "text",
    });
    expect(caretAffordance({ type: "pointer", dragging: true }).hand).toEqual({
      type: "caret",
      action: "range",
      operation: "extend",
    });
    expect(caretAffordance({ key: "ArrowRight", shiftKey: true }).hand).toEqual({
      type: "caret-move",
      direction: "right",
      operation: "extend",
    });
    expect(caretCursor("horizontal")).toBe("text");
    expect(caretCursor("vertical")).toBe("vertical-text");
  });
});

describe("renameAffordance", () => {
  test("begins, commits, and cancels without owning the draft", () => {
    expect(renameAffordance({ key: "F2" }).hand).toEqual({ type: "rename", action: "begin" });
    expect(renameAffordance({ key: "Enter" }).hand).toEqual({ type: "rename", action: "commit" });
    expect(renameAffordance({ key: "Escape" }).hand).toEqual({ type: "rename", action: "cancel" });
    expect(renameAffordance({ type: "pointer", detail: 2, intervalMs: 500 }).hand).toEqual({
      type: "rename",
      action: "begin",
    });
    expect(renameAffordance({ type: "pointer", detail: 2, intervalMs: 200 }).hand).toBeNull();
  });
});

describe("clickCountAffordance", () => {
  test("reports native double and triple click counts", () => {
    expect(clickCountAffordance(2).hand).toEqual({ type: "click", count: 2 });
    expect(clickCountAffordance(3).hand).toEqual({ type: "click", count: 3 });
    expect(clickCountAffordance(0).hand).toBeNull();
  });
});

describe("marqueeAffordance", () => {
  test("carries replace, extend, and toggle from modifiers", () => {
    const origin = { x: 0, y: 0 };
    const point = { x: 10, y: 8 };
    expect(marqueeAffordance(origin, point).hand).toMatchObject({ type: "select", operation: "replace" });
    expect(marqueeAffordance(origin, point, { shiftKey: true }).hand).toMatchObject({
      type: "select",
      operation: "extend",
    });
    expect(marqueeAffordance(origin, point, { metaKey: true }).hand).toMatchObject({
      type: "select",
      operation: "toggle",
    });
  });

  test("a stationary empty press is clear, not a zero rect", () => {
    expect(marqueeAffordance({ x: 12, y: 8 }, { x: 12, y: 8 }).hand).toEqual({ type: "clear" });
    expect(commitAffordance(marqueeAffordance({ x: 12, y: 8 }, { x: 12, y: 8 }))).toEqual({
      hand: { type: "clear" },
      commit: true,
    });
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

  test("pops a gesture before clearing selection", () => {
    expect(escapeAffordance({ key: "Escape", grabbing: true, selected: true }).hand).toEqual({ type: "cancel" });
    expect(escapeAffordance({ key: "Escape", grabbing: false, selected: true }).hand).toEqual({ type: "clear" });
    expect(escapeAffordance({ key: "Escape", grabbing: false, selected: false }).hand).toBeNull();
    expect(escapeAffordance({ type: "pointercancel", selected: true }).hand).toEqual({ type: "cancel" });
  });
});

describe("planeHitAffordance", () => {
  test("keeps the selected set when pressing an already selected object", () => {
    expect(planeHitAffordance({
      hitId: "card",
      selectedIds: ["note", "card"],
    }).hand).toEqual({
      type: "select",
      operation: "replace",
      objectIds: ["note", "card"],
    });
    expect(planeHitAffordance({
      hitId: "chip",
      selectedIds: ["note", "card"],
    }).hand).toEqual({
      type: "select",
      operation: "replace",
      objectIds: ["chip"],
    });
  });

  test("extends and toggles the hit against the current set", () => {
    expect(planeHitAffordance({
      hitId: "chip",
      selectedIds: ["note"],
      shiftKey: true,
    }).hand).toEqual({
      type: "select",
      operation: "extend",
      objectIds: ["note", "chip"],
    });
    expect(planeHitAffordance({
      hitId: "note",
      selectedIds: ["note", "card"],
      metaKey: true,
    }).hand).toEqual({
      type: "select",
      operation: "toggle",
      objectIds: ["card"],
    });
  });
});

describe("dropAffordance", () => {
  test("previews a drop; only commitAffordance mints the write", () => {
    expect(dropAffordance({ canDrop: false })).toEqual({ hand: null, cursor: "no-drop" });
    expect(dropAffordance({ canDrop: true })).toEqual({
      hand: { type: "move-drop" },
      cursor: "move",
    });
    expect("commit" in dropAffordance({ canDrop: true })).toBe(false);
    expect(commitAffordance(dropAffordance({ canDrop: false }))).toBeNull();
    expect(commitAffordance(dropAffordance({ canDrop: true }))).toEqual({
      hand: { type: "move-drop" },
      cursor: "move",
      commit: true,
    });
  });
});
