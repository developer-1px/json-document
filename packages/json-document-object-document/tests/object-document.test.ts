import { describe, expect, test } from "vitest";
import { applyPatch } from "@interactive-os/json-document";
import { assertCanvasDocument, assertObjectDocument, createCanvasObject, createCanvasPath, parseCanvasDocument, planObjectOperation, serializeCanvasDocument, transformObject, type CanvasDocument } from "../src/index.js";

const blank: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: [] };
const text = { ...createCanvasObject("text", { x: 10, y: 20, width: 300, height: 100 }, { color: "#123456", label: "Hello\n안녕", fontSize: 36 }), id: "text" };
const path = { ...createCanvasPath([{ x: 10, y: 20 }, { x: 40, y: 80 }, { x: 70, y: 50 }], { color: "#123456", label: "Path", strokeWidth: 4 }), id: "path" };

describe("Object document and Canvas profile", () => {
  test("round-trips every variant, order, identity and extension data without editor state", () => {
    const document: CanvasDocument = { ...blank, title: "Slide", objects: [text, path,
      { ...createCanvasObject("rectangle", { x: 100, y: 150, width: 80, height: 60 }, { color: "#abcdef", label: "" }), id: "rect" },
      { ...createCanvasObject("ellipse", { x: 200, y: 150, width: 80, height: 60 }, { color: "#abcdef", label: "" }), id: "ellipse" },
    ] };
    expect(parseCanvasDocument(serializeCanvasDocument(document))).toEqual(document);
    expect(Object.keys(JSON.parse(serializeCanvasDocument(blank)))).toEqual(["profile", "width", "height", "objects"]);
  });

  test.each([null, [], {}, { ...blank, objects: null }, { ...blank, width: 0 }, { ...blank, height: Infinity },
    { ...blank, objects: [text, text] }, { ...blank, objects: [{ ...text, id: "" }] },
    { ...blank, objects: [{ ...text, label: 1 }] }, { ...blank, objects: [{ ...text, x: NaN }] },
    { ...blank, objects: [{ ...text, kind: "image" }] }, { ...blank, objects: [{ ...text, fontSize: 0 }] },
    { ...blank, objects: [{ ...path, points: [{ x: 0, y: 0 }] }] }, { ...blank, objects: [{ ...path, strokeWidth: -1 }] },
    { ...blank, objects: [{ ...path, points: [{ x: 0, y: 0 }, { x: 1.1, y: 0 }] }] },
  ])("rejects malformed persisted state %#", (value) => expect(() => assertCanvasDocument(value)).toThrow());

  test("requires a known Canvas profile but keeps legacy Object data valid", () => {
    const legacy = { objects: [{ id: "a", x: 0, y: 0, width: 0, height: 0, label: "Alpha", color: "blue" }] };
    expect(() => assertObjectDocument(legacy)).not.toThrow();
    expect(() => assertCanvasDocument(legacy)).toThrow();
    expect(() => parseCanvasDocument(JSON.stringify({ ...blank, profile: "canvas/99" }))).toThrow();
  });

  test("path normalization and resize have one geometry and identical preview/commit", () => {
    expect(path).toMatchObject({ x: 10, y: 20, width: 60, height: 60, points: [{ x: 0, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0.5 }] });
    const document = { ...blank, objects: [path] };
    const transform = { dx: 5, dy: -2, dw: 60, dh: 30 };
    const plan = planObjectOperation(document, { type: "transform", objectIds: ["path"], transform });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const result = applyPatch(document, plan.operations);
    expect(result).toMatchObject({ ok: true, value: { objects: [transformObject(path, transform)] } });
    expect(transformObject(path, transform).points).toEqual(path.points);
    expect(transformObject(path, { dx: 0, dy: 0, dw: -1000, dh: -1000 })).toMatchObject({ width: 1, height: 1 });
  });

  test("vertical and horizontal strokes remain finite and resizable", () => {
    for (const points of [[{ x: 0, y: 0 }, { x: 0, y: 100 }], [{ x: 0, y: 0 }, { x: 100, y: 0 }]]) {
      const object = { ...createCanvasPath(points, { color: "black", label: "", strokeWidth: 2 }), id: "p" };
      expect(() => assertCanvasDocument({ ...blank, objects: [object] })).not.toThrow();
    }
  });

  test("planning rejects invalid/unknown targets atomically and does not emit no-op patches", () => {
    const document = { ...blank, objects: [text] };
    expect(planObjectOperation(document, { type: "transform", objectIds: ["text"], transform: { dx: NaN, dy: 0 } })).toMatchObject({ ok: false });
    expect(planObjectOperation(document, { type: "transform", objectIds: ["text", "missing"], transform: { dx: 10, dy: 0 } })).toMatchObject({ ok: false });
    expect(planObjectOperation(document, { type: "insert", objects: [text] })).toMatchObject({ ok: false });
    expect(planObjectOperation(document, { type: "text", objectId: "text", text: text.label })).toEqual({ ok: true, operations: [] });
    expect(planObjectOperation(document, { type: "transform", objectIds: ["text"], transform: { dx: 0, dy: 0 } })).toEqual({ ok: true, operations: [] });
    expect(document.objects[0]).toBe(text);
  });
});
