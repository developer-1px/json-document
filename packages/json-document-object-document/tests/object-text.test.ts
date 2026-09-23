import { expect, test } from "vitest";
import { applyPatch } from "@interactive-os/json-document";
import { assertCanvasDocument, createCanvasObject, getObjectStyle, parseCanvasDocument, planObjectOperation, projectObjectText, readObjectStyle, serializeCanvasDocument, type CanvasDocument } from "../src/index.js";

const bounds = { x: 40, y: 60, width: 200, height: 160 };
const filledKinds = ["rectangle", "ellipse", "sticky-note"] as const;
const objects = filledKinds.map((kind) => ({ ...createCanvasObject(kind, bounds, { color: "#fff2a8", label: "한 장\n💡" }), id: kind }));
const document: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects };

test.each(filledKinds)("%s shares label authoring, font defaults and separate fill/text paint", (kind) => {
  const object = objects.find((item) => item.id === kind)!;
  const before = serializeCanvasDocument(document);
  expect(projectObjectText(object)).toMatchObject({ text: "한 장\n💡", color: "#253044", fontSize: 24, fontWeight: 400, textAlign: kind === "sticky-note" ? "left" : "center", verticalAlign: kind === "sticky-note" ? "top" : "center" });
  const plan = planObjectOperation(document, { type: "text", objectId: kind, text: "새 본문\n" });
  expect(plan).toEqual({ ok: true, operations: [{ op: "replace", path: `/objects/${objects.indexOf(object)}/label`, value: "새 본문\n" }] });
  expect(planObjectOperation(document, { type: "text", objectId: kind, text: object.label })).toEqual({ ok: true, operations: [] });
  expect(serializeCanvasDocument(document)).toBe(before);
  expect(parseCanvasDocument(before)).toEqual(document);
  expect(object).not.toHaveProperty("fontSize");
});

test("body bounds are inset, finite at minimum sizes and ellipse corners remain inside its curve", () => {
  expect(projectObjectText(objects[0]!)).toMatchObject({ x: 52, y: 72, width: 176, height: 136 });
  expect(projectObjectText(objects[2]!)).toMatchObject({ x: 56, y: 76, width: 168, height: 128 });
  const ellipse = projectObjectText(objects[1]!)!;
  expect(ellipse.width).toBeCloseTo(bounds.width * Math.SQRT1_2);
  expect(ellipse.height).toBeCloseTo(bounds.height * Math.SQRT1_2);
  for (const object of objects) {
    const tiny = projectObjectText({ ...object, width: 1, height: 1 })!;
    expect(tiny.width).toBeGreaterThan(0); expect(tiny.width).toBeLessThanOrEqual(1);
    expect(tiny.height).toBeGreaterThan(0); expect(tiny.height).toBeLessThanOrEqual(1);
  }
});

test("text keeps its color and uninset bounds; metadata-only labels do not acquire text capability", () => {
  const text = { ...createCanvasObject("text", bounds, { color: "red", label: "Title", fontSize: 32 }), id: "text" };
  expect(projectObjectText(text)).toEqual({ ...bounds, text: "Title", color: "red", fontSize: 32, fontWeight: 400, textAlign: "left", verticalAlign: "top" });
  for (const object of [
    { ...bounds, id: "legacy", color: "blue", label: "Legacy" },
    { ...bounds, id: "image", color: "transparent", label: "Image", kind: "image", source: "data:image/png;base64,AQID" },
    { ...bounds, id: "path", color: "blue", label: "Line", kind: "path", strokeWidth: 2, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
  ]) {
    expect(projectObjectText(object)).toBeNull();
    expect(planObjectOperation({ objects: [object] }, { type: "text", objectId: object.id, text: "No" })).toMatchObject({ ok: false, code: "object.not-text" });
  }
});

test("mixed body styles use one atomic plan and round-trip without painting the fill", () => {
  expect(readObjectStyle(objects)).toMatchObject({ color: "#fff2a8", textColor: "#253044", fontSize: 24, textAlign: null });
  const style = { textColor: "purple", fontSize: 40, fontWeight: 700, textAlign: "right" } as const;
  const plan = planObjectOperation(document, { type: "style", objectIds: filledKinds, style });
  expect(plan.ok).toBe(true); if (!plan.ok) return;
  const result = applyPatch(document, plan.operations);
  expect(result.ok).toBe(true); if (!result.ok) return;
  const next = result.value as CanvasDocument;
  next.objects.forEach((object, index) => {
    expect(object).toEqual({ ...objects[index], ...style });
    expect(getObjectStyle(object)).toMatchObject(style);
  });
  expect(parseCanvasDocument(serializeCanvasDocument(next))).toEqual(next);
});

test.each(filledKinds)("%s rejects invalid persisted body formatting and atomic style requests", (kind) => {
  const object = objects.find((item) => item.id === kind)!;
  for (const style of [{ fontSize: 0 }, { fontSize: "24" }, { fontWeight: 500 }, { textAlign: "justify" }, { textColor: "" }, { textColor: null }]) {
    expect(() => assertCanvasDocument({ ...document, objects: [{ ...object, ...style }] })).toThrow();
    expect(planObjectOperation(document, { type: "style", objectIds: filledKinds, style: { color: "red", ...style } as never }).ok).toBe(false);
  }
});
