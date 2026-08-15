import {
  createJSONDocument,
  type JSONPatchValidationResult,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import { expect, test } from "vitest";

import {
  runJSONDocumentConformance,
  type JSONDocument,
  type JSONDocumentValidation,
  type JSONDocumentHarness,
} from "../../../../standards/json-document-v3/conformance/suites/json-document.js";
import { runPressureConformance } from "../../../../standards/json-document-v3/conformance/suites/pressure.js";

function taskListValidation(candidate: JSONValue): JSONPatchValidationResult {
  const valid = isRecord(candidate)
    && typeof candidate.title === "string"
    && Array.isArray(candidate.items)
    && candidate.items.every((item) => (
      isRecord(item)
      && typeof item.id === "string"
      && typeof item.done === "boolean"
    ))
    && isRecord(candidate.meta)
    && typeof candidate.meta.owner === "string";
  return valid
    ? { ok: true }
    : {
        ok: false,
        code: "schema_violation",
        reason: "candidate does not satisfy the task-list validation rule",
      };
}

function createReferenceJSONDocument(
  validation: JSONDocumentValidation,
  initial: JSONValue,
): JSONDocument {
  const validate = validation === "task-list"
    ? taskListValidation
    : validation === "attempt-transform"
      ? attemptTransformValidation
      : undefined;
  return createJSONDocument(
    initial,
    validate === undefined ? {} : { validate },
  );
}

function attemptTransformValidation(
  candidate: JSONValue,
): JSONPatchValidationResult {
  if (isRecord(candidate)) {
    Reflect.set(candidate, "title", "Implicit");
  }
  return { ok: true };
}

function isRecord(
  value: JSONValue | undefined,
): value is { readonly [key: string]: JSONValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const referenceHarness: JSONDocumentHarness = {
  create: createReferenceJSONDocument,
};

runJSONDocumentConformance(referenceHarness);
runPressureConformance(referenceHarness);

test("nested commits preserve one causal notification order for every subscriber", () => {
  const document = createJSONDocument({ value: 0 });
  const first: JSONValue[] = [];
  const second: JSONValue[] = [];

  document.subscribe((change) => {
    first.push(change.applied[0]?.op === "replace"
      ? change.applied[0].value
      : null);
    if (first.length === 1) {
      document.commit([{ op: "replace", path: "/value", value: 2 }]);
    }
  });
  document.subscribe((change) => {
    second.push(change.applied[0]?.op === "replace"
      ? change.applied[0].value
      : null);
  });

  document.commit([{ op: "replace", path: "/value", value: 1 }]);

  expect(first).toEqual([1, 2]);
  expect(second).toEqual([1, 2]);
});

test("a throwing subscriber cannot escape commit or prevent later delivery", () => {
  const document = createJSONDocument({ value: 0 });
  const delivered: JSONValue[] = [];

  document.subscribe(() => {
    throw new Error("subscriber failed");
  });
  document.subscribe((change) => {
    delivered.push(change.applied[0]?.op === "replace"
      ? change.applied[0].value
      : null);
  });

  const result = document.commit([
    { op: "replace", path: "/value", value: 1 },
  ]);

  expect(result).toMatchObject({
    ok: true,
    change: {
      applied: [{ op: "replace", path: "/value", value: 1 }],
    },
  });
  expect(delivered).toEqual([1]);
  expect(document.value).toEqual({ value: 1 });
});

test("owned commits share unchanged branches while isolating and freezing new values", () => {
  const document = createJSONDocument({
    items: [
      { id: "a", payload: { rank: 1 } },
      { id: "b", payload: { rank: 2 } },
    ],
    stable: { owner: "core" },
  });
  const before = document.value as {
    readonly items: ReadonlyArray<{
      readonly id: string;
      readonly payload: { readonly rank: number };
    }>;
    readonly stable: { readonly owner: string };
  };
  const payload = { rank: 3 };

  const replaced = document.commit([{
    op: "replace",
    path: "/items/1/payload",
    value: payload,
  }]);
  expect(replaced.ok).toBe(true);

  const afterReplace = document.value as typeof before;
  expect(afterReplace).not.toBe(before);
  expect(afterReplace.items).not.toBe(before.items);
  expect(afterReplace.items[0]).toBe(before.items[0]);
  expect(afterReplace.stable).toBe(before.stable);
  expect(afterReplace.items[1]?.payload).not.toBe(payload);
  expect(afterReplace.items[1]?.payload).toEqual({ rank: 3 });
  expect(Object.isFrozen(afterReplace)).toBe(true);
  expect(Object.isFrozen(afterReplace.items)).toBe(true);
  expect(Object.isFrozen(afterReplace.items[1])).toBe(true);
  expect(Object.isFrozen(afterReplace.items[1]?.payload)).toBe(true);

  payload.rank = 99;
  expect(afterReplace.items[1]?.payload.rank).toBe(3);
  expect(Reflect.set(afterReplace.items[1]!.payload, "rank", 99)).toBe(false);

  const copied = document.commit([{
    op: "copy",
    from: "/items/1",
    path: "/items/-",
  }]);
  expect(copied.ok).toBe(true);

  const afterCopy = document.value as typeof before;
  expect(afterCopy.items[2]).toEqual(afterCopy.items[1]);
  expect(afterCopy.items[2]).not.toBe(afterCopy.items[1]);
  expect(afterCopy.items[2]?.payload).not.toBe(afterCopy.items[1]?.payload);
  expect(Object.isFrozen(afterCopy.items[2])).toBe(true);
  expect(Object.isFrozen(afterCopy.items[2]?.payload)).toBe(true);
  expect(before.items).toHaveLength(2);

  const moved = document.commit([{
    op: "move",
    from: "/items/0",
    path: "/items/-",
  }]);
  expect(moved).toMatchObject({
    ok: true,
    change: {
      applied: [{
        op: "move",
        from: "/items/0",
        path: "/items/2",
      }],
    },
  });
  const afterMove = document.value as typeof before;
  expect(afterMove.items.map((item) => item.id)).toEqual(["b", "b", "a"]);
  expect(Object.isFrozen(afterMove)).toBe(true);
  expect(Object.isFrozen(afterMove.items)).toBe(true);
});

test("owned preparation keeps earlier failure precedence and commit atomicity", () => {
  const document = createJSONDocument({ value: 1 });
  const operations = [
    { op: "test", path: "/value", value: 2 },
    { op: "add", path: "/callback", value: () => undefined },
  ] as unknown as ReadonlyArray<JSONPatchOperation>;
  const notifications: JSONValue[] = [];
  document.subscribe(() => notifications.push(document.value));

  expect(document.validatePatch(operations)).toMatchObject({
    ok: false,
    code: "test_failed",
    pointer: "/value",
  });
  expect(document.commit(operations)).toMatchObject({
    ok: false,
    code: "test_failed",
    pointer: "/value",
  });
  expect(document.value).toEqual({ value: 1 });
  expect(notifications).toEqual([]);
});

test("initial and validation boundaries fail without publishing invalid state", () => {
  expect(() => createJSONDocument(() => undefined)).toThrow(TypeError);
  expect(() => createJSONDocument(
    { value: 0 },
    {
      validate: () => ({
        ok: false,
        code: "schema_violation",
      }),
    },
  )).toThrow(TypeError);

  const throwingValidationDocument = createJSONDocument(
    { value: 0 },
    {
      validate(candidate) {
        if (
          typeof candidate === "object"
          && candidate !== null
          && "value" in candidate
          && candidate.value === 1
        ) {
          throw new Error("provider failed");
        }
        return { ok: true };
      },
    },
  );
  const observed: unknown[] = [];
  throwingValidationDocument.subscribe((change) => observed.push(change));

  expect(throwingValidationDocument.commit([
    { op: "replace", path: "/value", value: 1 },
  ])).toMatchObject({
    ok: false,
    code: "schema_violation",
    reason: "provider failed",
  });
  expect(throwingValidationDocument.value).toEqual({ value: 0 });
  expect(observed).toEqual([]);
});

test("malformed validation results fail closed without changing state", () => {
  expect(() => createJSONDocument(
    { value: 0 },
    { validate: () => undefined as never },
  )).toThrow(TypeError);

  const document = createJSONDocument(
    { value: 0 },
    {
      validate(candidate) {
        return isRecord(candidate) && candidate.value === 1
          ? undefined as never
          : { ok: true };
      },
    },
  );
  const observed: unknown[] = [];
  document.subscribe((change) => observed.push(change));
  const operations = [{
    op: "replace",
    path: "/value",
    value: 1,
  }] as const;

  expect(document.validatePatch(operations)).toMatchObject({
    ok: false,
    code: "schema_violation",
  });
  expect(document.commit(operations)).toMatchObject({
    ok: false,
    code: "schema_violation",
  });
  expect(document.value).toEqual({ value: 0 });
  expect(observed).toEqual([]);
});

test("validation evaluation blocks reentrant probes and commits without changing state", () => {
  let document: ReturnType<typeof createJSONDocument> | undefined;
  const nestedResults: unknown[] = [];
  const notifications: Array<{
    readonly change: unknown;
    readonly value: JSONValue;
  }> = [];

  document = createJSONDocument(
    { a: 0, b: 0 },
    {
      validate(candidate) {
        if (
          document !== undefined
          && isRecord(candidate)
          && candidate.a === 1
        ) {
          nestedResults.push(document.validatePatch([
            { op: "replace", path: "/b", value: 2 },
          ]));
          nestedResults.push(document.commit([
            { op: "replace", path: "/b", value: 2 },
          ]));
        }
        return { ok: true };
      },
    },
  );
  document.subscribe((change) => {
    notifications.push({ change, value: document!.value });
  });

  expect(document.validatePatch([
    { op: "replace", path: "/a", value: 1 },
  ])).toEqual({ ok: true });
  expect(document.value).toEqual({ a: 0, b: 0 });
  expect(notifications).toEqual([]);

  expect(document.commit([
    { op: "replace", path: "/a", value: 1 },
  ])).toMatchObject({
    ok: true,
    change: {
      applied: [{ op: "replace", path: "/a", value: 1 }],
    },
  });

  expect(nestedResults).toHaveLength(4);
  for (const result of nestedResults) {
    expect(result).toEqual({
      ok: false,
      code: "acceptance_reentrancy",
      reason: "validation callback cannot call validatePatch or commit",
    });
  }
  expect(document.value).toEqual({ a: 1, b: 0 });
  expect(notifications).toEqual([{
    change: {
      applied: [{ op: "replace", path: "/a", value: 1 }],
    },
    value: { a: 1, b: 0 },
  }]);
});

test("state-equivalent commits expose a frozen empty applied list", () => {
  const document = createJSONDocument({ value: 1 });
  const notifications: unknown[] = [];
  document.subscribe((change) => notifications.push(change));

  const result = document.commit([
    { op: "replace", path: "/value", value: 1 },
  ]);

  expect(result).toMatchObject({
    ok: true,
    change: { applied: [] },
  });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(Object.isFrozen(result.change.applied)).toBe(true);
  expect(Reflect.set(
    result.change.applied,
    "0",
    { op: "remove", path: "/value" },
  )).toBe(false);
  expect(result.change.applied).toEqual([]);
  expect(document.value).toEqual({ value: 1 });
  expect(notifications).toEqual([]);
});

test("a leaf replace keeps unrelated sibling identity and does not emit a root replace", () => {
  const items = Array.from({ length: 256 }, (_, index) => ({ id: `item-${index}`, title: "Draft" }));
  const document = createJSONDocument({ items });
  const before = document.value as { items: Array<{ id: string; title: string }> };
  const result = document.commit([{ op: "replace", path: "/items/80/title", value: "Ready" }]);
  expect(result).toMatchObject({
    ok: true,
    change: { applied: [{ op: "replace", path: "/items/80/title", value: "Ready" }] },
  });
  const after = document.value as { items: Array<{ id: string; title: string }> };
  expect(after.items[80]).toEqual({ id: "item-80", title: "Ready" });
  expect(after.items[79]).toBe(before.items[79]);
  expect(after.items[81]).toBe(before.items[81]);
  expect(document.commit([{ op: "replace", path: "/items/80/title", value: "Ready" }])).toMatchObject({
    ok: true,
    change: { applied: [] },
  });
});
