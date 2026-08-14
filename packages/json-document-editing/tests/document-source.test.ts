import {
  createJSONDocument,
  type JSONDocument,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";
import {
  createDatabaseEditor,
  createDocumentEditor,
  createObjectEditor,
  createOrderEditor,
  createSheetEditor,
  createTreeEditor,
  createKanbanEditor,
  type EditingSnapshot,
} from "../src/index.js";

interface DocumentBackedEditor<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  subscribe(listener: (snapshot: EditingSnapshot<Selection>) => void): () => void;
}

describe("document-backed domain editors", () => {
  test.each([
    {
      name: "document",
      verify: () => expectSharedDocument(
        { blocks: [{ id: "a", text: "Draft" }] },
        createDocumentEditor,
        { op: "replace", path: "/blocks/0/text", value: "Shared" },
      ),
    },
    {
      name: "object",
      verify: () => expectSharedDocument(
        { objects: [{ id: "a", label: "Draft", x: 0, y: 0, width: 1, height: 1 }] },
        createObjectEditor,
        { op: "replace", path: "/objects/0/label", value: "Shared" },
      ),
    },
    {
      name: "order",
      verify: () => expectSharedDocument(
        { items: [{ id: "a", label: "Draft" }] },
        createOrderEditor,
        { op: "replace", path: "/items/0/label", value: "Shared" },
      ),
    },
    {
      name: "tree",
      verify: () => expectSharedDocument(
        { nodes: [{ id: "a", label: "Draft", parentId: null }] },
        createTreeEditor,
        { op: "replace", path: "/nodes/0/label", value: "Shared" },
      ),
    },
    {
      name: "sheet",
      verify: () => expectSharedDocument(
        {
          columns: [{ id: "title", label: "Title" }],
          rows: [{ id: "a", cells: { title: "Draft" } }],
        },
        createSheetEditor,
        { op: "replace", path: "/rows/0/cells/title", value: "Shared" },
      ),
    },
    {
      name: "kanban",
      verify: () => expectSharedDocument(
        {
          columns: [{ id: "todo", title: "Todo", cardIds: ["a"] }],
          cards: [{ id: "a", title: "Draft" }],
        },
        createKanbanEditor,
        { op: "replace", path: "/cards/0/title", value: "Shared" },
      ),
    },
    {
      name: "database",
      verify: () => expectSharedDocument(
        {
          schema: { properties: [{ id: "title", name: "Title", type: "title", options: [] }] },
          records: [{ id: "a", values: { title: "Draft" } }],
          views: [{
            id: "all",
            name: "All",
            type: "table",
            propertyOrder: ["title"],
            propertyVisibility: { title: true },
            sort: null,
            filter: null,
          }],
        },
        createDatabaseEditor,
        { op: "replace", path: "/records/0/values/title", value: "Shared" },
      ),
    },
  ])("uses the provided JSONDocument for the $name editor", ({ verify }) => verify());

  test("keeps editors backed by different document instances isolated", () => {
    const first = createJSONDocument({
      columns: [{ id: "title", label: "Title" }],
      rows: [{ id: "a", cells: { title: "First" } }],
    });
    const second = createJSONDocument({
      columns: [{ id: "title", label: "Title" }],
      rows: [{ id: "a", cells: { title: "Second" } }],
    });
    const firstEditor = createSheetEditor(first);
    const secondEditor = createSheetEditor(second);

    firstEditor.dispatch({
      type: "cell.commit",
      rowId: "a",
      columnId: "title",
      value: "Changed",
    });

    expect(first.value).not.toEqual(second.value);
    expect(secondEditor.snapshot.revision).toBe(0);
  });
});

function expectSharedDocument<Selection extends JSONValue>(
  initial: JSONValue,
  create: (document: JSONDocument) => DocumentBackedEditor<Selection>,
  operation: JSONPatchOperation,
): void {
  const document = createJSONDocument(initial);
  const editor = create(document);
  const revisions: number[] = [];
  editor.subscribe((snapshot) => revisions.push(snapshot.revision));

  document.commit([operation]);

  expect(editor.snapshot.value).toBe(document.value);
  expect(revisions).toEqual([1]);
}
