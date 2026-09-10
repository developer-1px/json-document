import { expect, test } from "vitest";
import { createCanvasClipboard, type CanvasClipboardContent } from "../src/index.js";

const source = "data:image/png;base64,AQID";
const options = { bounds: { x: 10, y: 20, width: 200, height: 120 }, textColor: "black", fontSize: 20, contentGap: 10 };
const content: CanvasClipboardContent = { type: "mixed", items: [
  { type: "text", text: "Before" }, { type: "image", source, width: 100, height: 50, label: "Figure" }, { type: "text", text: "After" },
] };

test("mixed content becomes ordered non-overlapping editable objects, not source CSS", () => {
  const clipboard = createCanvasClipboard(content, options);
  expect(clipboard.objects.map((object) => [object.kind, object.label, object.x, object.y, object.height])).toEqual([
    ["text", "Before", 10, 20, 24], ["image", "Figure", 10, 54, 50], ["text", "After", 10, 114, 24],
  ]);
  expect(clipboard.objects.map((object) => object.id)).toEqual(["clipboard:0", "clipboard:1", "clipboard:2"]);
  expect(clipboard.primaryKey).toBe("clipboard:2"); expect(clipboard.text).toBe("Before\nFigure\nAfter");
});

test("an overflowing flow fits as a whole while retaining image aspect ratio and content", () => {
  const clipboard = createCanvasClipboard(content, { ...options, bounds: { ...options.bounds, height: 60 } });
  const objects = clipboard.objects;
  expect(objects.at(-1)!.y + objects.at(-1)!.height).toBeCloseTo(80);
  expect(objects[1]!.width / objects[1]!.height).toBe(2);
  expect(objects[1]!.source).toBe(source);
  expect(objects[0]!.fontSize).toBeCloseTo(20 * 60 / 118);
  expect(objects[0]!.y + objects[0]!.height).toBeLessThan(objects[1]!.y);
});

test("legacy literal text and image cascade remain unchanged", () => {
  expect(createCanvasClipboard({ type: "text", text: "<b>A</b>\nB" }, options).objects[0]).toMatchObject({ label: "<b>A</b>\nB", height: 48, fontSize: 20 });
  const image = { source, width: 100, height: 50, label: "Figure" };
  expect(createCanvasClipboard({ type: "images", images: [image, image] }, options).objects.map((object) => [object.x, object.y])).toEqual([[10, 20], [34, 44]]);
});

test("empty parts and invalid flow policy reject before a clipboard is produced", () => {
  expect(() => createCanvasClipboard({ type: "mixed", items: [] }, options)).toThrow();
  expect(() => createCanvasClipboard({ type: "mixed", items: [{ type: "text", text: "" }] }, options)).toThrow();
  expect(() => createCanvasClipboard(content, { ...options, contentGap: -1 })).toThrow();
});
