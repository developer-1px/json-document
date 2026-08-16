import { describe, expect, test } from "vitest";
import { createKanbanEditor, type KanbanDocument } from "../src/index.js";

const initial: KanbanDocument = {
  columns: [
    { id: "todo", title: "Todo", cardIds: ["a", "b"] },
    { id: "doing", title: "Doing", cardIds: ["c"] },
    { id: "done", title: "Done", cardIds: [] },
  ],
  cards: [
    { id: "a", title: "Write" },
    { id: "b", title: "Review" },
    { id: "c", title: "Ship" },
  ],
};

describe("kanban editor", () => {
  test("moves a card across columns and restores the board with undo", () => {
    const editor = createKanbanEditor(initial);
    expect(editor.dispatch({
      type: "card.move",
      cardId: "a",
      columnId: "doing",
      beforeCardId: "c",
    }).ok).toBe(true);
    const moved = editor.snapshot.value as KanbanDocument;
    expect(moved.columns.map((column) => column.cardIds)).toEqual([["b"], ["a", "c"], []]);
    expect(editor.snapshot.selection.keys).toEqual(["a"]);

    expect(editor.undo().ok).toBe(true);
    expect(editor.snapshot.value).toEqual(initial);
  });

  test("removes the selected card from the board", () => {
    const editor = createKanbanEditor(initial);
    editor.dispatch({ type: "selection.set", cardId: "b" });
    expect(editor.dispatch({ type: "selection.remove" }).ok).toBe(true);
    const next = editor.snapshot.value as KanbanDocument;
    expect(next.cards.map((card) => card.id)).toEqual(["a", "c"]);
    expect(next.columns[0]?.cardIds).toEqual(["a"]);
  });
});
