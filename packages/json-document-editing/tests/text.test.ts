import { describe, expect, test } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { clampTextSelection, createTextEditor } from "../src/index.js";

describe("source text editing", () => {
  test("preserves syntax and line endings and restores directional selection with history", () => {
    const source = "A **한😀글**  \r\n__B__\r\n";
    const document = createJSONDocument({ source });
    const editor = createTextEditor(document, "/source");
    editor.select({ anchor: 8, focus: 4 });
    expect(editor.copy()).toBe("한😀글");
    expect(editor.insert("새 글").ok).toBe(true);
    expect(editor.text).toBe("A **새 글**  \r\n__B__\r\n");
    expect(editor.snapshot.selection).toEqual({ anchor: 7, focus: 7 });
    expect(editor.undo().ok).toBe(true);
    expect(editor.text).toBe(source);
    expect(editor.snapshot.selection).toEqual({ anchor: 8, focus: 4 });
    expect(editor.redo().ok).toBe(true);
    expect(editor.snapshot.selection).toEqual({ anchor: 7, focus: 7 });
  });

  test("root strings are documents; selection-only changes create no history", () => {
    const document = createJSONDocument("**raw**");
    const editor = createTextEditor(document);
    editor.replace(editor.text, { anchor: 2, focus: 5 });
    expect(editor.snapshot.canUndo).toBe(false);
    editor.insert("");
    expect(document.value).toBe("****");
    editor.undo();
    expect(document.value).toBe("**raw**");
  });

  test("clamps invalid and scalar-splitting positions and reconciles shorter external source", () => {
    expect(clampTextSelection("A😀B", { anchor: 2, focus: 2 })).toEqual({ anchor: 3, focus: 3 });
    expect(clampTextSelection("A😀B", { anchor: 3, focus: 2 })).toEqual({ anchor: 3, focus: 1 });
    expect(clampTextSelection("A😀B", { anchor: -9, focus: Infinity })).toEqual({ anchor: 0, focus: 0 });
    const document = createJSONDocument("abcdef");
    const editor = createTextEditor(document);
    editor.select({ anchor: 6, focus: 3 });
    document.commit([{ op: "replace", path: "", value: "a" }]);
    expect(editor.snapshot.selection).toEqual({ anchor: 1, focus: 1 });
    document.commit([{ op: "replace", path: "", value: 42 }]);
    expect(editor.replace("lost", { anchor: 0, focus: 0 })).toEqual({ ok: false, code: "text.target-unavailable" });
    expect(editor.insert("lost")).toEqual({ ok: false, code: "text.target-unavailable" });
  });
});
