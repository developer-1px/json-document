import { createJSONDocument, type JSONDocument, type JSONValue } from "@interactive-os/json-document";
import { describe, expect, test, vi } from "vitest";
import { createDocumentEditor, createOrderEditor, createObjectEditor, createTreeEditor, createCalendarEditor, createEditingId, createEditingIdAllocator } from "../src/index.js";

interface Case {
  readonly name: string;
  readonly initial: JSONValue;
  readonly pointer: string;
  readonly insert: (document: JSONDocument) => boolean;
}
const cases: Case[] = [
  { name: "Document", initial: { blocks: [] }, pointer: "/blocks", insert: (document) =>
    createDocumentEditor(document).dispatch({ type: "block.insert", text: "copy" }).ok },
  { name: "Order", initial: { items: [] }, pointer: "/items", insert: (document) =>
    createOrderEditor(document).dispatch({ type: "clipboard.paste", clipboard: {
      type: "application/vnd.interactive-os.order+json", items: [{ id: "original", label: "copy" }], text: "copy",
    } }).ok },
  { name: "Object", initial: { objects: [] }, pointer: "/objects", insert: (document) =>
    createObjectEditor(document).dispatch({ type: "clipboard.paste", clipboard: {
      type: "application/vnd.interactive-os.objects+json",
      objects: [{ id: "original", label: "copy", x: 0, y: 0, width: 1, height: 1, color: "subtle" }], text: "copy",
    } }).ok },
  { name: "Tree", initial: { nodes: [] }, pointer: "/nodes", insert: (document) =>
    createTreeEditor(document).dispatch({ type: "clipboard.paste", topology: { visibleIds: [] }, clipboard: {
      type: "application/vnd.interactive-os.tree+json", nodes: [{ id: "original", label: "copy", parentId: null }], text: "copy",
    } }).ok },
  { name: "Calendar", initial: { calendars: [{ id: "home", title: "Home", hidden: false, color: "subtle" }], events: [] },
    pointer: "/events", insert: (document) => createCalendarEditor(document).dispatch({
      type: "event.create", title: "copy", start: "2026-08-03T09:00", end: "2026-08-03T10:00", calendarId: "home",
    }).ok },
];

describe("default domain identities", () => {
  test("reads 50,000 existing IDs once while reserving 1,000 batch IDs", () => {
    let reads = 0;
    function* existingIds() {
      for (let index = 0; index < 50_000; index++) { reads++; yield `existing-${index}`; }
    }
    let sequence = 0;
    const allocateId = createEditingIdAllocator(existingIds(), () => `copy-${sequence++}`, "object");
    const allocated = Array.from({ length: 1_000 }, allocateId);
    expect(reads).toBe(50_000);
    expect(new Set(allocated).size).toBe(1_000);
  });

  test("reserves new IDs and gives each allocation exactly 100 collision attempts", () => {
    const createId = vi.fn().mockReturnValueOnce("occupied").mockReturnValueOnce("copy").mockReturnValue("copy");
    const allocateId = createEditingIdAllocator(["occupied"], createId, "tree node");
    expect(allocateId()).toBe("copy");
    createId.mockClear();
    expect(allocateId).toThrow("createId did not produce a unique tree node id");
    expect(createId).toHaveBeenCalledTimes(100);
    createId.mockReturnValue("next");
    expect(allocateId()).toBe("next");
  });

  test.each(cases)("$name preserves the collision limit and document on failure", ({ initial, insert }) => {
    const randomUUID = vi.fn(() => "collision");
    vi.stubGlobal("crypto", { randomUUID });
    try {
      const document = createJSONDocument(initial);
      expect(insert(document)).toBe(true);
      const before = document.value;
      randomUUID.mockClear();
      expect(() => insert(document)).toThrow("createId did not produce a unique");
      expect(randomUUID).toHaveBeenCalledTimes(100);
      expect(document.value).toBe(before);
    } finally { vi.unstubAllGlobals(); }
  });

  test.each(cases)("$name does not reuse IDs across independent or recreated editors", ({ initial, pointer, insert }) => {
    const ids: JSONValue[] = [];
    for (let instance = 0; instance < 3; instance++) {
      const document = createJSONDocument(initial);
      for (let recreation = 0; recreation < 3; recreation++) expect(insert(document)).toBe(true);
      const items = document.at(pointer);
      expect(items.ok).toBe(true);
      if (items.ok) ids.push(...(items.value as ReadonlyArray<{ readonly id: string }>).map((item) => item.id));
    }
    expect(new Set(ids).size).toBe(9);
  });

  test("preserves the injected ID provider", () => {
    const editor = createDocumentEditor({ blocks: [] }, { createId: () => "host-id" });
    expect(editor.dispatch({ type: "block.insert" }).ok).toBe(true);
    expect(editor.snapshot.value).toEqual({ blocks: [{ id: "host-id", text: "" }] });
  });

  test("fails explicitly without a collision-resistant platform provider", () => {
    vi.stubGlobal("crypto", undefined);
    try {
      expect(() => createEditingId("block")).toThrow("editing.id-provider-unavailable");
    } finally { vi.unstubAllGlobals(); }
  });
});
