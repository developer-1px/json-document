import { expect, it } from "vitest";
import { createUIComponentObject, type CanvasDocument } from "@interactive-os/json-document-object-document";
import { createUIBuilderEditor, createUIBuilderTools } from "../src/ui-builder.js";
import { readUIBuilderProject } from "../src/ui-builder-materials.js";
import { applyUIBuilderPages, getUIBuilderPageObjects, createUIBuilderPageTools } from "../src/ui-builder-pages.js";
const legacy = (): CanvasDocument => ({profile: "canvas/1", width: 1000, height: 800, objects: [{...createUIComponentObject("heading", {x: 0, y: 0}), id: "title"}]});
it("keeps legacy objects on the first page and atomically migrates content when deleting it", () => {
  const editor = createUIBuilderEditor(legacy());
  expect(getUIBuilderPageObjects(readUIBuilderProject(editor.snapshot.value))).toHaveLength(1);
  expect(applyUIBuilderPages(editor, [{type: "page.create", id: "details", name: "상세"}])).toMatchObject({ok: true});
  expect(getUIBuilderPageObjects(readUIBuilderProject(editor.snapshot.value))).toHaveLength(0);
  expect(editor.snapshot.selection.keys).toHaveLength(0);
  const before = editor.snapshot.value;
  expect(applyUIBuilderPages(editor, [{type: "page.rename", id: "details", name: "변경"}, {type: "page.remove", id: "page:main"}])).toMatchObject({ok: false});
  expect(editor.snapshot.value).toBe(before);
  expect(applyUIBuilderPages(editor, [{type: "page.remove", id: "page:main", moveToPageId: "details"}])).toMatchObject({ok: true});
  expect(getUIBuilderPageObjects(readUIBuilderProject(editor.snapshot.value))).toHaveLength(1);
  editor.undo();
  expect(readUIBuilderProject(editor.snapshot.value).pages).toHaveLength(2);
});
it("guards stale page tools and validates navigation targets without losing objects", () => {
  const editor = createUIBuilderEditor(legacy());
  const [read, apply] = createUIBuilderPageTools(editor);
  expect(apply!.execute({commands: []})).toMatchObject({ok: false, code: "ui-builder.read-required"});
  read!.execute({});
  for (const commands of [[null], [{type: "page.remove"}], [{type: "page.select", id: ""}], [{type: "page.create", id: "x", name: "X", extra: true}]]) {
    expect(apply!.execute({commands})).toMatchObject({ok: false});
    expect(readUIBuilderProject(editor.snapshot.value).pages).toHaveLength(1);
  }
  applyUIBuilderPages(editor, [{type: "page.create", id: "details", name: "상세"}]);
  expect(apply!.execute({commands: []})).toMatchObject({ok: false, code: "ui-builder.stale-document"});
  const [readObjects, applyObjects] = createUIBuilderTools(editor);
  readObjects!.execute({});
  expect(applyObjects!.execute({components: [{id: "", component: "page-link", x: 0, y: 0, width: 180, height: 48, text: "홈", detail: "", items: [], tone: "accent"}], removeIds: []})).toMatchObject({ok: true});
  const link = readUIBuilderProject(editor.snapshot.value).objects[1]!;
  expect(applyUIBuilderPages(editor, [{type: "page-link.target", id: link.id, targetPageId: "missing"}])).toMatchObject({ok: false});
  expect(applyUIBuilderPages(editor, [{type: "page-link.target", id: link.id, targetPageId: "page:main"}])).toMatchObject({ok: true});
  expect(applyUIBuilderPages(editor, [{type: "page.remove", id: "page:main", moveToPageId: "details"}])).toMatchObject({ok: true});
  expect(readUIBuilderProject(editor.snapshot.value).objects[1]).toMatchObject({document: {pageId: "details", targetPageId: "details"}});
});
it("recovers page commands by re-reading after its own component-tool mutation", () => {
  const editor = createUIBuilderEditor(legacy());
  const [readPages, applyPages] = createUIBuilderPageTools(editor);
  const [readObjects, applyObjects] = createUIBuilderTools(editor);
  readPages!.execute({});
  readObjects!.execute({});
  expect(applyObjects!.execute({components: [{id: "", component: "page-link", x: 0, y: 100, width: 180, height: 48, text: "상세", detail: "", items: [], tone: "accent"}], removeIds: []})).toMatchObject({ok: true});
  const link = readUIBuilderProject(editor.snapshot.value).objects[1]!;
  const before = editor.snapshot.value;
  const commands = [{type: "page.create", id: "details", name: "상세"}, {type: "page-link.target", id: link.id, targetPageId: "details"}];
  expect(applyPages!.execute({commands})).toMatchObject({ok: false, code: "ui-builder.stale-document", reason: expect.stringContaining("read_ui_builder_pages")});
  expect(editor.snapshot.value).toBe(before);
  readPages!.execute({});
  expect(applyPages!.execute({commands})).toMatchObject({ok: true});
  expect(readUIBuilderProject(editor.snapshot.value).objects[1]).toMatchObject({document: {targetPageId: "details"}});
  expect(applyObjects!.execute({components: [], removeIds: []})).toMatchObject({ok: false, code: "ui-builder.stale-document", reason: expect.stringContaining("read_ui_builder")});
});
