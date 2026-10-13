import { describe, expect, it } from "vitest";
import { createUIComponentObject, type CanvasDocument } from "@interactive-os/json-document-object-document";
import { createUIBuilderEditor, createUIBuilderTools } from "../src/ui-builder.js";
const empty = (): CanvasDocument => ({ profile: "canvas/1", width: 1200, height: 900, objects: [] });
const button = { id: "", component: "button", x: 80, y: 160, width: 160, height: 48, text: "시작", detail: "", items: [], tone: "accent" };
function setup() {
  const editor = createUIBuilderEditor(empty());
  const [read, apply] = createUIBuilderTools(editor);
  return { editor, read: () => read!.execute({}), apply: (components: unknown[], removeIds: string[] = []) => apply!.execute({ components, removeIds }) };
}
describe("UI Builder editing", () => {
  it("requires a fresh read and preserves intervening manual work", () => {
    const s = setup();
    expect(s.apply([button])).toMatchObject({ ok: false, code: "ui-builder.read-required" });
    s.read();
    s.editor.dispatch({ type: "object.create", object: createUIComponentObject("heading", { x: 20, y: 20 }) });
    expect(s.apply([button])).toMatchObject({ ok: false, code: "ui-builder.stale-document" });
    expect((s.editor.snapshot.value as CanvasDocument).objects).toHaveLength(1);
    s.read(); expect(s.apply([button])).toMatchObject({ ok: true });
  });
  it("applies a batch in one undo and shares history with manual movement", () => {
    const s = setup(); s.read();
    expect(s.apply([button, { ...button, component: "heading", y: 80 }])).toMatchObject({ ok: true });
    const objects = (s.editor.snapshot.value as CanvasDocument).objects;
    expect(objects).toHaveLength(2);
    s.editor.dispatch({ type: "object.translate", objectIds: [objects[0]!.id], dx: 42, dy: 20 });
    expect((s.editor.snapshot.value as CanvasDocument).objects[0]!.x).toBe(122);
    s.editor.undo(); expect((s.editor.snapshot.value as CanvasDocument).objects[0]!.x).toBe(80);
    s.editor.undo(); expect((s.editor.snapshot.value as CanvasDocument).objects).toHaveLength(0);
    s.editor.redo(); expect((s.editor.snapshot.value as CanvasDocument).objects).toHaveLength(2);
  });
  it("rejects invalid batches atomically and refuses code/unknown components", () => {
    const s = setup(); s.read();
    for (const bad of [{ ...button, component: "html" }, { ...button, width: -1 }, { ...button, tone: "url(x)" }, { ...button, items: [4] }, { ...button, id: "missing" }, { ...button, detail: null }, { ...button, items: null }]) {
      expect(s.apply([button, bad])).toMatchObject({ ok: false });
      expect((s.editor.snapshot.value as CanvasDocument).objects).toHaveLength(0);
    }
  });
  it("guards the document port against manual, clipboard and replacement bypasses", () => {
    const s = setup();
    expect(s.editor.dispatch({ type: "object.create", object: { kind: "rectangle", label: "bypass", color: "red", x: 0, y: 0, width: 30, height: 30 } })).toMatchObject({ ok: false });
    s.editor.dispatch({ type: "object.create", object: createUIComponentObject("input", { x: 0, y: 0 }) });
    const id = s.editor.snapshot.selection.primaryKey!;
    expect(s.editor.dispatch({ type: "object.document", objectId: id, document: { component: "html" } })).toMatchObject({ ok: false });
    expect(s.editor.dispatch({ type: "object.duplicate", objectIds: [id] })).toMatchObject({ ok: true });
    expect((s.editor.snapshot.value as CanvasDocument).objects).toHaveLength(2);
  });
  it("updates only requested IDs and removes explicitly while preserving other content", () => {
    const s = setup(); s.read(); s.apply([button, { ...button, component: "text" }]);
    const [a, b] = (s.editor.snapshot.value as CanvasDocument).objects;
    expect(s.apply([{ ...button, id: a!.id, text: "바뀐 버튼" }])).toMatchObject({ ok: true });
    expect((s.editor.snapshot.value as CanvasDocument).objects[1]).toEqual(b);
    expect(s.apply([], [a!.id])).toMatchObject({ ok: true });
    expect((s.editor.snapshot.value as CanvasDocument).objects).toEqual([b]);
  });
});
