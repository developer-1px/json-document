import { describe, expect, test } from "vitest";
import { createJSONDocument, type JSONPatchOperation, type JSONValue } from "@interactive-os/json-document";
import { createEditingSession, type EditingDocumentChange } from "../src/session.js";

describe("editing transaction composition", () => {
  test.each([true, false])("provides before/change/after mapping before reconciliation (observed: %s)", (observed) => {
    const document = createJSONDocument({ text: "abc" });
    const contexts: EditingDocumentChange[] = [];
    const session = createEditingSession({
      document, selection: { offset: 1 },
      mapSelection(selection, context) {
        contexts.push(context);
        return { offset: selection.offset + 1 };
      },
      reconcileSelection(selection, value) {
        expect(selection.offset).toBe(2);
        expect(value).toEqual({ text: "Xabc" });
        return selection;
      },
    });
    const published: number[] = [];
    const release = observed ? session.subscribe((snapshot) => published.push(snapshot.selection.offset)) : () => {};
    const result = document.commit([{ op: "replace", path: "/text", value: "Xabc" }]);
    expect(result.ok).toBe(true);
    expect(session.snapshot.selection.offset).toBe(2);
    expect(contexts).toHaveLength(1);
    expect(contexts[0]).toEqual({ before: { text: "abc" }, after: { text: "Xabc" }, change: observed && result.ok ? result.change : null });
    if (observed) expect(published).toEqual([2]);
    release();
  });

  test("returns malformed pointer failure without throwing from inverse planning", () => {
    const session = createEditingSession({ document: createJSONDocument({ a: 1 }), selection: null });
    expect(session.apply({ operations: [{ op: "add", path: "/~2", value: 2 }], selectionAfter: null, origin: "invalid" })).toMatchObject({
      ok: false, code: "invalid_pointer",
    });
  });
  test.each(["before", "after", "unobserved"])("separates a subscriber's write from its own commit (%s)", (order) => {
    const document = createJSONDocument({ items: ["a", "b"], other: 0 });
    const session = createEditingSession({ document, selection: null });
    const seen: JSONValue[] = [];
    if (order === "before") session.subscribe((snapshot) => seen.push(snapshot.value));
    let written = false;
    document.subscribe(() => {
      if (written) return;
      written = true;
      document.commit([{ op: "replace", path: "/other", value: 99 }]);
    });
    if (order === "after") session.subscribe((snapshot) => seen.push(snapshot.value));
    const result = session.apply({ operations: [{ op: "move", from: "/items/0", path: "/items/1" }], selectionAfter: null, origin: "reorder" });
    expect(result).toMatchObject({ ok: true, snapshot: { value: { items: ["b", "a"], other: 0 }, revision: 1 } });
    expect(session.snapshot).toMatchObject({ value: { items: ["b", "a"], other: 99 }, revision: 2, canUndo: false });
    expect(session.undo()).toMatchObject({ ok: false, code: "history.empty" });
    expect(document.value).toEqual({ items: ["b", "a"], other: 99 });
    if (order !== "unobserved") expect(seen).toEqual([{ items: ["b", "a"], other: 0 }, { items: ["b", "a"], other: 99 }]);
  });

  test.each([
    { name: "array move", initial: { list: ["a", "b", "c"] }, operations: [{ op: "move", from: "/list/0", path: "/list/2" }] },
    { name: "object move overwrites destination", initial: { source: { n: 1 }, destination: { n: 2 } }, operations: [{ op: "move", from: "/source", path: "/destination" }] },
    { name: "array move to append", initial: { list: ["a", "b", "c"] }, operations: [{ op: "move", from: "/list/0", path: "/list/-" }] },
    { name: "copy overwrites destination", initial: { source: { n: 1 }, destination: { n: 2 } }, operations: [{ op: "copy", from: "/source", path: "/destination" }] },
    { name: "copy into array", initial: { list: ["a", "b"] }, operations: [{ op: "copy", from: "/list/0", path: "/list/-" }] },
    { name: "move across shifted array parents", initial: { list: ["a", {}, { children: [] }] }, operations: [{ op: "move", from: "/list/0", path: "/list/1/children/-" }] },
    { name: "move overwrites within a shifted parent", initial: { list: ["a", {}, { child: "old" }] }, operations: [{ op: "move", from: "/list/0", path: "/list/1/child" }] },
    { name: "move replaces an ancestor", initial: { parent: { child: { text: "a" }, sibling: true } }, operations: [{ op: "move", from: "/parent/child", path: "/parent" }] },
  ])("undo $name without replacing the document", ({ initial, operations }) => {
    const document = createJSONDocument(initial);
    const session = createEditingSession({ document, selection: null });
    expect(session.apply({ operations: operations as JSONPatchOperation[], selectionAfter: null, origin: "edit" }).ok).toBe(true);
    const after = document.value;
    const undone = session.undo();
    expect(undone.ok).toBe(true);
    expect(document.value).toEqual(initial);
    if (undone.ok) expect(undone.change?.applied.some((op) => op.path === "")).toBe(false);
    expect(session.redo().ok).toBe(true);
    expect(document.value).toEqual(after);
  });
});
