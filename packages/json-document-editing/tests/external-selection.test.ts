import { createJSONDocument, type JSONDocument, type JSONPatchOperation, type JSONValue } from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";
import {
  ANNOTATION_PROFILE_V1, createAnnotationEditor, createCalendarEditor, createDatabaseEditor,
  createDocumentEditor, createKanbanEditor, createObjectEditor, createOrderEditor, createSheetEditor,
  createTreeEditor, type EditingSnapshot,
} from "../src/index.js";

interface Case {
  readonly name: string;
  readonly initial: JSONValue;
  readonly create: (document: JSONDocument) => {
    readonly snapshot: EditingSnapshot<JSONValue>;
    subscribe(listener: () => void): () => void;
  };
  readonly remove: ReadonlyArray<JSONPatchOperation>;
  readonly empty: JSONValue;
}

const emptyRange = { kind: "range", ranges: [], primaryIndex: null };
const emptyGrid = { ...emptyRange, anchor: null, focus: null };
const emptyKeys = { kind: "explicit", keys: [], primaryKey: null };
const calendar = {
  calendars: [{ id: "home", title: "Home", hidden: false, color: "subtle" }],
  events: [{ id: "a", title: "Draft", start: "2026-08-03T09:00", end: "2026-08-03T10:00",
    allDay: false, calendarId: "home", recurrence: null, excludeDates: [] }],
};
const cases: Case[] = [
  { name: "Document", initial: { blocks: [{ id: "a", text: "Draft" }] }, create: createDocumentEditor,
    remove: [{ op: "remove", path: "/blocks/0" }], empty: emptyRange },
  { name: "Order", initial: { items: [{ id: "a", label: "Draft" }] }, create: createOrderEditor,
    remove: [{ op: "remove", path: "/items/0" }], empty: emptyRange },
  { name: "Object", initial: { objects: [{ id: "a", label: "Draft", x: 0, y: 0, width: 1, height: 1 }] }, create: createObjectEditor,
    remove: [{ op: "remove", path: "/objects/0" }], empty: emptyKeys },
  { name: "Tree", initial: { nodes: [{ id: "a", label: "Draft", parentId: null }] }, create: createTreeEditor,
    remove: [{ op: "remove", path: "/nodes/0" }], empty: emptyRange },
  { name: "Sheet row", initial: { columns: [{ id: "title", label: "Title" }], rows: [{ id: "a", cells: { title: "Draft" } }] }, create: createSheetEditor,
    remove: [{ op: "remove", path: "/rows/0" }], empty: emptyGrid },
  { name: "Sheet column", initial: { columns: [{ id: "title", label: "Title" }], rows: [{ id: "a", cells: { title: "Draft" } }] }, create: createSheetEditor,
    remove: [{ op: "remove", path: "/columns/0" }, { op: "remove", path: "/rows/0/cells/title" }], empty: emptyGrid },
  { name: "Database", initial: {
    schema: { properties: [{ id: "title", name: "Title", type: "title", options: [] }] },
    records: [{ id: "a", values: { title: "Draft" } }],
    views: [{ id: "all", name: "All", type: "table", propertyOrder: ["title"], propertyVisibility: { title: true }, propertyWidths: {}, sort: null, filter: null }],
  }, create: createDatabaseEditor, remove: [{ op: "remove", path: "/records/0" }], empty: emptyGrid },
  { name: "Kanban", initial: { columns: [{ id: "todo", title: "Todo", cardIds: ["a"] }], cards: [{ id: "a", title: "Draft" }] }, create: createKanbanEditor,
    remove: [{ op: "remove", path: "/cards/0" }, { op: "remove", path: "/columns/0/cardIds/0" }], empty: emptyKeys },
  { name: "Calendar", initial: calendar, create: createCalendarEditor,
    remove: [{ op: "remove", path: "/events/0" }], empty: emptyRange },
  { name: "Annotation", initial: {
    profile: ANNOTATION_PROFILE_V1, id: "doc",
    sources: [{ id: "source", src: "/sample.png", width: 100, height: 100 }],
    annotations: [{ id: "a", body: { instruction: "Draft" }, target: { sourceId: "source", selector: { type: "point", x: 10, y: 10 } }, presentation: { type: "marker" } }],
  }, create(document) {
    const editor = createAnnotationEditor(document);
    expect(editor.dispatch({ type: "selection.set", annotationId: "a", mode: "replace" }).ok).toBe(true);
    return editor;
  }, remove: [{ op: "remove", path: "/annotations/0" }], empty: { kind: "annotation", ids: [], primaryId: null } },
];

describe.each([true, false])("external selection reconciliation (observed: %s)", (observed) => {
  test.each(cases)("$name publishes a valid selection after external deletion", ({ initial, create, remove, empty }) => {
    const document = createJSONDocument(initial);
    const editor = create(document);
    const published: JSONValue[] = [];
    const release = observed ? editor.subscribe(() => published.push(editor.snapshot.selection)) : () => {};
    expect(document.commit(remove).ok).toBe(true);
    expect(editor.snapshot.selection).toEqual(empty);
    if (observed) expect(published).toEqual([empty]);
    release();
  });
});

test("Calendar retains occurrence selection when its calendar becomes hidden", () => {
  const document = createJSONDocument(calendar);
  const editor = createCalendarEditor(document);
  const selection = editor.snapshot.selection;
  const release = editor.subscribe(() => {});
  expect(document.commit([{ op: "replace", path: "/calendars/0/hidden", value: true }]).ok).toBe(true);
  expect(editor.snapshot.selection).toEqual(selection);
  release();
});

test("Document clamps offsets on retained blocks and preserves a surviving primary range", () => {
  const document = createJSONDocument({ blocks: [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }] });
  const editor = createDocumentEditor(document);
  editor.dispatch({ type: "selection.set", blockId: "b", offset: 4, mode: "toggle" });
  document.commit([{ op: "remove", path: "/blocks/0" }, { op: "replace", path: "/blocks/0/text", value: "B" }]);
  expect(editor.snapshot.selection).toEqual({
    kind: "range", primaryIndex: 0,
    ranges: [{ anchor: { blockId: "b", offset: 1 }, focus: { blockId: "b", offset: 1 } }],
  });
});
