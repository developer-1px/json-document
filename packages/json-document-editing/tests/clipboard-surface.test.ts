import { describe, expect, test } from "vitest";
import { applyPatch, type JSONValue } from "@interactive-os/json-document";
import {
  createDatabaseEditor,
  createDocumentEditor,
  createObjectEditor,
  createOrderEditor,
  createSheetEditor,
  createTreeEditor,
  sheetClipboardFormat,
  databaseClipboardFormat,
} from "../src/index.js";

describe.each([sheetClipboardFormat, databaseClipboardFormat])("$mimeType JSON boundary", (format) => {
  const cycle: unknown[] = [];
  cycle.push(cycle);
  const invalidValues = [NaN, Infinity, new Date(0), Array(1), cycle, { nested: undefined }];

  test.each(invalidValues.map((value, index) => ({ value, index })))("rejects non-JSON cell $index as Core does", ({ value }) => {
    expect(applyPatch(null, [{ op: "replace", path: "", value: value as JSONValue }]).ok).toBe(false);
    expect(format.parse({ type: format.mimeType, cells: [[value]], text: "x" })).toBeNull();
  });

  test("rejects holes in either matrix dimension and does not invoke cell accessors", () => {
    let reads = 0;
    const cell = Object.defineProperty({}, "value", { enumerable: true, get: () => { reads++; return 1; } });
    for (const cells of [Array(1), [Array(1)], [[cell]]]) {
      expect(format.parse({ type: format.mimeType, cells, text: "x" })).toBeNull();
    }
    expect(reads).toBe(0);
  });

  test("preserves valid nested JSON without normalization", () => {
    const payload = { type: format.mimeType, cells: [[{ "a/b~": [1, true, null] }]], text: "x" };
    expect(format.parse(payload)).toBe(payload);
  });
});

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
        propertyWidths: {},
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
