import { describe, expect, it } from "vitest";
import { createCanvasEditorTools, createObjectEditor } from "../src/index.js";
import type { CanvasDocument } from "@interactive-os/json-document-object-document";
const document: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: [] };
const object = { kind: "rectangle", x: 10, y: 20, width: 100, height: 80, label: "Hello", color: "#fff" };
function setup() {
  const editor = createObjectEditor(document);
  const tools = createCanvasEditorTools(editor);
  const call = (name: string, args: unknown = {}) => tools.find(tool => tool.name === name)!.execute(args) as { ok: boolean; code?: string };
  return { editor, call };
}
describe("Canvas editor tools", () => {
  it("requires reading, then preserves IDs, other properties, and shared history", () => {
    const { editor, call } = setup();
    expect(call("create_canvas_object", { object })).toMatchObject({ code: "canvas.read-required" });
    call("read_canvas"); expect(call("create_canvas_object", { object }).ok).toBe(true);
    const id = editor.snapshot.selection.primaryKey!;
    expect(call("update_canvas_object", { objectId: id, changes: { label: "Updated", x: 50 } }).ok).toBe(true);
    expect((editor.snapshot.value as CanvasDocument).objects[0]).toMatchObject({ ...object, id, label: "Updated", x: 50 });
    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as CanvasDocument).objects[0]?.label).toBe("Hello");
    expect(call("redo_canvas")).toMatchObject({ code: "canvas.stale-document" });
    call("read_canvas"); expect(call("redo_canvas").ok).toBe(true);
  });
  it("rejects stale source after a human changes the document", () => {
    const { editor, call } = setup(); call("read_canvas");
    editor.dispatch({ type: "object.create", object });
    const before = editor.snapshot.value;
    expect(call("create_canvas_object", { object })).toMatchObject({ code: "canvas.stale-document" });
    expect(editor.snapshot.value).toEqual(before);
  });
  it("rejects malformed objects, extra keys, missing IDs and invalid orders atomically", () => {
    const { editor, call } = setup(); call("read_canvas");
    for (const invalid of [{ ...object, width: -1 }, { ...object, x: NaN }, { ...object, id: "injected" }, { ...object, kind: "unknown" }]) {
      expect(call("create_canvas_object", { object: invalid }).ok).toBe(false);
      expect(editor.snapshot.canUndo).toBe(false);
    }
    call("create_canvas_object", { object });
    const before = editor.snapshot.value;
    const id = editor.snapshot.selection.primaryKey!;
    expect(call("update_canvas_object", { objectId: id, changes: { id: "new" } }).ok).toBe(false);
    expect(call("update_canvas_object", { objectId: id, changes: { fontWeight: 900 } }).ok).toBe(false);
    expect(call("update_canvas_object", { objectId: "missing", changes: { label: "bad" } }).ok).toBe(false);
    expect(call("remove_canvas_objects", { objectIds: [id, "missing"] }).ok).toBe(false);
    expect(call("reorder_canvas_objects", { objectIds: [] }).ok).toBe(false);
    expect(call("undo_canvas", { unexpected: true }).ok).toBe(false);
    expect(editor.snapshot.value).toEqual(before);
  });
  it("reorders and deletes with one undo step per operation", () => {
    const { editor, call } = setup(); call("read_canvas");
    call("create_canvas_object", { object }); call("create_canvas_object", { object: { ...object, kind: "text", label: "Second" } });
    const ids = (editor.snapshot.value as CanvasDocument).objects.map(object => object.id);
    expect(call("reorder_canvas_objects", { objectIds: [...ids].reverse() }).ok).toBe(true);
    expect((editor.snapshot.value as CanvasDocument).objects.map(object => object.id)).toEqual([...ids].reverse());
    call("undo_canvas"); expect((editor.snapshot.value as CanvasDocument).objects.map(object => object.id)).toEqual(ids);
    expect(call("remove_canvas_objects", { objectIds: [ids[0]] }).ok).toBe(true);
    expect((editor.snapshot.value as CanvasDocument).objects).toHaveLength(1);
    call("undo_canvas"); expect((editor.snapshot.value as CanvasDocument).objects).toHaveLength(2);
  });
  it("canonical update and order commands validate independently of AI tools", () => {
    const { editor, call } = setup(); call("read_canvas"); call("create_canvas_object", { object });
    const id = editor.snapshot.selection.primaryKey!;
    const before = editor.snapshot.value;
    expect(editor.dispatch({ type: "object.update", objectId: id, changes: { id: "changed" } }).ok).toBe(false);
    expect(editor.dispatch({ type: "object.update", objectId: id, changes: { width: -10 } }).ok).toBe(false);
    expect(editor.dispatch({ type: "object.reorder", objectIds: [id, id] }).ok).toBe(false);
    expect(editor.snapshot.value).toEqual(before);
  });
});

it("rejects text repeated inside a labelled shape and allows a blank background", () => {
  const { editor, call } = setup(); call("read_canvas"); call("create_canvas_object", { object });
  const id = editor.snapshot.selection.primaryKey!;
  const heading = { ...object, kind: "text", width: 80, height: 30, fontSize: 16, label: "1. Hello" };
  expect(call("create_canvas_object", { object: heading })).toMatchObject({ code: "canvas.duplicate-visible-text" });
  expect((editor.snapshot.value as CanvasDocument).objects).toHaveLength(1);
  call("update_canvas_object", { objectId: id, changes: { label: "" } });
  expect(call("create_canvas_object", { object: heading }).ok).toBe(true);
});

it("creates raster images, edits their bounds, and rejects remote sources atomically", () => {
  const { editor, call } = setup(); call("read_canvas");
  const image = { ...object, kind: "image", source: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1sAAAAASUVORK5CYII=" };
  expect(call("create_canvas_object", { object: image }).ok).toBe(true);
  const id = editor.snapshot.selection.primaryKey!;
  expect(call("update_canvas_object", { objectId: id, changes: { x: 200, width: 180 } }).ok).toBe(true);
  expect((editor.snapshot.value as CanvasDocument).objects[0]).toMatchObject({ source: image.source, x: 200, width: 180 });
  const before = editor.snapshot.value;
  expect(call("update_canvas_object", { objectId: id, changes: { source: "https://example.com/image.png" } }).ok).toBe(false);
  expect(editor.snapshot.value).toBe(before);
  expect(editor.undo().ok).toBe(true);
  expect((editor.snapshot.value as CanvasDocument).objects[0]).toMatchObject({ x: 10, width: 100 });
});
