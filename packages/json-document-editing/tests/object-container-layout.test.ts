import { expect, test } from "vitest";
import { createObjectEditor, createCanvasEditorTools } from "../src/index.js";
import { defaultObjectContainerPolicy, type CanvasDocument, type ObjectTextMeasurer } from "@interactive-os/json-document-object-document";
const box = { id: "box", kind: "rectangle", x: 0, y: 0, width: 300, height: 200, label: "", color: "white" } as const;
const title = { id: "title", kind: "text", x: 20, y: 20, width: 260, height: 20, label: "Title", color: "black", fontSize: 16 } as const;
const body = { ...title, id: "body", y: 60, label: "Body" };
const doc: CanvasDocument = { profile: "canvas/1", width: 800, height: 600, objects: [box, title, body] };
const measure: ObjectTextMeasurer = text => ({ width: Math.max(1, text.text.length * 10), height: Math.max(1, Math.ceil(text.text.length * 10 / text.width)) * 20 });
function setup(value = doc) {
  const editor = createObjectEditor(value, { containerPolicy: defaultObjectContainerPolicy, measureText: measure });
  return { editor, objects: () => (editor.snapshot.value as CanvasDocument).objects };
}
test("30 percent of content area controls containment and chooses the smallest containing box", () => {
  const a = { ...title, x: 285, y: 10, width: 50, label: "a" };
  const { editor, objects } = setup({ ...doc, objects: [box, a] });
  expect(objects()[1]!.parentId).toBe("box"); // 15 / 50 = 30%
  editor.dispatch({ type: "object.translate", objectIds: ["title"], dx: 1, dy: 0 });
  expect(objects()[1]!.parentId).toBeUndefined();
  const nested = setup({ ...doc, objects: [box, { ...box, id: "inner", x: 10, y: 10, width: 100, height: 100 }, { ...title, width: 50 }] });
  expect(nested.objects().find(o => o.id === "title")!.parentId).toBe("inner");
});
test("moving a box includes descendants exactly once and undo restores the whole layout", () => {
  const { editor, objects } = setup(); const initial = editor.snapshot.value;
  expect(objects()[0]!.containerLayout).toMatchObject({ direction: "vertical", gap: 20 });
  editor.dispatch({ type: "object.translate", objectIds: ["box", "title"], dx: 100, dy: 80 });
  expect(objects()[0]).toMatchObject({ x: 100, y: 80 });
  expect(objects()[1]).toMatchObject({ x: 120, y: 100, parentId: "box" });
  expect(objects()[2]).toMatchObject({ x: 120, y: 140, parentId: "box" });
  editor.undo(); expect(editor.snapshot.value).toEqual(initial);
});
test("text growth reflows siblings and box height in the same agent history entry", () => {
  const { editor, objects } = setup();
  const tools = createCanvasEditorTools(editor);
  tools.find(t => t.name === "read_canvas")!.execute({});
  const before = editor.snapshot.value;
  expect(tools.find(t => t.name === "update_canvas_object")!.execute({ objectId: "title", changes: { label: "x".repeat(60) } })).toMatchObject({ ok: true });
  expect(objects()[1]).toMatchObject({ height: 60 });
  expect(objects()[2]).toMatchObject({ y: 100 });
  expect(objects()[0]).toMatchObject({ height: 240 });
  editor.undo(); expect(editor.snapshot.value).toEqual(before);
});
test("box width rewraps fixed text, duplication remaps children, and deleting a box keeps its content", () => {
  const { editor, objects } = setup();
  editor.dispatch({ type: "object.resize", objectIds: ["box"], dx: 0, dy: 0, dw: -100, dh: 0 });
  expect(objects()[1]!.width).toBe(160);
  editor.dispatch({ type: "object.duplicate", objectIds: ["box"] });
  expect(objects()).toHaveLength(6);
  const copy = objects().filter(o => o.id !== "box" && o.kind === "rectangle")[0]!;
  expect(objects().filter(o => o.parentId === copy.id)).toHaveLength(2);
  editor.dispatch({ type: "object.remove", objectIds: ["box"] });
  expect(objects().find(o => o.id === "title")).toBeDefined();
  expect(objects().find(o => o.id === "title")!.parentId).toBeUndefined();
});
test("invalid parent cycles and invalid layout are atomic", () => {
  const { editor } = setup(); const before = editor.snapshot.value;
  expect(editor.dispatch({ type: "object.update", objectId: "box", changes: { parentId: "box" } }).ok).toBe(false);
  expect(editor.dispatch({ type: "object.update", objectId: "box", changes: { containerLayout: { direction: "vertical", gap: -1, padding: { top: 0, right: 0, bottom: 0, left: 0 } } } }).ok).toBe(false);
  expect(editor.snapshot.value).toBe(before);
});

test("copying a child detaches its external parent while copying a box retains the subtree", () => {
  const { editor } = setup();
  editor.dispatch({ type: "selection.set", objectIds: ["title"] });
  const child = editor.copy()!;
  expect(child.objects).toHaveLength(1);
  expect(child.objects[0]!.parentId).toBeUndefined();
  expect(editor.dispatch({ type: "clipboard.paste", clipboard: child }).ok).toBe(true);
  editor.dispatch({ type: "selection.set", objectIds: ["box"] });
  const group = editor.copy()!;
  expect(group.objects.length).toBeGreaterThan(2);
  expect(editor.dispatch({ type: "clipboard.paste", clipboard: group, placement: { type: "offset", dx: 400, dy: 0 } }).ok).toBe(true);
});
