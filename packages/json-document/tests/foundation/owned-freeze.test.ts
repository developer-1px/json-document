import { applyPatch, createJSONDocument, type JSONPatchOperation } from "@interactive-os/json-document";
import { expect, test } from "vitest";

import {
  denseArrayCopies,
  resetDenseArrayCopies,
} from "../../src/foundation/json/shared-array.js";
import {
  applyOwnedProtocolPatch,
  ownedPatchFreezeInspections,
  resetOwnedPatchFreezeInspections,
} from "../../src/foundation/protocol/apply.js";

test("createJSONDocument freezes a clone and leaves the caller tree mutable", () => {
  const items = Array.from({ length: 128 }, (_, item) => ({ id: `item-${item}`, title: "Draft" }));
  const initial = { items };
  const document = createJSONDocument(initial);
  expect(Object.isFrozen(initial)).toBe(false);
  expect(Object.isFrozen(items)).toBe(false);
  expect(Object.isFrozen(items[0])).toBe(false);
  expect(Object.isFrozen(document.value)).toBe(true);
  items[0]!.title = "Mutated";
  expect((document.value as { items: Array<{ title: string }> }).items[0]?.title).toBe("Draft");
});

test.each([64, 512, 4096])("owned snapshots remain valid protocol inputs after a leaf replacement (%s items)", (size) => {
  const document = createJSONDocument({ items: Array.from({ length: size }, (_, id) => ({ id, text: "before" })) });
  expect(document.commit([{ op: "replace", path: "/items/1/text", value: "after" }]).ok).toBe(true);
  const snapshot = document.value;
  expect(createJSONDocument(snapshot).value).toEqual(snapshot);
  expect(applyPatch(snapshot, [{ op: "replace", path: "/items/2/text", value: "next" }])).toMatchObject({ ok: true });
  expect(document.at("/items/2/text")).toMatchObject({ ok: true, value: "before" });
});

test("large-array reflection exposes a frozen dense JSON snapshot without changing indexed reads", () => {
  const document = createJSONDocument(Array.from({ length: 64 }, (_, id) => ({ id })));
  document.commit([{ op: "replace", path: "/1/id", value: 99 }]);
  const snapshot = document.value as ReadonlyArray<{ readonly id: number }>;
  expect(Reflect.setPrototypeOf(snapshot, null)).toBe(false);
  expect(Object.getOwnPropertyDescriptor(snapshot, "1")?.value).toEqual({ id: 99 });
  expect(Object.keys(snapshot)).toHaveLength(64);
  expect(Object.values(snapshot)).toHaveLength(64);
  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(() => Object.freeze(snapshot)).not.toThrow();
  expect(Reflect.set(snapshot, "1", { id: 0 })).toBe(false);
  expect(snapshot[1]?.id).toBe(99);
});

test("a leaf replace freeze inspects the changed path, not every sibling", () => {
  const small = applyOwnedAndCount(256, 80);
  const large = applyOwnedAndCount(10_000, 80);
  expect(small.after.items[80]).toEqual({ id: "item-80", title: "Ready" });
  expect(small.after.items[79]).toBe(small.before.items[79]);
  expect(large.after.items[81]).toBe(large.before.items[81]);
  expect(isDeepFrozen(large.after)).toBe(true);
  expect(small.inspections).toBeLessThan(16);
  expect(large.inspections).toBeLessThan(16);
  expect(large.inspections).toBe(small.inspections);
});

test("a flat replacement batch inspects its common ancestor only once for freezing", () => {
  const document = createJSONDocument(Object.fromEntries(Array.from({ length: 1_000 }, (_, i) => [i, 0])));
  resetOwnedPatchFreezeInspections();
  expect(document.commit(Array.from({ length: 1_000 }, (_, i) => ({
    op: "replace", path: `/${i}`, value: 1,
  }))).ok).toBe(true);
  expect(ownedPatchFreezeInspections()).toBe(1);
  expect(isDeepFrozen(document.value)).toBe(true);
});

test.each([
  { op: "remove", path: "/deleted" },
  { op: "replace", path: "", value: { last: { n: 1 } } },
  { op: "copy", from: "/first", path: "/copied" },
] satisfies JSONPatchOperation[])("a freeze fallback after $op does not skip later changed nodes", (operation) => {
  const document = createJSONDocument({ first: { n: 0 }, deleted: true, last: { n: 0 } });
  const before = document.value;
  const result = document.commit([
    { op: "replace", path: "/first/n", value: 1 },
    operation,
    { op: "replace", path: "/last/n", value: 2 },
  ]);
  expect(result.ok).toBe(true);
  expect(isDeepFrozen(document.value)).toBe(true);
  expect(Reflect.set((document.value as { last: object }).last, "n", 99)).toBe(false);
  expect(before).toEqual({ first: { n: 0 }, deleted: true, last: { n: 0 } });
});

