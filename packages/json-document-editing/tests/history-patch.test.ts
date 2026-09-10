import { describe, expect, test } from "vitest";
import { createJSONDocument, type JSONPatchOperation } from "@interactive-os/json-document";
import { restoreHistoryPatch, storeHistoryPatch } from "../src/history-patch.js";
import { createEditingSession, createTextEditor } from "../src/index.js";

describe("local text history storage", () => {
  test("retains changed text instead of the unchanged 50,000-character context", () => {
    const before = "한".repeat(25000) + "😀" + "글".repeat(25000);
    const after = "한".repeat(25000) + "😄입력" + "글".repeat(25000);
    const document = createJSONDocument({ source: before });
    const forward: JSONPatchOperation[] = [{ op: "replace", path: "/source", value: after }];
    const inverse: JSONPatchOperation[] = [{ op: "replace", path: "/source", value: before }];
    const stored = storeHistoryPatch(forward, inverse, undefined);
    expect(JSON.stringify(stored).length).toBeLessThan(256);
    expect(restoreHistoryPatch(document, stored.forward)).toEqual(forward);
    document.commit(forward);
    expect(restoreHistoryPatch(document, stored.inverse)).toEqual(inverse);
    document.commit([{ op: "replace", path: "/source", value: "external" }]);
    expect(restoreHistoryPatch(document, stored.inverse)).toBeNull();
  });

  test("preserves every undo step and directional selection through hundreds of replacements", () => {
    const original = "한".repeat(10000);
    const editor = createTextEditor(createJSONDocument(original));
    editor.select({ anchor: 20, focus: 10 });
    for (let index = 0; index < 500; index++) {
      expect(editor.replace(original + index, { anchor: original.length, focus: original.length }).ok).toBe(true);
    }
    for (let index = 499; index >= 0; index--) {
      expect(editor.undo().ok).toBe(true);
      expect(editor.text).toBe(index === 0 ? original : original + (index - 1));
    }
    expect(editor.snapshot.selection).toEqual({ anchor: 20, focus: 10 });
    expect(editor.snapshot.canUndo).toBe(false);
    for (let index = 0; index < 500; index++) expect(editor.redo().ok).toBe(true);
    expect(editor.text).toBe(original + 499);
  });

  test("ignored writes preserve full-replacement Undo and Redo semantics", () => {
    const original = "a".repeat(1000);
    const document = createJSONDocument({ source: original, n: 0 });
    const session = createEditingSession({ document, selection: null });
    const apply = (value: string, history?: "ignore") => session.apply({
      operations: [{ op: "replace", path: "/source", value }], selectionAfter: null, origin: "test", ...(history ? { history } : {}),
    });
    apply(original + "x");
    session.apply({ operations: [{ op: "replace", path: "/n", value: 1 }], selectionAfter: null, origin: "test" });
    apply(original + "xy");
    session.undo();
    apply("ignored " + original + "x", "ignore");
    // Retained redo is the original complete replace, even after an unrecorded change.
    expect(session.redo().ok).toBe(true);
    expect(document.at("/source")).toMatchObject({ value: original + "xy" });
    expect(session.undo().ok).toBe(true);
    expect(document.at("/source")).toMatchObject({ value: original + "x" });
    expect(session.undo().ok).toBe(true);
    expect(document.at("/n")).toMatchObject({ value: 0 });
    expect(session.undo().ok).toBe(true);
    expect(document.at("/source")).toMatchObject({ value: original });
  });

  test("grouped and general JSON Patch retain their existing representation", () => {
    const forward: JSONPatchOperation[] = [{ op: "replace", path: "", value: "after" }];
    const inverse: JSONPatchOperation[] = [{ op: "replace", path: "", value: "before" }];
    expect(storeHistoryPatch(forward, inverse, "typing")).toEqual({ forward, inverse });
    const remove: JSONPatchOperation[] = [{ op: "remove", path: "/source" }];
    expect(storeHistoryPatch(remove, inverse, undefined)).toEqual({ forward: remove, inverse });
  });
});
