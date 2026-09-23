import { applyPatch, buildPointer, createJSONDocument, type JSONPatchOperation } from "@interactive-os/json-document";
import { expect, test } from "vitest";

const keys = ["0", "1", "a", "b", "c", "d", "e", "", "__proto__"];

test.each([
  keys,
  [...keys].reverse(),
  ["0", "1", ...keys.slice(2).reverse()],
  ["__proto__", "", "c", "e"],
  ["0", "c"],
  ["0", "1", "b", "d", "e"],
  ["", "__proto__"],
].map((removed) => ({ removed })))("root removals retain key order and own properties: $removed", ({ removed }) => {
  const initial = Object.fromEntries(keys.map((key) => [key, { key }]));
  const operations = removed.map((key): JSONPatchOperation => ({ op: "remove", path: buildPointer([key]) }));
  const retained = keys.filter((key) => !removed.includes(key));
  const expected = Object.fromEntries(retained.map((key) => [key, { key }]));
  const document = createJSONDocument(initial);
  expect(document.commit(operations)).toEqual({ ok: true, change: { applied: operations } });
  expect(document.value).toEqual(expected);
  expect(Object.keys(document.value as object)).toEqual(retained);
  expect(Object.getPrototypeOf(document.value)).toBe(Object.prototype);
  expect(applyPatch(initial, operations)).toMatchObject({ ok: true, value: expected });
  expect(Object.keys(initial)).toEqual(keys);
});

test("root additions preserve repeated and special keys without owning caller payloads", () => {
  const payload = { n: 1 };
  const document = createJSONDocument({ a: 0 });
  const operations: JSONPatchOperation[] = [
    { op: "add", path: "/__proto__", value: { n: 0 } },
    { op: "add", path: "/", value: 2 },
    { op: "add", path: "/__proto__", value: payload },
    { op: "add", path: "/a", value: 3 },
  ];
  const result = document.commit(operations);
  expect(result).toEqual({ ok: true, change: { applied: operations } });
  payload.n = 99;
  expect(document.value).toEqual(JSON.parse('{"a":3,"__proto__":{"n":1},"":2}'));
  expect(Object.getPrototypeOf(document.value)).toBe(Object.prototype);
  expect(Object.keys(document.value as object)).toEqual(["a", "__proto__", ""]);
  expect(applyPatch({ a: 0 }, result.ok ? result.change.applied : [])).toMatchObject({ ok: true, value: document.value });
});

test.each([["a", "b"], ["d", "c"]])("duplicate removal after an ordered prefix stays atomic (%s, %s)", (first, second) => {
  const initial = { a: 0, b: 1, c: 2, d: 3 };
  const document = createJSONDocument(initial);
  const before = document.value;
  let notifications = 0;
  document.subscribe(() => { notifications += 1; });
  const operations = [
    { op: "remove", path: `/${first}` },
    { op: "remove", path: `/${second}` },
    { op: "remove", path: `/${first}` },
    { op: "add", path: "/later", value: undefined },
  ] as unknown as JSONPatchOperation[];
  const expected = { ok: false, code: "path_not_found", pointer: `/${first}`, reason: `op[2]: object key: ${first}` };
  expect(applyPatch(initial, operations)).toEqual(expected);
  expect(document.validatePatch(operations)).toEqual(expected);
  expect(document.commit(operations)).toEqual(expected);
  expect(document.value).toBe(before);
  expect(notifications).toBe(0);
});