test("a leaf replace does not dense-copy a large sibling array", () => {
  const items = Array.from({ length: 10_000 }, (_, item) => ({ id: `item-${item}`, title: "Draft" }));
  const document = createJSONDocument({ items });
  const before = document.value as { items: Array<{ id: string; title: string }> };
  resetDenseArrayCopies();
  const result = applyOwnedProtocolPatch(before, [
    { op: "replace", path: "/items/80/title", value: "Ready" },
  ]);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const after = result.value as { items: Array<{ id: string; title: string }> };
  expect(Array.isArray(after.items)).toBe(true);
  expect(after.items[80]).toEqual({ id: "item-80", title: "Ready" });
  expect(after.items[79]).toBe(before.items[79]);
  expect(after.items[81]).toBe(before.items[81]);
  expect(denseArrayCopies()).toBe(0);
});

test.each(([
  [{ op: "replace", path: "/items/0/n", value: 1 }, { op: "remove", path: "/deleted" }],
  [{ op: "copy", from: "/items/0", path: "/items/-" }],
  [{ op: "add", path: "/items/50/n", value: 1 }, { op: "add", path: "/items/0", value: { n: 0 } }],
  [{ op: "replace", path: "/items/50/n", value: 1 }, { op: "remove", path: "/items/0" }],
] satisfies JSONPatchOperation[][]).map((prefix) => ({ prefix })))("mixed array patches freeze shifted values, overlays and copied bases: $prefix", ({ prefix }) => {
  const initial = { items: Array.from({ length: 64 }, () => ({ n: 0 })), deleted: true };
  const document = createJSONDocument(initial);
  const before = document.value;
  resetDenseArrayCopies();
  expect(document.commit([...prefix, { op: "replace", path: "/items/1/n", value: 2 }]).ok).toBe(true);
  expect(denseArrayCopies()).toBe(0);
  expect(isDeepFrozen(document.value)).toBe(true);
  expect(before).toEqual(initial);
});

test("a batch of leaf replaces does not walk the whole value or dense-copy the array", () => {
  const items = Array.from({ length: 10_000 }, (_, item) => ({ id: `item-${item}`, title: "Draft" }));
  const document = createJSONDocument({ items });
  const before = document.value as { items: Array<{ id: string; title: string }> };
  resetDenseArrayCopies();
  const result = document.commit([
    { op: "replace", path: "/items/10/title", value: "A" },
    { op: "replace", path: "/items/80/title", value: "B" },
    { op: "replace", path: "/items/9999/title", value: "C" },
  ]);
  expect(result).toMatchObject({
    ok: true,
    change: {
      applied: [
        { op: "replace", path: "/items/10/title", value: "A" },
        { op: "replace", path: "/items/80/title", value: "B" },
        { op: "replace", path: "/items/9999/title", value: "C" },
      ],
    },
  });
  const after = document.value as { items: Array<{ id: string; title: string }> };
  expect(after.items[10]).toEqual({ id: "item-10", title: "A" });
  expect(after.items[80]).toEqual({ id: "item-80", title: "B" });
  expect(after.items[9999]).toEqual({ id: "item-9999", title: "C" });
  expect(after.items[11]).toBe(before.items[11]);
  expect(denseArrayCopies()).toBe(0);
  expect(document.commit([
    { op: "replace", path: "/items/10/title", value: "A" },
    { op: "replace", path: "/items/80/title", value: "B" },
    { op: "replace", path: "/items/9999/title", value: "C" },
  ])).toMatchObject({
    ok: true,
    change: { applied: [] },
  });
});

test("a root replace still freezes the whole owned tree", () => {
  const items = Array.from({ length: 32 }, (_, index) => ({ id: `item-${index}`, title: "Draft" }));
  const result = applyOwnedProtocolPatch({ items: [] }, [
    { op: "replace", path: "", value: { items } },
  ]);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(isDeepFrozen(result.value)).toBe(true);
});

