import { expect, test } from "vitest";
import { createCanvasEditorTools, createObjectEditor } from "../src/index.js";
import type { CanvasDocument } from "@interactive-os/json-document-object-document";

function setup(shared = false) {
  const editor = createObjectEditor({ profile: "canvas/1", width: 1280, height: 720, objects: [
    { id: "a", kind: "rectangle", x: 0, y: 0, width: 100, height: 80, label: "A", color: "#fff" },
    { id: "b", kind: "rectangle", x: 200, y: 0, width: 100, height: 80, label: "B", color: "#fff" },
  ] });
  const toolsA = createCanvasEditorTools(editor);
  const toolsB = shared ? toolsA : createCanvasEditorTools(editor);
  const call = (tools: typeof toolsA, name: string, args: unknown = {}) => tools.find(t => t.name === name)!.execute(args);
  return { editor, a: (name: string, args?: unknown) => call(toolsA, name, args), b: (name: string, args?: unknown) => call(toolsB, name, args), value: () => editor.snapshot.value as CanvasDocument };
}
test("independent agent tools reject even disjoint edits until reread", () => {
  const s = setup(); s.a("read_canvas"); s.b("read_canvas");
  expect(s.a("update_canvas_object", { objectId: "a", changes: { label: "A1" } })).toMatchObject({ ok: true });
  expect(s.b("update_canvas_object", { objectId: "b", changes: { label: "B1" } })).toMatchObject({ ok: false, code: "canvas.stale-document" });
  s.b("read_canvas");
  expect(s.b("update_canvas_object", { objectId: "b", changes: { label: "B1" } })).toMatchObject({ ok: true });
  expect(s.value().objects.map(o => o.label)).toEqual(["A1", "B1"]);
});
test("shared tool instance silently allows an outdated agent to overwrite same field", () => {
  const s = setup(true); s.a("read_canvas"); s.b("read_canvas");
  expect(s.a("update_canvas_object", { objectId: "a", changes: { label: "A1" } })).toMatchObject({ ok: true });
  expect(s.b("update_canvas_object", { objectId: "a", changes: { label: "B1" } })).toMatchObject({ ok: true });
  expect(s.value().objects[0]?.label).toBe("B1");
});
test("an agent undo after reread undoes the other agent's latest edit", () => {
  const s = setup(); s.a("read_canvas");
  s.a("update_canvas_object", { objectId: "a", changes: { label: "A1" } });
  s.b("read_canvas"); s.b("update_canvas_object", { objectId: "b", changes: { label: "B1" } });
  s.a("read_canvas"); expect(s.a("undo_canvas")).toMatchObject({ ok: true });
  expect(s.value().objects.map(o => o.label)).toEqual(["A1", "B"]);
});
