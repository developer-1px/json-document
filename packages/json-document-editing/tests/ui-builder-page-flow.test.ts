import { expect, it } from "vitest";
import { createUIComponentObject, resolveUIFlowLayout } from "@interactive-os/json-document-object-document";
import { createUIBuilderEditor } from "../src/ui-builder.js";
import { applyUIBuilderPages, getUIBuilderPageObjects } from "../src/ui-builder-pages.js";
import { readUIBuilderProject } from "../src/ui-builder-materials.js";
import { applyUIBuilderConfiguration } from "../src/ui-builder-configuration.js";

it("arranges the active page while preserving the other page and undo restores both", () => {
  const editor = createUIBuilderEditor({profile: "canvas/1", width: 1000, height: 900, objects: [{...createUIComponentObject("heading", {x: 10, y: 20}), id: "home-title"}]});
  const home = {rows: [{columns: [{weight: 1, items: [{objectId: "home-title", size: "fill" as const}]}]}]};
  expect(applyUIBuilderConfiguration(editor, {flow: home})).toMatchObject({ok: true});
  expect(applyUIBuilderPages(editor, [{type: "page.create", id: "detail", name: "상세"}])).toMatchObject({ok: true});
  const object = createUIComponentObject("heading", {x: 30, y: 40});
  if (object.kind !== "embedded-document") throw new Error("registered component expected");
  expect(editor.dispatch({type: "object.create", object: {...object, id: "detail-title", document: {...object.document, pageId: "detail"}}})).toMatchObject({ok: true});
  const detailId = readUIBuilderProject(editor.snapshot.value).objects.at(-1)!.id;
  const before = editor.snapshot.value;
  const detail = {rows: [{columns: [{weight: 2, items: [{objectId: detailId, size: "hug" as const}]}]}]};
  expect(applyUIBuilderConfiguration(editor, {flow: home})).toMatchObject({ok: false});
  expect(editor.snapshot.value).toBe(before);
  expect(applyUIBuilderConfiguration(editor, {flow: detail})).toMatchObject({ok: true});
  const project = readUIBuilderProject(editor.snapshot.value);
  expect(resolveUIFlowLayout(getUIBuilderPageObjects(project, "page:main"), project.flow)).toEqual(home);
  expect(resolveUIFlowLayout(getUIBuilderPageObjects(project, "detail"), project.flow)).toEqual(detail);
  editor.undo();
  expect(editor.snapshot.value).toEqual(before);
});