test("overlapping array replacements preserve payloads, snapshots and untouched siblings", () => {
  const document = createJSONDocument({
    items: Array.from({ length: 128 }, (_, id) => ({ id, nested: { text: "before" } })),
  });
  const before = document.value;
  const untouched = document.at("/items/11");
  const payload = { id: 10, nested: { text: "injected" } };
  const operations: JSONPatchOperation[] = [
    { op: "replace", path: "/items/10", value: payload },
    { op: "replace", path: "/items/10/nested/text", value: "first" },
    { op: "replace", path: "/items/10/nested/text", value: "last" },
    { op: "replace", path: "/items/80/nested/text", value: null },
  ];

  resetDenseArrayCopies();
  resetOwnedPatchFreezeInspections();
  expect(document.validatePatch(operations)).toEqual({ ok: true });
  expect(document.value).toBe(before);
  expect(document.commit(operations)).toEqual({ ok: true, change: { applied: operations } });
  expect(denseArrayCopies()).toBe(0);
  expect(ownedPatchFreezeInspections()).toBeLessThan(100);
  expect(document.at("/items/10/nested/text")).toMatchObject({ ok: true, value: "last" });
  expect(document.at("/items/80/nested/text")).toMatchObject({ ok: true, value: null });
  expect(document.at("/items/11")).toEqual(untouched);
  const after = document.value as { items: Array<{ nested: { text: string | null } }> };
  expect(after.items[11]).toBe((before as typeof after).items[11]);
  expect((before as typeof after).items[10]!.nested.text).toBe("before");
  expect(payload.nested.text).toBe("injected");
  expect(Object.isFrozen(payload.nested)).toBe(false);
  expect(isDeepFrozen(after)).toBe(true);
});

test("replace batches preserve escaped, empty and __proto__ object keys", () => {
  const initial = JSON.parse('{"__proto__":{"value":0},"a/b":{"~":1},"":2}');
  const operations: JSONPatchOperation[] = [
    { op: "replace", path: "/__proto__/value", value: 3 },
    { op: "replace", path: "/a~1b/~0", value: null },
    { op: "replace", path: "/", value: 4 },
  ];
  const result = applyPatch(initial, operations);
  expect(result).toEqual({
    ok: true,
    value: JSON.parse('{"__proto__":{"value":3},"a/b":{"~":null},"":4}'),
    change: { applied: operations },
  });
  expect(initial.__proto__.value).toBe(0);
  if (result.ok) expect(Object.getPrototypeOf(result.value)).toBe(Object.prototype);
});

test.each(["/missing", "/items/01/text", "#/items/0/text"])(
  "a failed replace batch stays atomic and preserves the first failure (%s)",
  (path) => {
    const initial = { items: Array.from({ length: 64 }, () => ({ text: "before" })) };
    const document = createJSONDocument(initial);
    const before = document.value;
    let notifications = 0;
    document.subscribe(() => { notifications += 1; });
    const operations = [
      { op: "replace", path: "/items/0/text", value: "first" },
      { op: "replace", path, value: "invalid" },
      { op: "replace", path: "/items/1/text", value: undefined },
    ] as unknown as JSONPatchOperation[];
    const expected = {
      ok: false,
      code: path[0] === "#" ? "invalid_pointer" : "path_not_found",
      pointer: path,
    };
    expect(applyPatch(initial, operations)).toMatchObject(expected);
    expect(document.validatePatch(operations)).toMatchObject(expected);
    expect(document.commit(operations)).toMatchObject(expected);
    expect(document.value).toBe(before);
    expect(document.at("/items/0/text")).toMatchObject({ ok: true, value: "before" });
    expect(notifications).toBe(0);
    expect(initial.items[0]!.text).toBe("before");
  },
);

function applyOwnedAndCount(size: number, index: number) {
  const items = Array.from({ length: size }, (_, item) => ({ id: `item-${item}`, title: "Draft" }));
  const document = createJSONDocument({ items });
  const before = document.value as { items: Array<{ id: string; title: string }> };
  resetOwnedPatchFreezeInspections();
  const result = applyOwnedProtocolPatch(before, [
    { op: "replace", path: `/items/${index}/title`, value: "Ready" },
  ]);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("owned patch failed");
  return {
    before,
    after: result.value as { items: Array<{ id: string; title: string }> },
    inspections: ownedPatchFreezeInspections(),
  };
}

function isDeepFrozen(value: unknown): boolean {
  if (value === null || typeof value !== "object") return true;
  if (!Object.isFrozen(value)) return false;
  return Object.values(value).every(isDeepFrozen);
}
