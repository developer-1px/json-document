// @vitest-environment jsdom
import { expect, test } from "vitest";
import { webCanvasHTMLAdapter, createWebHTMLArtifactSource, editWebHTMLArtifactNode } from "../src/index.js";
import { createCanvasEditorTools, createObjectEditor, readCanvasHTML, updateCanvasHTML } from "@interactive-os/json-document-editing";

const html = '<style>.slide{display:grid;background:linear-gradient(red,blue);border-radius:24px}</style><main class="slide" data-node-id="slide"><h1 data-node-id="title">분기 실적</h1><p data-node-id="revenue">120억</p></main>';
test("node edits preserve CSS, siblings and IDs, escape text and reject destructive container text edits", () => {
  const next = editWebHTMLArtifactNode(html, "title", { text: '<img src=x onerror="bad()">', fontSize: 36, color: "red" });
  const result = webCanvasHTMLAdapter.parse(next);
  expect(result.nodes.find(node => node.id === "title")?.text).toBe('<img src=x onerror="bad()">');
  expect(next).toContain("linear-gradient(red,blue)");
  expect(next).toContain('data-node-id="revenue">120억');
  expect(next).toContain("font-size: 36px !important");
  expect(next).not.toContain("contenteditable");
  expect(editWebHTMLArtifactNode(html, "slide", { backgroundColor: "red" })).toContain("background: red !important");
  expect(() => editWebHTMLArtifactNode(html, "slide", { text: "destroy children" })).toThrow("text-requires-leaf");
  expect(() => editWebHTMLArtifactNode(html, "title", { fontSize: NaN })).toThrow();
  expect(() => editWebHTMLArtifactNode(html, "missing", { color: "red" })).toThrow("node-not-found");
});
test("preserves source and stable IDs without flattening CSS", () => {
  const result = webCanvasHTMLAdapter.parse(html);
  expect(result.html).toBe(html);
  expect(result.nodes.map(node => node.id)).toEqual(["slide", "title", "revenue"]);
  const rendered = createWebHTMLArtifactSource(html);
  expect(rendered).toContain("default-src 'none'");
  expect(rendered).toContain("script-src 'none'");
  expect(rendered).toContain("linear-gradient(red,blue)");
});
test("rejects active markup, external images, hidden trees and ambiguous IDs", () => {
  for (const bad of ["<script>alert(1)</script>", '<iframe src="/secret"></iframe>', '<img src="https://example.com/a.png">', '<div onclick="x()"></div>', '<a href="javascript:x()">link</a>', '<meta http-equiv="refresh" content="0;url=/">', '<template><script>x()</script></template>', '<svg onload="x()"></svg>', '<p data-node-id="title">duplicate</p>']) {
    expect(() => webCanvasHTMLAdapter.parse(html + bad), bad).toThrow();
  }
  expect(() => webCanvasHTMLAdapter.parse("<p>No ID</p>")).toThrow("node-id-required");
});
test("HTML tool edits preserve unrelated changes, stale source rejects, one-step undo", () => {
  const editor = createObjectEditor({ profile: "canvas/1", width: 1280, height: 720, objects: [] });
  const tools = createCanvasEditorTools(editor, undefined, webCanvasHTMLAdapter);
  const call = (name: string, args: unknown) => tools.find(tool => tool.name === name)!.execute(args) as any;
  const made = call("create_canvas_html", { html, label: "슬라이드", width: 1280, height: 720 });
  expect(made.ok).toBe(true);
  const objectId = made.objectId;
  call("read_canvas_html", { objectId });
  expect(editor.dispatch({ type: "object.update", objectId, changes: { x: 300 } }).ok).toBe(true);
  expect(call("edit_canvas_html", { objectId, before: "120억", after: "135억" }).ok).toBe(true);
  expect((editor.snapshot.value as any).objects[0].x).toBe(300);
  expect(editor.undo().ok).toBe(true);
  expect(readCanvasHTML((editor.snapshot.value as any).objects[0])!.html).toBe(html);
  call("read_canvas_html", { objectId });
  expect(updateCanvasHTML(editor, objectId, html, html.replace("분기 실적", "사람 제목"), webCanvasHTMLAdapter).ok).toBe(true);
  expect(call("edit_canvas_html", { objectId, before: "120억", after: "150억" })).toMatchObject({ ok: false, code: "html.stale-source" });
  call("read_canvas_html", { objectId });
  expect(call("edit_canvas_html", { objectId, before: "120억", after: "150억" }).ok).toBe(true);
  expect(readCanvasHTML((editor.snapshot.value as any).objects[0])!.html).toContain("사람 제목");
  const before = editor.snapshot.value;
  expect(call("edit_canvas_html", { objectId, before: "150억", after: "<script>x()</script>" }).ok).toBe(false);
  expect(editor.snapshot.value).toBe(before);
});
