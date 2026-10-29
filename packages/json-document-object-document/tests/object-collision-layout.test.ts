import {expect, test} from "vitest";
import {createUIComponentObject, resolveObjectCollisions, type UIComponentObject} from "../src/index.js";
const box = (id: string, x: number, y: number) => ({...createUIComponentObject("text", {x, y}), id, width: 100, height: 40}) as UIComponentObject;
test("pushes a collision chain while retaining the gesture target and another column", () => {
  const objects = [box("a", 0, 30), box("b", 0, 50), box("c", 0, 100), box("other", 200, 50)];
  const result = resolveObjectCollisions(objects, [{objectIds: ["a", "b", "c"], gap: 10}], ["a"]);
  expect(result.map(object => [object.id, object.y])).toEqual([["a", 30], ["b", 80], ["c", 130], ["other", 50]]);
  expect(objects[1]!.y).toBe(50);
});
test("moves a displaced composition with its children and leaves untouched groups alone", () => {
  const parent = box("parent", 0, 50);
  const child = box("child", 4, 54);
  const objects = [box("a", 0, 30), {...parent, document: {...parent.document, childIds: ["child"]}}, child, box("u", 200, 0), box("v", 200, 0)];
  const result = resolveObjectCollisions(objects, [{objectIds: ["a", "parent"], gap: 10}, {objectIds: ["u", "v"], gap: 10}], ["a"]);
  expect(result.map(object => object.y)).toEqual([30, 80, 84, 0, 0]);
});
