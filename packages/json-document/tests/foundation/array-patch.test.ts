import { applyPatch, createJSONDocument, type JSONPatchOperation } from "@interactive-os/json-document";
import { expect, test } from "vitest";

test.each([
  { name: "repeated insertions", operations: [
    { op: "add", path: "/items/2", value: "a" },
    { op: "add", path: "/items/2", value: "b" },
  ], expected: [0, 1, "b", "a", 2, 3, 4] },
  { name: "descending mixed insertions", operations: [
    { op: "add", path: "/items/4", value: "tail" },
    { op: "copy", from: "/items/0", path: "/items/2" },
    { op: "add", path: "/items/0", value: "head" },
  ], expected: ["head", 0, 1, 0, 2, 3, "tail", 4] },
  { name: "copies with shifted sources", operations: [
    { op: "copy", from: "/items/0", path: "/items/2" },
    { op: "copy", from: "/items/3", path: "/items/1" },
  ], expected: [0, 2, 1, 0, 2, 3, 4] },
  { name: "increasing removals", operations: [
    { op: "remove", path: "/items/0" },
    { op: "remove", path: "/items/1" },
    { op: "remove", path: "/items/1" },
  ], expected: [1, 4] },
  { name: "descending removals", operations: [
    { op: "remove", path: "/items/4" },
    { op: "remove", path: "/items/2" },
    { op: "remove", path: "/items/0" },
  ], expected: [1, 3] },
  { name: "unordered removals", operations: [
    { op: "remove", path: "/items/1" },
    { op: "remove", path: "/items/2" },
    { op: "remove", path: "/items/0" },
  ], expected: [2, 4] },
  { name: "appends followed by removals", operations: [
    { op: "add", path: "/items/-", value: "a" },
    { op: "add", path: "/items/6", value: "b" },
    { op: "remove", path: "/items/0" },
    { op: "remove", path: "/items/1" },
  ], expected: [1, 3, 4, "a", "b"] },
  { name: "moves including append and adjacent swap", operations: [
    { op: "move", from: "/items/0", path: "/items/-" },
    { op: "move", from: "/items/4", path: "/items/1" },
    { op: "move", from: "/items/3", path: "/items/2" },
  ], expected: [1, 0, 3, 2, 4] },
  { name: "removing an appended item", operations: [
    { op: "add", path: "/items/-", value: "temporary" },
    { op: "remove", path: "/items/5" },
  ], expected: [0, 1, 2, 3, 4] },
] satisfies Array<{ name: string; operations: JSONPatchOperation[]; expected: Array<number | string> }>)(
  "array batches preserve sequential meaning: $name",
  ({ operations, expected }) => {
    const initial = { items: [0, 1, 2, 3, 4] };
    const document = createJSONDocument(initial);
    const before = document.value;
    expect(document.validatePatch(operations)).toEqual({ ok: true });
    expect(document.value).toBe(before);
    expect(document.commit(operations)).toMatchObject({ ok: true });
    expect(document.value).toEqual({ items: expected });
    const result = applyPatch(initial, operations);
    expect(result).toMatchObject({ ok: true, value: { items: expected } });
    if (result.ok) {
      expect(result.change.applied).toHaveLength(operations.length);
      expect(result.change.applied.every((operation) => !operation.path.endsWith("/-"))).toBe(true);
      expect(applyPatch(initial, result.change.applied)).toMatchObject({ ok: true, value: { items: expected } });
    }
    expect(initial.items).toEqual([0, 1, 2, 3, 4]);
    expect(before).toEqual(initial);
  },
);

test("copies can read earlier inserted values without sharing mutable payloads", () => {
  const payload = { label: "inserted" };
  const document = createJSONDocument({ "a/b": [0, 1] });
  const result = document.commit([
    { op: "add", path: "/a~1b/0", value: payload },
    { op: "copy", from: "/a~1b/0", path: "/a~1b/1" },
    { op: "copy", from: "/a~1b/1", path: "/a~1b/-" },
  ]);
  expect(result).toMatchObject({ ok: true });
  payload.label = "caller mutation";
  const items = (document.value as { "a/b": unknown[] })["a/b"];
  expect(items).toEqual([{ label: "inserted" }, { label: "inserted" }, 0, 1, { label: "inserted" }]);
  expect(items[0]).not.toBe(items[1]);
  expect(items[1]).not.toBe(items[4]);
  expect(Object.isFrozen(items[1])).toBe(true);
});

test.each(["/items/01", "/items/99", "/items/-", "#/items/0"])(
  "array fast paths preserve rollback and failure precedence (%s)",
  (path) => {
    const document = createJSONDocument({ items: [0, 1, 2] });
    const before = document.value;
    let notifications = 0;
    document.subscribe(() => { notifications += 1; });
    const operations = [
      { op: "add", path: "/items/-", value: 3 },
      { op: "remove", path },
      { op: "add", path: "/items/-", value: undefined },
    ] as unknown as JSONPatchOperation[];
    const expected = { ok: false, pointer: path, code: path[0] === "#" ? "invalid_pointer" : "path_not_found" };
    expect(document.validatePatch(operations)).toMatchObject(expected);
    expect(document.commit(operations)).toMatchObject(expected);
    expect(document.value).toBe(before);
    expect(notifications).toBe(0);
  },
);
