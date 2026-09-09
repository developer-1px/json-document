import { expect, test } from "vitest";
import { applyPatch } from "@interactive-os/json-document";
import { assertCanvasDocument, assertObjectStyle, getObjectStyle, parseCanvasDocument, planObjectOperation, readObjectStyle, serializeCanvasDocument, type CanvasDocument, type ObjectStyle } from "../src/index.js";

const bounds = { x: 10, y: 20, width: 100, height: 80, label: "", color: "blue" };
const document: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: [
  { ...bounds, id: "text", kind: "text", fontSize: 32 },
  { ...bounds, id: "rect", kind: "rectangle" },
  { ...bounds, id: "ellipse", kind: "ellipse", color: "red", strokeColor: "green", strokeWidth: 4 },
  { ...bounds, id: "path", kind: "path", strokeWidth: 4, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
  { ...bounds, id: "image", kind: "image", source: "data:image/png;base64,AQID", color: "transparent" },
] };

test("effective styles preserve old documents and expose kind-specific capabilities", () => {
  expect(getObjectStyle(document.objects[0]!)).toEqual({ color: "blue", fontSize: 32, fontWeight: 400, textAlign: "left" });
  expect(getObjectStyle(document.objects[1]!)).toEqual({ color: "blue", strokeColor: "#000000", strokeWidth: 0 });
  expect(getObjectStyle(document.objects[3]!)).toEqual({ color: "blue", strokeWidth: 4 });
  expect(getObjectStyle(document.objects[4]!)).toEqual({});
  expect(getObjectStyle({ ...bounds, id: "legacy" })).toEqual({ color: "blue" });
  expect(parseCanvasDocument(serializeCanvasDocument(document))).toEqual(document);
  expect(document.objects[0]).not.toHaveProperty("fontWeight");
});

test("mixed values only compare supporting targets and retain unsupported as absent", () => {
  expect(readObjectStyle([])).toEqual({});
  expect(readObjectStyle(document.objects)).toEqual({ color: null, fontSize: 32, fontWeight: 400, textAlign: "left", strokeColor: null, strokeWidth: null });
  expect(readObjectStyle([document.objects[0]!, document.objects[4]!])).toEqual(getObjectStyle(document.objects[0]!));
  expect(readObjectStyle([document.objects[0]!, { ...document.objects[0]!, id: "bold", fontWeight: 700, textAlign: "right" }])).toMatchObject({ fontWeight: null, textAlign: null });
});

test("one atomic style plan changes only applicable fields without replacing extension data or geometry", () => {
  const style = { color: "purple", fontSize: 48, fontWeight: 700, textAlign: "center", strokeColor: "orange", strokeWidth: 6 } as const;
  const plan = planObjectOperation(document, { type: "style", objectIds: document.objects.map((object) => object.id), style });
  expect(plan.ok).toBe(true);
  if (!plan.ok) return;
  const result = applyPatch(document, plan.operations);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const next = result.value as CanvasDocument;
  expect(next.objects[0]).toEqual({ ...document.objects[0], color: "purple", fontSize: 48, fontWeight: 700, textAlign: "center" });
  expect(next.objects[1]).toEqual({ ...document.objects[1], color: "purple", strokeColor: "orange", strokeWidth: 6 });
  expect(next.objects[3]).toEqual({ ...document.objects[3], color: "purple", strokeWidth: 6 });
  expect(next.objects[4]).toEqual(document.objects[4]);
  expect(parseCanvasDocument(serializeCanvasDocument(next))).toEqual(next);
});

test("effective default and unsupported properties are no-ops, while missing targets reject the whole plan", () => {
  expect(planObjectOperation(document, { type: "style", objectIds: ["text"], style: { fontWeight: 400, textAlign: "left", strokeColor: "red" } })).toEqual({ ok: true, operations: [] });
  expect(planObjectOperation(document, { type: "style", objectIds: ["rect"], style: { strokeWidth: 0, strokeColor: "#000000" } })).toEqual({ ok: true, operations: [] });
  expect(planObjectOperation(document, { type: "style", objectIds: ["image"], style: { color: "red", fontSize: 42 } })).toEqual({ ok: true, operations: [] });
  expect(planObjectOperation(document, { type: "style", objectIds: ["text", "missing"], style: { color: "red" } })).toMatchObject({ ok: false, code: "selection.object-not-found" });
});

test.each([null, [], { color: "" }, { color: 1 }, { strokeColor: "" }, { fontSize: 0 }, { fontSize: Infinity }, { fontSize: "32" }, { fontWeight: 500 }, { textAlign: "justify" }, { strokeWidth: -1 }, { strokeWidth: NaN }, { unknown: 1 }, { color: "red", fontSize: undefined }])("rejects malformed style requests before partial or unsupported updates %#", (style) => {
  expect(() => assertObjectStyle(style)).toThrow();
  expect(planObjectOperation(document, { type: "style", objectIds: ["rect", "image"], style: style as Partial<ObjectStyle> })).toMatchObject({ ok: false });
});

test.each([{ fontWeight: 500 }, { textAlign: "justify" }])("validates optional persisted text fields %#", (style) => {
  expect(() => assertCanvasDocument({ ...document, objects: [{ ...document.objects[0], ...style }] })).toThrow();
});

test("stroke removal is valid for shapes but a path still requires positive width", () => {
  expect(planObjectOperation(document, { type: "style", objectIds: ["ellipse"], style: { strokeWidth: 0 } }).ok).toBe(true);
  expect(planObjectOperation(document, { type: "style", objectIds: ["ellipse", "path"], style: { strokeWidth: 0, color: "red" } })).toMatchObject({ ok: false });
  expect(() => assertCanvasDocument({ ...document, objects: [{ ...document.objects[1], strokeWidth: -1 }] })).toThrow();
  expect(() => assertCanvasDocument({ ...document, objects: [{ ...document.objects[1], strokeColor: 0 }] })).toThrow();
});
