import { expect, test } from "vitest";
import { createObjectEditor, createCanvasEditorTools } from "../src/index.js";
import type { CanvasDocument, ObjectTextMeasurer } from "@interactive-os/json-document-object-document";
const measure: ObjectTextMeasurer = text => {
  const widths = text.text.split("\n").map(line => Math.max(1, line.length * 10));
  return { width: Math.max(...widths), height: widths.reduce((n, width) => n + (text.widthMode === "auto" ? 1 : Math.ceil(width / text.width)), 0) * 20 };
};
function setup() {
  const doc: CanvasDocument = { profile: "canvas/1", width: 800, height: 600, objects: [
    { id: "text", kind: "text", label: "abcdefghij", color: "black", fontSize: 16, x: 10, y: 20, width: 50, height: 999 },
  ] };
  const editor = createObjectEditor(doc, { measureText: measure });
  return { editor, text: () => (editor.snapshot.value as CanvasDocument).objects[0]! };
}
test("auto/fixed transitions and text height belong to one history edit", () => {
  const { editor, text } = setup();
  expect(text()).toMatchObject({ width: 50, height: 40 });
  expect(editor.snapshot.canUndo).toBe(false);
  editor.dispatch({ type: "object.update", objectId: "text", changes: { widthMode: "auto" } });
  expect(text()).toMatchObject({ widthMode: "auto", width: 100, height: 20 });
  editor.dispatch({ type: "object.text", objectId: "text", text: "abcdefghijklmnopqrst\n" });
  expect(text()).toMatchObject({ width: 200, height: 40 });
  editor.undo();
  expect(text()).toMatchObject({ label: "abcdefghij", width: 100, height: 20 });
  editor.dispatch({ type: "object.resize", objectIds: ["text"], dx: 0, dy: 0, dw: -75, dh: 100 });
  expect(text()).toMatchObject({ widthMode: "fixed", width: 25, height: 80 });
  editor.undo(); expect(text()).toMatchObject({ widthMode: "auto", width: 100, height: 20 });
  editor.redo(); expect(text()).toMatchObject({ widthMode: "fixed", width: 25, height: 80 });
});
test("agent updates share text measurement and reject invalid mode without history", () => {
  const { editor, text } = setup();
  const tools = createCanvasEditorTools(editor);
  const call = (name: string, args = {}) => tools.find(tool => tool.name === name)!.execute(args) as { ok: boolean };
  call("read_canvas");
  expect(call("update_canvas_object", { objectId: "text", changes: { widthMode: "auto" } }).ok).toBe(true);
  expect(text()).toMatchObject({ width: 100, height: 20 });
  expect(call("update_canvas_object", { objectId: "text", changes: { width: 20 } }).ok).toBe(true);
  expect(text()).toMatchObject({ widthMode: "fixed", width: 20, height: 100 });
  const before = editor.snapshot.value;
  expect(call("update_canvas_object", { objectId: "text", changes: { widthMode: "invalid" } }).ok).toBe(false);
  expect(editor.snapshot.value).toBe(before);
  editor.undo(); expect(text()).toMatchObject({ widthMode: "auto", width: 100, height: 20 });
});
