import { expect, test } from "vitest";
import { findVacantObjectBounds, layoutObjectDocument, defaultObjectContainerPolicy, projectObjectText, assertCanvasDocument } from "../src/index.js";

const section = { id: "section", kind: "section", x: 0, y: 0, width: 500, height: 400, label: "새 섹션", color: "#fff" };
const child = { id: "child", kind: "text", x: 40, y: 50, width: 100, height: 40, label: "내용", color: "#000", fontSize: 20 };
test("sections contain objects without flowing them and project their title above the region", () => {
  const document = layoutObjectDocument({ profile: "canvas/1", width: 1280, height: 720, objects: [child, section] }, { containerPolicy: defaultObjectContainerPolicy });
  assertCanvasDocument(document);
  expect(document.objects.map(object => object.id)).toEqual(["section", "child"]);
  expect(document.objects[1]).toMatchObject({ parentId: "section", x: 40, y: 50 });
  expect(document.objects[0]!.containerLayout).toBeUndefined();
  expect(projectObjectText(section)).toMatchObject({ x: 0, y: -32, text: "새 섹션" });
});
test("placement reserves title space, skips occupied bounds and uses the first fitting gap", () => {
  const requested = { x: 0, y: 0, width: 200, height: 200 };
  expect(findVacantObjectBounds([section], requested)).toEqual({ ...requested, x: 564 });
  expect(findVacantObjectBounds([section, { ...section, id: "far", x: 1000 }], requested)).toEqual({ ...requested, x: 564 });
  expect(() => findVacantObjectBounds([], { ...requested, width: NaN })).toThrow();
});
