import { expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { parseCanvasDocument, serializeCanvasDocument, type CanvasDocument } from "@interactive-os/json-document-object-document";
import { createObjectEditor, objectClipboardFormat } from "../src/index.js";

const bounds = { x: 10, y: 20, width: 100, height: 80, label: "Text", color: "blue" };
const initial: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: [
  { ...bounds, id: "text", kind: "text", fontSize: 32 },
  { ...bounds, id: "rect", kind: "rectangle" },
  { ...bounds, id: "image", kind: "image", source: "data:image/png;base64,AQID", color: "transparent" },
] };

test("mixed selection styling is one commit and Undo restores the exact document and causal selection", () => {
  const document = createJSONDocument(initial), commits = vi.fn(); document.subscribe(commits);
  const editor = createObjectEditor(document);
  editor.dispatch({ type: "selection.set", objectIds: ["text", "rect", "image"], primaryKey: "image" });
  const selection = editor.snapshot.selection;
  expect(editor.dispatch({ type: "selection.style", style: { color: "red", fontSize: 48, fontWeight: 700, textAlign: "center", strokeColor: "black", strokeWidth: 4 } }).ok).toBe(true);
  expect(commits).toHaveBeenCalledOnce(); expect(editor.snapshot.selection).toEqual(selection);
  const styled = editor.snapshot.value;
  expect((styled as CanvasDocument).objects[2]).toEqual(initial.objects[2]);
  editor.dispatch({ type: "selection.set", objectIds: ["rect"] });
  editor.undo(); expect(editor.snapshot.value).toEqual(initial); expect(editor.snapshot.selection).toEqual(selection);
  editor.redo(); expect(editor.snapshot.value).toEqual(styled); expect(editor.snapshot.selection).toEqual(selection);
});

test("style no-ops and rejected requests preserve history including a redo branch", () => {
  const editor = createObjectEditor(initial);
  editor.dispatch({ type: "selection.style", style: { color: "red" } }); editor.undo();
  const before = editor.snapshot;
  for (const style of [{ fontWeight: 400, textAlign: "left" }, { strokeWidth: 10 }, {}] as const) {
    expect(editor.dispatch({ type: "selection.style", style }).ok).toBe(true);
    expect(editor.snapshot).toMatchObject({ value: before.value, selection: before.selection, canUndo: false, canRedo: true });
  }
  const beforeReject = editor.snapshot;
  expect(editor.dispatch({ type: "selection.style", style: { color: "red", fontSize: -1 } }).ok).toBe(false);
  expect(editor.snapshot).toEqual(beforeReject); expect(editor.snapshot.canRedo).toBe(true);
  editor.dispatch({ type: "selection.set", objectIds: [] });
  expect(editor.dispatch({ type: "selection.style", style: { color: "red" } })).toMatchObject({ ok: false, code: "selection.empty" });
});

test("all style fields survive duplicate, native payload serialization, fresh-ID paste and JSON reopen", () => {
  let id = 0;
  const editor = createObjectEditor(initial, { createId: () => `new-${++id}` });
  editor.dispatch({ type: "selection.set", objectIds: ["text", "rect"], primaryKey: "text" });
  editor.dispatch({ type: "selection.style", style: { color: "red", fontWeight: 700, textAlign: "right", strokeColor: "black", strokeWidth: 2 } });
  const originals = editor.selectedObjects;
  editor.dispatch({ type: "object.duplicate", objectIds: ["text", "rect"] });
  const clipboard = objectClipboardFormat.parse(JSON.parse(JSON.stringify(editor.copy())))!;
  expect(clipboard).not.toBeNull();
  editor.dispatch({ type: "clipboard.paste", clipboard });
  editor.selectedObjects.forEach((object, index) => expect(object).toEqual({ ...originals[index], id: object.id, x: originals[index]!.x + 24, y: originals[index]!.y + 24 }));
  const saved = serializeCanvasDocument(editor.snapshot.value as CanvasDocument);
  expect(createObjectEditor(parseCanvasDocument(saved)).snapshot.value).toEqual(editor.snapshot.value);
  editor.undo(); expect((editor.snapshot.value as CanvasDocument).objects).toHaveLength(5);
});

test("legacy fill keeps its contract and general style does not paint image metadata", () => {
  const editor = createObjectEditor(initial);
  editor.dispatch({ type: "selection.set", objectIds: ["image"] });
  expect(editor.dispatch({ type: "selection.fill", color: "purple" }).ok).toBe(true);
  expect(editor.selectedObjects[0]!.color).toBe("purple");
  const before = editor.snapshot;
  expect(editor.dispatch({ type: "selection.style", style: { color: "green" } }).ok).toBe(true);
  expect(editor.snapshot).toMatchObject({ value: before.value, selection: before.selection, canUndo: before.canUndo, canRedo: before.canRedo });
});
