import { describe, expect, test } from "vitest";
import type { JSONValue } from "@interactive-os/json-document";
import {
  createDatabaseEditor,
  createDocumentEditor,
  createObjectEditor,
  createOrderEditor,
  createSheetEditor,
  createTreeEditor,
  createKanbanEditor,
  type DatabaseIntent,
  type DatabaseSelection,
  type DocumentIntent,
  type DocumentSelection,
  type EditingDispatch,
  type EditingIntent,
  type ObjectIntent,
  type ObjectSelection,
  type OrderIntent,
  type OrderSelection,
  type SheetIntent,
  type SheetSelection,
  type TreeIntent,
  type TreeSelection,
  type KanbanIntent,
  type KanbanSelection,
} from "../src/index.js";

function asDispatch<Intent extends EditingIntent, Selection extends JSONValue>(
  editor: EditingDispatch<Intent, Selection>,
): EditingDispatch<Intent, Selection> {
  return editor;
}

describe("editing intent door", () => {
  test("every domain editor accepts the shared dispatch door", () => {
    asDispatch<DocumentIntent, DocumentSelection>(
      createDocumentEditor({ blocks: [{ id: "a", text: "A" }] }),
    );
    asDispatch<SheetIntent, SheetSelection>(createSheetEditor({
      columns: [{ id: "title", label: "Title" }],
      rows: [{ id: "a", cells: { title: "A" } }],
    }));
    asDispatch<TreeIntent, TreeSelection>(createTreeEditor({
      nodes: [{ id: "a", label: "A", parentId: null }],
    }));
    asDispatch<ObjectIntent, ObjectSelection>(createObjectEditor({
      objects: [{ id: "a", label: "A", x: 0, y: 0, width: 1, height: 1, color: "amber" }],
    }));
    asDispatch<OrderIntent, OrderSelection>(
      createOrderEditor({ items: [{ id: "a", label: "A" }] }),
    );
    asDispatch<KanbanIntent, KanbanSelection>(createKanbanEditor({
      columns: [{ id: "todo", title: "Todo", cardIds: ["a"] }],
      cards: [{ id: "a", title: "A" }],
    }));
    asDispatch<DatabaseIntent, DatabaseSelection>(createDatabaseEditor({
      schema: { properties: [{ id: "title", name: "Title", type: "title", options: [] }] },
      records: [{ id: "a", values: { title: "A" } }],
      views: [{
        id: "all",
        name: "All",
        ownership: "personal",
        layout: "table",
        projection: { search: "", filter: { id: "all:root", conjunction: "and", items: [] }, sorts: [], groups: [], columns: [{ propertyId: "title", visible: true, width: null, pinned: null }] },
      }],
    }));
  });

  test("records intent.type as origin on a value-changing dispatch", () => {
    const editor = createDocumentEditor({ blocks: [{ id: "a", text: "A" }] });
    const result = editor.dispatch({ type: "text.replace", blockId: "a", text: "B" });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.change?.metadata).toMatchObject({
      editing: { origin: "text.replace" },
    });
    expect(editor.snapshot.canUndo).toBe(true);
  });

  test("does not record history for selection-only or failed intents", () => {
    const editor = createDocumentEditor({ blocks: [{ id: "a", text: "A" }] });

    expect(editor.dispatch({ type: "selection.set", blockId: "a" })).toMatchObject({ ok: true });
    expect(editor.snapshot.canUndo).toBe(false);

    expect(editor.dispatch({ type: "selection.set", blockId: "missing" })).toMatchObject({
      ok: false,
      code: "selection.block-not-found",
    });
    expect(editor.snapshot.canUndo).toBe(false);
  });
});
