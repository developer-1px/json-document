import { describe, expect, test } from "vitest";
import {
  createDatabaseEditor,
  type DatabaseDocument,
} from "../src/index.js";

const initial: DatabaseDocument = {
  schema: {
    properties: [
      { id: "name", name: "Name", type: "title", options: [] },
      { id: "note", name: "Note", type: "text", options: [] },
      { id: "score", name: "Score", type: "number", options: [] },
      { id: "status", name: "Status", type: "select", options: [{ id: "todo", name: "To do" }, { id: "done", name: "Done" }] },
      { id: "done", name: "Done", type: "checkbox", options: [] },
    ],
  },
  records: [
    { id: "r1", values: { name: "Alpha", note: "First", score: 1, status: "todo", done: false } },
    { id: "r2", values: { name: "Beta", note: "Second", score: 3, status: "done", done: true } },
    { id: "r3", values: { name: "Gamma", note: "Third", score: 2, status: "todo", done: false } },
  ],
  views: [{
    id: "table",
    name: "Table",
    type: "table",
    propertyOrder: ["name", "note", "score", "status", "done"],
    propertyVisibility: {},
    sort: null,
    filter: null,
  }],
};

describe("Database editor", () => {
  test("commits all five property value kinds and restores selection with history", () => {
    const editor = createDatabaseEditor(initial);
    expect(editor.dispatch({ type: "cell.commit", recordId: "r1", propertyId: "name", value: "Renamed" }).ok).toBe(true);
    expect(editor.dispatch({ type: "cell.commit", recordId: "r1", propertyId: "note", value: "Edited" }).ok).toBe(true);
    expect(editor.dispatch({ type: "cell.commit", recordId: "r1", propertyId: "score", value: 9 }).ok).toBe(true);
    expect(editor.dispatch({ type: "cell.commit", recordId: "r1", propertyId: "status", value: "done" }).ok).toBe(true);
    expect(editor.dispatch({ type: "cell.commit", recordId: "r1", propertyId: "done", value: true }).ok).toBe(true);

    const record = (editor.snapshot.value as DatabaseDocument).records[0]!;
    expect(record.values).toEqual({ name: "Renamed", note: "Edited", score: 9, status: "done", done: true });
    expect(editor.snapshot.selection.focus).toEqual({ recordId: "r1", propertyId: "done" });
    expect(editor.undo().ok).toBe(true);
    expect(editor.snapshot.selection.focus).toEqual({ recordId: "r1", propertyId: "status" });
    expect(editor.dispatch({ type: "cell.commit", recordId: "r1", propertyId: "score", value: "9" }).ok).toBe(false);
  });

  test("stores table view configuration separately and projects visible topology", () => {
    const editor = createDatabaseEditor(initial);
    expect(editor.dispatch({
      type: "view.configure",
      viewId: "table",
      propertyOrder: ["score", "name", "note", "status", "done"],
      propertyVisibility: { note: false },
      sort: { propertyId: "score", direction: "descending" },
      filter: { propertyId: "status", operator: "equals", value: "todo" },
    }).ok).toBe(true);

    expect(editor.tableTopology("table")).toEqual({
      recordIds: ["r3", "r1"],
      propertyIds: ["score", "name", "status", "done"],
    });
    const document = editor.snapshot.value as DatabaseDocument;
    expect(document.records).toEqual(initial.records);
    expect(document.views[0]?.sort).toEqual({ propertyId: "score", direction: "descending" });
    expect(editor.undo().ok).toBe(true);
    expect(editor.tableTopology("table").recordIds).toEqual(["r1", "r2", "r3"]);
  });

  test("adds and deletes records while history restores document and structural selection", () => {
    const editor = createDatabaseEditor(initial);
    expect(editor.dispatch({ type: "record.add", recordId: "r4" }).ok).toBe(true);
    expect(editor.snapshot.selection.focus).toEqual({ recordId: "r4", propertyId: "name" });
    expect((editor.snapshot.value as DatabaseDocument).records).toHaveLength(4);

    expect(editor.dispatch({ type: "record.delete", recordId: "r4" }).ok).toBe(true);
    expect(editor.snapshot.selection.focus).toEqual({ recordId: "r3", propertyId: "name" });
    expect(editor.undo().ok).toBe(true);
    expect(editor.snapshot.selection.focus).toEqual({ recordId: "r4", propertyId: "name" });
    expect((editor.snapshot.value as DatabaseDocument).records).toHaveLength(4);
  });

  test("selects ranges against the projected table topology", () => {
    const editor = createDatabaseEditor(initial);
    editor.dispatch({ type: "selection.set", recordId: "r1", propertyId: "name" });
    editor.dispatch({ type: "selection.set", recordId: "r2", propertyId: "score", mode: "extend" });
    expect(editor.selectedCellsIn(editor.tableTopology("table")).map(({ recordId, propertyId }) => `${recordId}:${propertyId}`)).toEqual([
      "r1:name", "r1:note", "r1:score", "r2:name", "r2:note", "r2:score",
    ]);
  });
});
