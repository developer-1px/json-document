import { expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createCanvasObject, parseCanvasDocument, serializeCanvasDocument, type CanvasDocument } from "@interactive-os/json-document-object-document";
import { createObjectEditor, objectClipboardFormat } from "../src/index.js";

const initial: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: ["rectangle", "ellipse", "sticky-note"].map((kind, index) => ({
  ...createCanvasObject(kind as "rectangle" | "ellipse" | "sticky-note", { x: index * 220, y: 100, width: 200, height: 180 }, { label: "", color: "#fff2a8" }), id: kind,
})) };

test.each(initial.objects)("$kind body editing is one commit and preserves a multi-selection through Undo/Redo", (object) => {
  const source = createJSONDocument(initial), commits = vi.fn(); source.subscribe(commits);
  const editor = createObjectEditor(source);
  editor.dispatch({ type: "selection.set", objectIds: initial.objects.map((item) => item.id), primaryKey: object.id });
  const selection = editor.snapshot.selection;
  expect(editor.dispatch({ type: "object.text", objectId: object.id, text: "본문\n💡" }).ok).toBe(true);
  const written = editor.snapshot.value;
  expect(commits).toHaveBeenCalledOnce(); expect(editor.snapshot.selection).toEqual(selection);
  editor.undo(); expect(editor.snapshot.value).toEqual(initial); expect(editor.snapshot.selection).toEqual(selection);
  editor.redo(); expect(editor.snapshot.value).toEqual(written); expect(editor.snapshot.selection).toEqual(selection);
  expect(editor.dispatch({ type: "object.text", objectId: object.id, text: "" }).ok).toBe(true);
  expect(editor.snapshot.value).toEqual(initial);
});

test("filled body and styles survive resize, duplication, native Clipboard payload, paste, delete and JSON reopen", () => {
  let id = 0;
  const editor = createObjectEditor(initial, { createId: () => `copy-${++id}` });
  initial.objects.forEach((object) => editor.dispatch({ type: "object.text", objectId: object.id, text: `${object.kind}\n한 장` }));
  editor.dispatch({ type: "selection.set", objectIds: initial.objects.map((object) => object.id), primaryKey: "sticky-note" });
  editor.dispatch({ type: "selection.style", style: { textColor: "purple", fontSize: 30, fontWeight: 700, textAlign: "right" } });
  editor.dispatch({ type: "object.resize", objectIds: ["sticky-note"], dx: 0, dy: 0, dw: 40, dh: 20 });
  const originals = editor.selectedObjects;
  expect(editor.dispatch({ type: "object.duplicate", objectIds: editor.snapshot.selection.keys }).ok).toBe(true);
  const copies = editor.selectedObjects;
  copies.forEach((object, index) => expect(object).toEqual({ ...originals[index], id: object.id, x: originals[index]!.x + 24, y: originals[index]!.y + 24 }));
  const clipboard = objectClipboardFormat.parse(JSON.parse(JSON.stringify(editor.copy())))!;
  expect(clipboard.text).toBe("rectangle\n한 장\nellipse\n한 장\nsticky-note\n한 장");
  expect(editor.dispatch({ type: "clipboard.paste", clipboard }).ok).toBe(true);
  editor.selectedObjects.forEach((object, index) => expect(object).toEqual({ ...copies[index], id: object.id }));
  const beforeDelete = editor.snapshot.value, selection = editor.snapshot.selection;
  expect(editor.dispatch({ type: "selection.remove" }).ok).toBe(true);
  editor.undo(); expect(editor.snapshot.value).toEqual(beforeDelete); expect(editor.snapshot.selection).toEqual(selection);
  expect(new Set((beforeDelete as CanvasDocument).objects.map((object) => object.id)).size).toBe(9);
  expect(createObjectEditor(parseCanvasDocument(serializeCanvasDocument(beforeDelete as CanvasDocument))).snapshot.value).toEqual(beforeDelete);
});
