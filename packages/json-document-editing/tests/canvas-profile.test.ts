import { expect, test } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createCanvasObject, createCanvasPath, parseCanvasDocument, serializeCanvasDocument, type CanvasDocument } from "@interactive-os/json-document-object-document";
import { createObjectEditor, type ObjectIntent } from "../src/index.js";

const blank: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: [] };
const text = createCanvasObject("text", { x: 10, y: 20, width: 200, height: 100 }, { color: "black", label: "Text" });

test("Canvas creation, direct text edit, transform and deletion use the existing selection-restoring history", () => {
  const source = createJSONDocument(blank);
  let commits = 0;
  source.subscribe(() => commits++);
  const editor = createObjectEditor(source, { createId: () => "a" });
  expect(editor.dispatch({ type: "object.create", object: text }).ok).toBe(true);
  expect(editor.snapshot.selection.keys).toEqual(["a"]);
  expect(commits).toBe(1);
  expect(editor.dispatch({ type: "object.text", objectId: "a", text: "A slide\n한 장" }).ok).toBe(true);
  expect(commits).toBe(2);
  const written = editor.snapshot.value;
  expect(editor.dispatch({ type: "object.resize", objectIds: ["a"], dx: 10, dy: 10, dw: 100, dh: 50 }).ok).toBe(true);
  expect(commits).toBe(3);
  expect(editor.undo().ok).toBe(true);
  expect(editor.snapshot.value).toEqual(written);
  expect(editor.snapshot.selection.keys).toEqual(["a"]);
  editor.redo();
  const resized = editor.snapshot.value;
  editor.dispatch({ type: "selection.remove" });
  expect(editor.snapshot.value).toEqual(blank);
  editor.undo();
  expect(editor.snapshot.value).toEqual(resized);
  expect(editor.snapshot.selection.keys).toEqual(["a"]);
});

test("invalid imports and mutations leave document, selection, revision and history untouched", () => {
  const editor = createObjectEditor(blank, { createId: () => "a" });
  editor.dispatch({ type: "object.create", object: text });
  for (const intent of [
    { type: "object.create", object: { ...text, width: -10 } },
    { type: "object.translate", objectIds: ["a"], dx: Infinity, dy: 0 },
    { type: "document.replace", document: { ...blank, objects: [{ ...text, id: "bad", kind: "unknown" }] } },
    { type: "document.replace", document: { objects: [] } },
    { type: "unsupported" },
  ]) {
    const before = editor.snapshot;
    expect(editor.dispatch(intent as ObjectIntent).ok).toBe(false);
    expect(editor.snapshot).toEqual(before);
  }
});

test("JSON reopening is one undoable transaction, keeps IDs and clears only transient selection", () => {
  const editor = createObjectEditor(blank);
  const saved: CanvasDocument = { ...blank, objects: [{ ...createCanvasPath([{ x: 1, y: 2 }, { x: 40, y: 70 }], { color: "black", label: "Path", strokeWidth: 3 }), id: "p" }] };
  expect(editor.dispatch({ type: "document.replace", document: parseCanvasDocument(serializeCanvasDocument(saved)) }).ok).toBe(true);
  expect(editor.snapshot.value).toEqual(saved);
  expect(editor.snapshot.selection.keys).toEqual([]);
  editor.undo(); expect(editor.snapshot.value).toEqual(blank);
  editor.redo(); expect(editor.snapshot.value).toEqual(saved);
  const next = createObjectEditor(parseCanvasDocument(serializeCanvasDocument(editor.snapshot.value as CanvasDocument)));
  expect(next.snapshot.value).toEqual(saved);
  expect(next.snapshot.canUndo).toBe(false);
});

test("a zero-distance gesture does not create history or clear redo", () => {
  const editor = createObjectEditor(blank, { createId: () => "a" });
  editor.dispatch({ type: "object.create", object: text });
  editor.dispatch({ type: "object.text", objectId: "a", text: "Changed" });
  editor.undo();
  editor.dispatch({ type: "object.translate", objectIds: ["a"], dx: 0, dy: 0 });
  expect(editor.snapshot.canRedo).toBe(true);
  editor.undo(); expect(editor.snapshot.value).toEqual(blank);
});
