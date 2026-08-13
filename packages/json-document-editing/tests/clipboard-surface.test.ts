import { describe, expect, test } from "vitest";
import {
  createDatabaseEditor,
  createDocumentEditor,
  createObjectEditor,
  createOrderEditor,
  createSheetEditor,
  createTreeEditor,
} from "../src/index.js";

describe("editing clipboard surface", () => {
  test("every domain editor copies a structured payload and a text projection", () => {
    const document = createDocumentEditor({ blocks: [{ id: "a", text: "A" }] });
    const order = createOrderEditor({ items: [{ id: "a", label: "A" }] });
    const object = createObjectEditor({
      objects: [{ id: "a", label: "A", x: 0, y: 0, width: 1, height: 1, color: "amber" }],
    });
    const tree = createTreeEditor({ nodes: [{ id: "a", label: "A", parentId: null }] });
    const sheet = createSheetEditor({
      columns: [{ id: "name", label: "Name" }],
      rows: [{ id: "r1", cells: { name: "A" } }],
    });
    const database = createDatabaseEditor({
      schema: { properties: [{ id: "title", name: "Title", type: "title", options: [] }] },
      records: [{ id: "r1", values: { title: "A" } }],
      views: [{
        id: "all",
        name: "All",
        type: "table",
        propertyOrder: ["title"],
        propertyVisibility: { title: true },
        sort: null,
        filter: null,
      }],
    });

    expect(document.copy()?.text).toBe("A");
    expect(order.copy()?.text).toBe("A");
    expect(object.copy()?.text).toBe("A");
    expect(tree.copy({ visibleIds: ["a"] })?.text).toBe("A");
    expect(sheet.copy()?.text).toBe("A");
    expect(database.copy()?.text).toBe("A");

    expect(document.cut()?.clipboard.text).toBe("A");
    expect(order.cut()?.clipboard.text).toBe("A");
    expect(object.cut()?.clipboard.text).toBe("A");
    expect(tree.cut({ visibleIds: ["a"] })?.clipboard.text).toBe("A");
    expect(sheet.cut()?.clipboard.text).toBe("A");
    expect("cut" in database).toBe(false);
  });
});
