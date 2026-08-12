import { describe, expect, test } from "vitest";
import { createSheetEditor, type SheetDocument } from "../src/index.js";

const initial: SheetDocument = {
  columns: [
    { id: "name", label: "Name" },
    { id: "status", label: "Status" },
    { id: "score", label: "Score" },
  ],
  rows: [
    { id: "r1", cells: { name: "Alpha", status: "Draft", score: 1 } },
    { id: "r2", cells: { name: "Beta", status: "Ready", score: 2 } },
    { id: "r3", cells: { name: "Gamma", status: "Done", score: 3 } },
  ],
};

describe("sheet editing vertical slice", () => {
  test("selects a rectangular range and copies row-major JSON with TSV", () => {
    const editor = createSheetEditor(initial);

    editor.dispatch({ type: "selection.set", rowId: "r1", columnId: "name" });
    editor.dispatch({ type: "selection.set", rowId: "r2", columnId: "status", mode: "extend" });

    expect(editor.selectedCells).toEqual([
      { rowId: "r1", columnId: "name", value: "Alpha" },
      { rowId: "r1", columnId: "status", value: "Draft" },
      { rowId: "r2", columnId: "name", value: "Beta" },
      { rowId: "r2", columnId: "status", value: "Ready" },
    ]);
    expect(editor.copy()).toEqual({
      type: "application/vnd.interactive-os.sheet+json",
      cells: [["Alpha", "Draft"], ["Beta", "Ready"]],
      text: "Alpha\tDraft\nBeta\tReady",
    });
  });

  test("pastes one rectangular transaction and restores value with selection", () => {
    const editor = createSheetEditor(initial);
    editor.dispatch({ type: "selection.set", rowId: "r1", columnId: "name" });
    editor.dispatch({ type: "selection.set", rowId: "r2", columnId: "status", mode: "extend" });
    const clipboard = editor.copy()!;
    editor.dispatch({ type: "selection.set", rowId: "r2", columnId: "status" });

    expect(editor.dispatch({ type: "clipboard.paste", clipboard }).ok).toBe(true);
    expect(cells(editor.snapshot.value as SheetDocument)).toEqual([
      ["Alpha", "Draft", 1],
      ["Beta", "Alpha", "Draft"],
      ["Gamma", "Beta", "Ready"],
    ]);
    expect(editor.snapshot.selection).toEqual({
      anchor: { rowId: "r2", columnId: "status" },
      focus: { rowId: "r3", columnId: "score" },
    });

    expect(editor.undo().ok).toBe(true);
    expect(cells(editor.snapshot.value as SheetDocument)).toEqual([
      ["Alpha", "Draft", 1],
      ["Beta", "Ready", 2],
      ["Gamma", "Done", 3],
    ]);
    expect(editor.snapshot.selection).toEqual({
      anchor: { rowId: "r2", columnId: "status" },
      focus: { rowId: "r2", columnId: "status" },
    });

    expect(editor.redo().ok).toBe(true);
    expect(editor.snapshot.selection.focus).toEqual({ rowId: "r3", columnId: "score" });
  });

  test("commits through stable ids and escapes the column id in JSON Pointer", () => {
    const editor = createSheetEditor({
      columns: [{ id: "cost/net~", label: "Net" }],
      rows: [{ id: "invoice", cells: { "cost/net~": 10 } }],
    });

    const result = editor.dispatch({
      type: "cell.commit",
      rowId: "invoice",
      columnId: "cost/net~",
      value: 12,
    });

    expect(result).toMatchObject({
      ok: true,
      change: {
        applied: [{ op: "replace", path: "/rows/0/cells/cost~1net~0", value: 12 }],
      },
    });
  });

  test("coalesces consecutive edits in one cell and restores its selection", () => {
    const editor = createSheetEditor(initial);
    editor.dispatch({ type: "selection.set", rowId: "r2", columnId: "name" });
    editor.dispatch({ type: "cell.commit", rowId: "r2", columnId: "name", value: "B" });
    editor.dispatch({ type: "cell.commit", rowId: "r2", columnId: "name", value: "Be" });
    editor.dispatch({ type: "cell.commit", rowId: "r2", columnId: "name", value: "Beta edited" });

    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as SheetDocument).rows[1]?.cells.name).toBe("Beta");
    expect(editor.snapshot.canUndo).toBe(false);
    expect(editor.snapshot.selection).toEqual({
      anchor: { rowId: "r2", columnId: "name" },
      focus: { rowId: "r2", columnId: "name" },
    });
  });

  test("rejects paste outside fixed sheet bounds without changing JSON", () => {
    const editor = createSheetEditor(initial);
    editor.dispatch({ type: "selection.set", rowId: "r1", columnId: "name" });
    editor.dispatch({ type: "selection.set", rowId: "r2", columnId: "status", mode: "extend" });
    const clipboard = editor.copy()!;
    editor.dispatch({ type: "selection.set", rowId: "r3", columnId: "score" });

    expect(editor.dispatch({ type: "clipboard.paste", clipboard })).toEqual({
      ok: false,
      code: "paste.out-of-bounds",
    });
    expect(cells(editor.snapshot.value as SheetDocument)).toEqual([
      ["Alpha", "Draft", 1],
      ["Beta", "Ready", 2],
      ["Gamma", "Done", 3],
    ]);
  });
});

function cells(document: SheetDocument): unknown[][] {
  return document.rows.map((row) => document.columns.map((column) => row.cells[column.id]));
}
