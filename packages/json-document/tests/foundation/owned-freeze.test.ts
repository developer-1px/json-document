import { createJSONDocument } from "@interactive-os/json-document";
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
