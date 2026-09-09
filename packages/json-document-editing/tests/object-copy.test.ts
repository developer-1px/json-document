import { expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createObjectEditor, objectClipboardFormat, type ObjectClipboard, type ObjectIntent } from "../src/index.js";
import type { CanvasDocument } from "@interactive-os/json-document-object-document";

const initial: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: [
  { id: "text", kind: "text", x: 10, y: 20, width: 200, height: 80, color: "black", label: "Hello", fontSize: 32 },
  { id: "path", kind: "path", x: 100, y: 120, width: 150, height: 60, color: "blue", label: "Drawing", strokeWidth: 3, points: [{ x: 0, y: 1 }, { x: 1, y: 0 }] },
] };

function setup() {
  let id = 0;
  const document = createJSONDocument(initial);
  const editor = createObjectEditor(document, { createId: () => `copy-${++id}` });
  editor.dispatch({ type: "selection.set", objectIds: ["text", "path"], primaryKey: "text" });
  const commits = vi.fn(); document.subscribe(commits);
  return { editor, document, commits };
}

test.each(["object.duplicate", "clipboard.paste"] as const)("%s remaps primary and fresh identities, preserves order/shape, and commits once", (type) => {
  const { editor, document, commits } = setup();
  const selection = editor.snapshot.selection;
  const clipboard = editor.copy()!;
  expect(clipboard.primaryKey).toBe("text"); expect(clipboard.text).toBe("Hello\nDrawing");
  const placement = { type: "offset", dx: 70, dy: -30 } as const;
  const intent: ObjectIntent = type === "object.duplicate" ? { type, objectIds: ["path", "text", "path"], placement } : { type, clipboard, placement };
  expect(editor.dispatch(intent).ok).toBe(true);
  const after = document.value as CanvasDocument;
  expect(after.objects.slice(0, 2)).toEqual(initial.objects);
  expect(after.objects.slice(2)).toEqual(initial.objects.map((object, index) => ({ ...object, id: `copy-${index + 1}`, x: object.x + 70, y: object.y - 30 })));
  expect(editor.snapshot.selection).toEqual({ kind: "explicit", keys: ["copy-1", "copy-2"], primaryKey: "copy-1" });
  expect(commits).toHaveBeenCalledOnce();
  expect(editor.undo().ok).toBe(true); expect(document.value).toEqual(initial); expect(editor.snapshot.selection).toEqual(selection);
  expect(editor.snapshot.canUndo).toBe(false);
  expect(editor.redo().ok).toBe(true); expect(document.value).toEqual(after); expect(editor.snapshot.selection.primaryKey).toBe("copy-1");
});

test("repeat duplicate operates on the newly selected set with the default offset", () => {
  const { editor } = setup();
  for (let index = 1; index <= 2; index++) {
    expect(editor.dispatch({ type: "object.duplicate", objectIds: editor.snapshot.selection.keys }).ok).toBe(true);
    expect(editor.selectedObjects[0]!.x).toBe(10 + 24 * index);
    expect(editor.selectedObjects[0]!.id).toBe(`copy-${index * 2 - 1}`);
  }
});

test("legacy clipboard remains readable and cross-document paste cannot reuse source IDs", () => {
  const clipboard: ObjectClipboard = { type: objectClipboardFormat.mimeType, objects: initial.objects, text: "Hello\nDrawing" };
  let id = 0;
  const ids = ["text", "path", "new-text", "new-path"];
  const editor = createObjectEditor({ ...initial, objects: [] }, { createId: () => ids[id++]! });
  expect(objectClipboardFormat.parse(clipboard)).toEqual(clipboard);
  expect(editor.dispatch({ type: "clipboard.paste", clipboard }).ok).toBe(true);
  expect(editor.snapshot.selection).toMatchObject({ keys: ["new-text", "new-path"], primaryKey: "new-path" });
  expect(objectClipboardFormat.parse({ ...clipboard, primaryKey: "missing" })).toBeNull();
  expect(objectClipboardFormat.parse({ ...clipboard, primaryKey: 1 })).toBeNull();
});

test("invalid targets, geometry, profile payload and exhausted IDs never partially mutate selection/history/document", () => {
  const { editor, document, commits } = setup();
  const before = editor.snapshot;
  const clipboard = editor.copy()!;
  const intents: ObjectIntent[] = [
    { type: "object.duplicate", objectIds: ["text", "missing"] },
    { type: "object.duplicate", objectIds: [] },
    { type: "object.duplicate", objectIds: ["text"], placement: { type: "offset", dx: Infinity, dy: 0 } },
    { type: "object.remove", objectIds: ["text", "missing"] },
    { type: "clipboard.paste", clipboard: { ...clipboard, objects: [{ ...initial.objects[0]!, kind: "unknown" }] } },
  ];
  for (const intent of intents) { expect(editor.dispatch(intent).ok).toBe(false); expect(editor.snapshot).toEqual(before); }
  expect(document.value).toEqual(initial); expect(commits).not.toHaveBeenCalled();
  const exhausted = createObjectEditor(initial, { createId: () => "text" });
  for (const intent of [{ type: "object.duplicate", objectIds: ["text"] }, { type: "clipboard.paste", clipboard }] as const) {
    expect(exhausted.dispatch(intent)).toMatchObject({ ok: false, code: "object.identity-unavailable" });
    expect(exhausted.snapshot.value).toEqual(initial); expect(exhausted.snapshot.canUndo).toBe(false);
  }
});

test("captured clipboard targets can be removed after selection changes without deleting the new selection", () => {
  const { editor, commits } = setup();
  editor.dispatch({ type: "selection.set", objectIds: ["text"] });
  const clipboard = editor.copy()!;
  editor.dispatch({ type: "selection.set", objectIds: ["path"] });
  expect(editor.dispatch({ type: "object.remove", objectIds: clipboard.objects.map((object) => object.id) }).ok).toBe(true);
  expect((editor.snapshot.value as CanvasDocument).objects.map((object) => object.id)).toEqual(["path"]);
  expect(commits).toHaveBeenCalledOnce();
  expect(editor.undo().ok).toBe(true); expect(editor.snapshot.value).toEqual(initial);
});
