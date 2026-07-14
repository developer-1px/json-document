import { describe, expect, test, vi } from "vitest";
import * as z from "zod";

import {
  createJSONDocument,
  type JSONPatchOperation,
} from "@interactive-os/json-document";

const Schema = z.object({
  items: z.array(z.object({
    id: z.string(),
    meta: z.object({
      tag: z.string(),
      rank: z.number(),
    }),
  })),
  settings: z.object({
    active: z.string(),
  }),
});

const initial: z.output<typeof Schema> = {
  items: [
    { id: "a", meta: { tag: "initial", rank: 0 } },
    { id: "b", meta: { tag: "untouched", rank: 1 } },
  ],
  settings: { active: "main" },
};

function createDocument() {
  return createJSONDocument(Schema, initial, {
    history: 10,
    selection: { mode: "single", initial: ["/items/0/meta/rank"] },
  });
}

describe("overlapping replace batch", () => {
  test("preserves sequential semantics and clones each touched branch without mutating patch values", () => {
    const doc = createDocument();
    const before = doc.value;
    const replacement = { tag: "batch", rank: 10 };
    const operations: JSONPatchOperation[] = [
      { op: "replace", path: "/items/0/meta", value: replacement },
      { op: "replace", path: "/items/0/meta/rank", value: 11 },
      { op: "replace", path: "/items/0/meta/tag", value: "final" },
    ];
    const inverse: JSONPatchOperation[] = [
      { op: "replace", path: "/items/0/meta/tag", value: "batch" },
      { op: "replace", path: "/items/0/meta/rank", value: 10 },
      { op: "replace", path: "/items/0/meta", value: { tag: "initial", rank: 0 } },
    ];
    const observed: ReadonlyArray<JSONPatchOperation>[] = [];
    const unsubscribe = doc.subscribe((patch) => { observed.push(patch); });

    expect(doc.patch(operations)).toEqual({ ok: true });

    expect(doc.value.items[0]?.meta).toEqual({ tag: "final", rank: 11 });
    expect(replacement).toEqual({ tag: "batch", rank: 10 });
    expect(doc.lastPatch).toEqual(operations);
    expect(observed).toEqual([operations]);
    expect(doc.value).not.toBe(before);
    expect(doc.value.items).not.toBe(before.items);
    expect(doc.value.items[0]).not.toBe(before.items[0]);
    expect(doc.value.items[1]).toBe(before.items[1]);
    expect(doc.value.settings).toBe(before.settings);
    expect(doc.history.undoDepth).toBe(1);
    expect(doc.history.redoDepth).toBe(0);

    expect(doc.undo()).toEqual({ ok: true });
    expect(doc.value).toEqual(initial);
    expect(doc.lastPatch).toEqual(inverse);
    expect(doc.history.undoDepth).toBe(0);
    expect(doc.history.redoDepth).toBe(1);
    expect(doc.redo()).toEqual({ ok: true });
    expect(doc.value.items[0]?.meta).toEqual({ tag: "final", rank: 11 });
    expect(doc.lastPatch).toEqual(operations);
    expect(doc.history.undoDepth).toBe(1);
    expect(doc.history.redoDepth).toBe(0);
    expect(observed).toEqual([operations, inverse, operations]);
    expect(replacement).toEqual({ tag: "batch", rank: 10 });
    unsubscribe();
  });

  test("keeps ancestor and descendant operation order observable", () => {
    const descendantThenAncestor = createDocument();
    const descendantFirst: JSONPatchOperation[] = [
      { op: "replace", path: "/items/0/meta/rank", value: 20 },
      { op: "replace", path: "/items/0/meta", value: { tag: "ancestor", rank: 21 } },
    ];
    const descendantFirstInverse: JSONPatchOperation[] = [
      { op: "replace", path: "/items/0/meta", value: { tag: "initial", rank: 20 } },
      { op: "replace", path: "/items/0/meta/rank", value: 0 },
    ];
    const observed: ReadonlyArray<JSONPatchOperation>[] = [];
    const unsubscribe = descendantThenAncestor.subscribe((patch) => { observed.push(patch); });
    expect(descendantThenAncestor.patch(descendantFirst)).toEqual({ ok: true });
    expect(descendantThenAncestor.value.items[0]?.meta).toEqual({ tag: "ancestor", rank: 21 });
    expect(descendantThenAncestor.undo()).toEqual({ ok: true });
    expect(descendantThenAncestor.value).toEqual(initial);
    expect(descendantThenAncestor.lastPatch).toEqual(descendantFirstInverse);
    expect(descendantThenAncestor.redo()).toEqual({ ok: true });
    expect(descendantThenAncestor.lastPatch).toEqual(descendantFirst);
    expect(descendantThenAncestor.undo()).toEqual({ ok: true });
    expect(descendantThenAncestor.value).toEqual(initial);
    expect(descendantThenAncestor.lastPatch).toEqual(descendantFirstInverse);
    expect(observed).toEqual([
      descendantFirst,
      descendantFirstInverse,
      descendantFirst,
      descendantFirstInverse,
    ]);
    unsubscribe();

    const ancestorThenDescendant = createDocument();
    expect(ancestorThenDescendant.patch([
      { op: "replace", path: "/items/0/meta", value: { tag: "ancestor", rank: 21 } },
      { op: "replace", path: "/items/0/meta/rank", value: 22 },
    ])).toEqual({ ok: true });
    expect(ancestorThenDescendant.value.items[0]?.meta).toEqual({ tag: "ancestor", rank: 22 });
  });

  test("validates the final state after overlapping replacements repair intermediate values", () => {
    const descendantThenAncestor = createDocument();
    expect(descendantThenAncestor.patch([
      { op: "replace", path: "/items/0/meta/rank", value: "temporarily-invalid" },
      { op: "replace", path: "/items/0/meta", value: { tag: "ancestor", rank: 21 } },
    ])).toEqual({ ok: true });
    expect(descendantThenAncestor.value.items[0]?.meta).toEqual({ tag: "ancestor", rank: 21 });

    const ancestorThenDescendant = createDocument();
    expect(ancestorThenDescendant.patch([
      { op: "replace", path: "/items/0/meta", value: { tag: "ancestor", rank: "temporarily-invalid" } },
      { op: "replace", path: "/items/0/meta/rank", value: 22 },
    ])).toEqual({ ok: true });
    expect(ancestorThenDescendant.value.items[0]?.meta).toEqual({ tag: "ancestor", rank: 22 });
  });

  test("keeps leading test assertions in forward history without adding inverses", () => {
    const doc = createDocument();
    const operations: JSONPatchOperation[] = [
      { op: "test", path: "/items/0/meta", value: { tag: "initial", rank: 0 } },
      { op: "test", path: "/items/0/meta/rank", value: 0 },
      { op: "replace", path: "/items/0/meta", value: { tag: "guarded", rank: 30 } },
      { op: "replace", path: "/items/0/meta/rank", value: 31 },
    ];

    expect(doc.patch(operations)).toEqual({ ok: true });
    expect(doc.value.items[0]?.meta).toEqual({ tag: "guarded", rank: 31 });
    expect(doc.lastPatch).toEqual(operations);
    expect(doc.undo()).toEqual({ ok: true });
    expect(doc.value).toEqual(initial);
    expect(doc.lastPatch).toEqual([
      { op: "replace", path: "/items/0/meta/rank", value: 30 },
      { op: "replace", path: "/items/0/meta", value: { tag: "initial", rank: 0 } },
    ]);
    expect(doc.redo()).toEqual({ ok: true });
    expect(doc.value.items[0]?.meta).toEqual({ tag: "guarded", rank: 31 });
    expect(doc.lastPatch).toEqual(operations);
  });

  test("preserves stable failure fields and atomicity for guarded replace batches", () => {
    const cases: Array<{
      operations: JSONPatchOperation[];
      expected: Record<string, unknown>;
    }> = [{
      operations: [
        { op: "test", path: "/items/0/meta/rank", value: 99 },
        { op: "replace", path: "/items/0/meta/rank", value: 1 },
      ],
      expected: {
        ok: false,
        code: "test_failed",
        pointer: "/items/0/meta/rank",
      },
    }, {
      operations: [
        { op: "test", path: "/items/0/meta/tag", value: "initial" },
        { op: "test", path: "/items/0/meta/rank", value: 99 },
        { op: "replace", path: "/items/0/meta/rank", value: 1 },
      ],
      expected: {
        ok: false,
        code: "test_failed",
        pointer: "/items/0/meta/rank",
      },
    }, {
      operations: [
        { op: "test", path: "/items/0/meta/tag", value: "initial" },
        { op: "test", path: "/items/0/meta/rank", value: 0 },
        { op: "replace", path: "/items/0/meta/missing", value: 1 },
        { op: "replace", path: "/items/0/meta/rank", value: 2 },
      ],
      expected: {
        ok: false,
        code: "path_not_found",
        pointer: "/items/0/meta/missing",
      },
    }];

    for (const { operations, expected } of cases) {
      const doc = createDocument();
      const before = doc.value;
      const listener = vi.fn();
      doc.subscribe(listener);

      expect(doc.patch(operations)).toMatchObject(expected);
      expect(doc.value).toBe(before);
      expect(doc.lastPatch).toEqual([]);
      expect(doc.history.undoDepth).toBe(0);
      expect(listener).not.toHaveBeenCalled();
    }
  });

  test("discards the prepared draft when a later operation fails", () => {
    const doc = createDocument();
    expect(doc.patch({ op: "replace", path: "/settings/active", value: "changed" })).toEqual({ ok: true });
    expect(doc.undo()).toEqual({ ok: true });
    const before = doc.value;
    const beforeSelection = doc.selection?.snapshot();
    const beforeLastPatch = doc.lastPatch;
    const beforeUndoDepth = doc.history.undoDepth;
    const beforeRedoDepth = doc.history.redoDepth;
    const listener = vi.fn();
    doc.subscribe(listener);

    expect(doc.patch([
      { op: "replace", path: "/items/0/meta", value: { tag: "temporary", rank: 30 } },
      { op: "replace", path: "/items/0/meta/rank", value: "invalid" },
    ])).toMatchObject({
      ok: false,
      code: "schema_violation",
    });

    expect(doc.value).toBe(before);
    expect(doc.selection?.snapshot()).toEqual(beforeSelection);
    expect(doc.lastPatch).toEqual(beforeLastPatch);
    expect(doc.history.undoDepth).toBe(beforeUndoDepth);
    expect(doc.history.redoDepth).toBe(beforeRedoDepth);
    expect(listener).not.toHaveBeenCalled();
    expect(doc.redo()).toEqual({ ok: true });
    expect(doc.value.settings.active).toBe("changed");
  });

  test("keeps the existing per-operation schema error precedence for non-root overlaps", () => {
    const schemaFirst = createDocument();
    const schemaFirstBefore = schemaFirst.value;
    expect(schemaFirst.patch([
      { op: "replace", path: "/items/0/meta", value: { tag: "bad", rank: "invalid" } },
      { op: "replace", path: "/items/0/meta/missing", value: 1 },
    ])).toMatchObject({ ok: false, code: "schema_violation" });
    expect(schemaFirst.value).toBe(schemaFirstBefore);

    const pathFirst = createDocument();
    const pathFirstBefore = pathFirst.value;
    expect(pathFirst.patch([
      { op: "replace", path: "/items/0/meta/missing", value: 1 },
      { op: "replace", path: "/items/0/meta/rank", value: "invalid" },
    ])).toMatchObject({
      ok: false,
      code: "path_not_found",
      pointer: "/items/0/meta/missing",
    });
    expect(pathFirst.value).toBe(pathFirstBefore);
  });

  test("preserves whole-batch failure priority and indexes for independent replacements", () => {
    const ErrorSchema = z.object({
      first: z.string().min(1),
      second: z.string(),
    });

    const nonSerializable = createJSONDocument(ErrorSchema, { first: "ok", second: "ok" });
    const serializationFailure = nonSerializable.patch([
      { op: "replace", path: "/first", value: "" },
      { op: "replace", path: "/second", value: () => "invalid" } as never,
    ]);
    expect(serializationFailure).toMatchObject({ ok: false, code: "not_serializable" });
    if (!serializationFailure.ok) expect(serializationFailure.reason).toContain("op[1]");

    const missingPath = createJSONDocument(ErrorSchema, { first: "ok", second: "ok" });
    expect(missingPath.patch([
      { op: "replace", path: "/first", value: "" },
      { op: "replace", path: "/missing", value: "value" },
    ])).toMatchObject({
      ok: false,
      code: "path_not_found",
      pointer: "/missing",
      reason: expect.stringContaining("op[1]"),
    });
  });

  test("preserves the first violation for flat root replacement batches", () => {
    const FlatSchema = z.object({ first: z.number(), second: z.number() });
    const doc = createJSONDocument(FlatSchema, { first: 1, second: 2 });
    const result = doc.canPatch([
      { op: "replace", path: "/second", value: "invalid" },
      { op: "replace", path: "/first", value: "invalid" },
    ]);

    expect(result).toMatchObject({ ok: false, code: "schema_violation" });
    if (!result.ok) {
      expect(result.violations).toEqual([
        { path: "/second", message: expect.any(String) },
      ]);
    }
  });

  test("preserves pre-apply validation precedence for legacy root and array batches", () => {
    const RootSchema = z.object({ first: z.number(), second: z.string() });
    const invalidFirst = createJSONDocument(RootSchema, { first: 1, second: "ok" });
    expect(invalidFirst.canPatch([
      { op: "replace", path: "/first", value: "invalid" },
      { op: "replace", path: "/second", value: () => "invalid" } as never,
    ])).toMatchObject({
      ok: false,
      code: "schema_violation",
      violations: [{ path: "/first", message: expect.any(String) }],
    });

    const invalidSecond = createJSONDocument(RootSchema, { first: 1, second: "ok" });
    const rootSerialization = invalidSecond.patch([
      { op: "replace", path: "/first", value: 2 },
      { op: "replace", path: "/second", value: () => "invalid" } as never,
    ]);
    expect(rootSerialization).toMatchObject({ ok: false, code: "not_serializable" });
    if (!rootSerialization.ok) expect(rootSerialization.reason).not.toContain("op[1]");

    const ArraySchema = z.object({
      items: z.array(z.object({ value: z.number() })),
    });
    const array = createJSONDocument(ArraySchema, {
      items: [{ value: 1 }, { value: 2 }],
    });
    const arraySerialization = array.patch([
      { op: "replace", path: "/items/0/value", value: 3 },
      { op: "replace", path: "/items/1/value", value: () => 4 } as never,
    ]);
    expect(arraySerialization).toMatchObject({ ok: false, code: "not_serializable" });
    if (!arraySerialization.ok) expect(arraySerialization.reason).not.toContain("op[1]");
  });

  test("preserves root pre-validation before an unsupported existing key", () => {
    const CatchallSchema = z.object({ a: z.number() }).catchall(z.number());
    const doc = createJSONDocument(CatchallSchema, { a: 1, extra: 2 });
    const result = doc.canPatch([
      { op: "replace", path: "/a", value: "invalid" },
      { op: "replace", path: "/extra", value: () => 2 } as never,
    ]);

    expect(result).toMatchObject({
      ok: false,
      code: "schema_violation",
      violations: [{ path: "/a", message: expect.any(String) }],
    });
  });

  test("keeps full violation aggregation for wrapped root objects", () => {
    const BaseSchema = z.object({ a: z.number(), b: z.number() });
    const schemas = [
      BaseSchema.optional(),
      BaseSchema.nullable(),
      z.lazy(() => BaseSchema),
    ];

    for (const schema of schemas) {
      const doc = createJSONDocument(schema, { a: 1, b: 2 });
      const result = doc.canPatch([
        { op: "replace", path: "/a", value: "invalid" },
        { op: "replace", path: "/b", value: "invalid" },
      ]);

      expect(result).toMatchObject({ ok: false, code: "schema_violation" });
      if (!result.ok) {
        expect(result.violations?.map((violation) => violation.path)).toEqual([
          "/a",
          "/b",
        ]);
      }
    }
  });

  test("preserves array pre-validation before a later missing leaf", () => {
    const FieldSchema = z.object({
      items: z.array(z.object({ value: z.number().optional() })),
    });
    const field = createJSONDocument(FieldSchema, { items: [{ value: 1 }, {}] });
    expect(field.canPatch([
      { op: "replace", path: "/items/0/value", value: "invalid" },
      { op: "replace", path: "/items/1/value", value: 2 },
    ])).toMatchObject({
      ok: false,
      code: "schema_violation",
      violations: [{ path: "/items/0/value", message: expect.any(String) }],
    });

    const NestedSchema = z.object({
      items: z.array(z.object({
        nested: z.object({ x: z.number().optional() }),
      })),
    });
    const nested = createJSONDocument(NestedSchema, {
      items: [{ nested: { x: 1 } }, { nested: {} }],
    });
    expect(nested.canPatch([
      { op: "replace", path: "/items/0/nested/x", value: "invalid" },
      { op: "replace", path: "/items/1/nested/x", value: 2 },
    ])).toMatchObject({
      ok: false,
      code: "schema_violation",
      violations: [{ path: "/items/0/nested/x", message: expect.any(String) }],
    });
  });

  test("does not widen legacy aggregation past the first nested array", () => {
    const InnerArraySchema = z.object({
      rows: z.array(z.object({
        cells: z.array(z.object({ nested: z.object({ x: z.number() }) })),
      })),
    });
    const doc = createJSONDocument(InnerArraySchema, {
      rows: [{
        cells: [
          { nested: { x: 1 } },
          { nested: { x: 2 } },
        ],
      }],
    });
    const result = doc.patch([
      { op: "replace", path: "/rows/0/cells/0/nested/x", value: 3 },
      { op: "replace", path: "/rows/0/cells/1/nested/x", value: () => 4 } as never,
    ]);

    expect(result).toMatchObject({ ok: false, code: "not_serializable" });
    if (!result.ok) expect(result.reason).toContain("op[1]");
  });

  test("handles independent mixed-depth replacements without entering array batching", () => {
    const MixedSchema = z.object({
      items: z.array(z.object({ field: z.number().optional() })),
      other: z.number(),
    });
    const doc = createJSONDocument(MixedSchema, {
      items: [{ field: 1 }],
      other: 2,
    });

    expect(doc.patch([
      { op: "replace", path: "/items/0/field", value: 3 },
      { op: "replace", path: "/other", value: 4 },
    ])).toEqual({ ok: true });
    expect(doc.value).toEqual({ items: [{ field: 3 }], other: 4 });
  });

  test("keeps checked root aggregation and whole-batch failure priority", () => {
    const CheckedRootSchema = z.object({
      first: z.number().min(0),
      second: z.number().min(0),
    });
    const checked = createJSONDocument(CheckedRootSchema, { first: 1, second: 2 });
    const checkedResult = checked.canPatch([
      { op: "replace", path: "/first", value: -1 },
      { op: "replace", path: "/second", value: -2 },
    ]);
    expect(checkedResult).toMatchObject({ ok: false, code: "schema_violation" });
    if (!checkedResult.ok) {
      expect(checkedResult.violations?.map((violation) => violation.path)).toEqual([
        "/first",
        "/second",
      ]);
    }

    const NestedCheckedSchema = z.object({
      item: z.object({ count: z.number().min(0) }),
    });
    const missing = createJSONDocument(NestedCheckedSchema, { item: { count: 1 } });
    expect(missing.patch([
      { op: "replace", path: "/item", value: { count: -1 } },
      { op: "replace", path: "/item/missing", value: 2 },
    ])).toMatchObject({
      ok: false,
      code: "path_not_found",
      pointer: "/item/missing",
      reason: expect.stringContaining("op[1]"),
    });

    const nonSerializable = createJSONDocument(NestedCheckedSchema, { item: { count: 1 } });
    expect(nonSerializable.patch([
      { op: "replace", path: "/item", value: { count: -1 } },
      { op: "replace", path: "/item/count", value: () => 2 } as never,
    ])).toMatchObject({
      ok: false,
      code: "not_serializable",
      reason: expect.stringContaining("op[1]"),
    });
  });

  test("keeps canonical violation order for checked overlapping replacements", () => {
    const CheckedObject = z.object({
      a: z.number().min(0),
      b: z.number().min(0),
    });
    const object = createJSONDocument(CheckedObject, { a: 1, b: 2 });
    const objectResult = object.canPatch([
      { op: "replace", path: "/b", value: 3 },
      { op: "replace", path: "/a", value: -1 },
      { op: "replace", path: "/b", value: -2 },
    ]);
    expect(objectResult).toMatchObject({ ok: false, code: "schema_violation" });
    if (!objectResult.ok) {
      expect(objectResult.violations?.map((violation) => violation.path)).toEqual([
        "/a",
        "/b",
      ]);
    }

    const CheckedArray = z.array(z.number().min(0));
    const array = createJSONDocument(CheckedArray, [1, 2]);
    const arrayResult = array.canPatch([
      { op: "replace", path: "/1", value: 3 },
      { op: "replace", path: "/0", value: -1 },
      { op: "replace", path: "/1", value: -2 },
    ]);
    expect(arrayResult).toMatchObject({ ok: false, code: "schema_violation" });
    if (!arrayResult.ok) {
      expect(arrayResult.violations?.map((violation) => violation.path)).toEqual([
        "/0",
        "/1",
      ]);
    }
  });

  test("falls back to the legacy singleton error wording when a known value removes a later path", () => {
    const OptionalSchema = z.object({
      a: z.object({ x: z.number().optional() }),
    });
    const doc = createJSONDocument(OptionalSchema, { a: { x: 1 } });
    const before = doc.value;

    expect(doc.patch([
      { op: "replace", path: "/a", value: {} },
      { op: "replace", path: "/a/x", value: 2 },
    ])).toMatchObject({
      ok: false,
      code: "path_not_found",
      reason: "op[0]: object key: x",
      pointer: "/a/x",
    });
    expect(doc.value).toBe(before);
  });

  test("keeps final-state validation for root and refined-schema batches", () => {
    const rootBatch = createDocument();
    expect(rootBatch.patch([
      {
        op: "replace",
        path: "",
        value: {
          ...initial,
          items: [
            { id: "a", meta: { tag: "root", rank: "temporarily-invalid" } },
            initial.items[1],
          ],
        },
      },
      { op: "replace", path: "/items/0/meta/rank", value: 42 },
    ])).toEqual({ ok: true });
    expect(rootBatch.value.items[0]?.meta).toEqual({ tag: "root", rank: 42 });

    const RefinedSchema = Schema.refine((value) => value.settings.active.length > 0);
    const refined = createJSONDocument(RefinedSchema, initial);
    expect(refined.patch([
      { op: "replace", path: "/items/0/meta", value: { tag: "refined", rank: "temporarily-invalid" } },
      { op: "replace", path: "/items/0/meta/rank", value: 43 },
    ])).toEqual({ ok: true });
    expect(refined.value.items[0]?.meta).toEqual({ tag: "refined", rank: 43 });
  });

  test("matches sequential execution for deterministic overlapping workloads", () => {
    const batch = createDocument();
    const reference = createDocument();
    const operations: JSONPatchOperation[] = Array.from({ length: 100 }, (_, index) =>
      index % 3 === 0
        ? { op: "replace", path: "/items/0/meta", value: { tag: `tag-${index}`, rank: index } }
        : index % 3 === 1
          ? { op: "replace", path: "/items/0/meta/rank", value: index }
          : { op: "replace", path: "/items/0/meta/tag", value: `tag-${index}` });

    expect(batch.patch(operations)).toEqual({ ok: true });
    for (const operation of operations) {
      expect(reference.patch(operation)).toEqual({ ok: true });
    }

    expect(batch.value).toEqual(reference.value);
    expect(batch.lastPatch).toEqual(operations);
  });

  test("treats __proto__ as data while drafting overlapping paths", () => {
    const ProtoSchema = z.object({
      container: z.record(z.string(), z.object({ rank: z.number() })),
    });
    const container: Record<string, { rank: number }> = {};
    Object.defineProperty(container, "__proto__", {
      value: { rank: 0 },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    const doc = createJSONDocument(ProtoSchema, { container }, { history: 10, trustedInitial: true });
    const replacement = { rank: 1 };
    const operations: JSONPatchOperation[] = [
      { op: "replace", path: "/container/__proto__", value: replacement },
      { op: "replace", path: "/container/__proto__/rank", value: 2 },
    ];
    const inverse: JSONPatchOperation[] = [
      { op: "replace", path: "/container/__proto__/rank", value: 1 },
      { op: "replace", path: "/container/__proto__", value: { rank: 0 } },
    ];
    const observed: ReadonlyArray<JSONPatchOperation>[] = [];
    doc.subscribe((patch) => { observed.push(patch); });

    expect(doc.patch(operations)).toEqual({ ok: true });

    expect(Object.prototype.hasOwnProperty.call(doc.value.container, "__proto__")).toBe(true);
    expect(doc.value.container.__proto__).toEqual({ rank: 2 });
    expect(Object.getPrototypeOf(doc.value.container)).toBe(Object.prototype);
    expect((Object.prototype as { rank?: number }).rank).toBeUndefined();
    expect(doc.undo()).toEqual({ ok: true });
    expect(Object.prototype.hasOwnProperty.call(doc.value.container, "__proto__")).toBe(true);
    expect(doc.value.container.__proto__).toEqual({ rank: 0 });
    expect(Object.getPrototypeOf(doc.value.container)).toBe(Object.prototype);
    expect(doc.redo()).toEqual({ ok: true });
    expect(doc.value.container.__proto__).toEqual({ rank: 2 });
    expect(Object.getPrototypeOf(doc.value.container)).toBe(Object.prototype);
    expect((Object.prototype as { rank?: number }).rank).toBeUndefined();
    expect(replacement).toEqual({ rank: 1 });
    expect(observed).toEqual([operations, inverse, operations]);
  });

  test("preserves root dash-key validation precedence", () => {
    const doc = createJSONDocument(
      z.record(z.string(), z.number()),
      { "-": 1, stable: 2 },
    );
    const before = doc.value;

    expect(doc.canPatch([
      { op: "replace", path: "/-", value: "invalid" },
      { op: "replace", path: "/stable", value: () => 3 } as never,
    ])).toMatchObject({
      ok: false,
      code: "schema_violation",
      violations: [{ path: "/-", message: expect.any(String) }],
    });
    expect(doc.value).toBe(before);
  });

  test("preserves singleton error indexing for an unsupported root dash key", () => {
    const doc = createJSONDocument(
      z.object({ a: z.number() }).catchall(z.number()),
      { a: 1, extra: 2, "-": 3 },
    );
    const result = doc.patch([
      { op: "replace", path: "/a", value: 0 },
      { op: "replace", path: "/extra", value: undefined } as never,
      { op: "replace", path: "/-", value: 4 },
    ]);

    expect(result).toMatchObject({ ok: false, code: "not_serializable" });
    if (!result.ok) expect(result.reason).toContain("op[0]");
  });

  test("preserves fallback precedence for nested and array dash segments", () => {
    const NestedSchema = z.object({
      value: z.number(),
      nested: z.record(z.string(), z.number()),
      items: z.array(z.number()),
    });

    const nested = createJSONDocument(NestedSchema, {
      value: 1,
      nested: { "-": 2 },
      items: [3],
    });
    expect(nested.canPatch([
      { op: "replace", path: "/value", value: "invalid" },
      { op: "replace", path: "/nested/-", value: () => 2 } as never,
    ])).toMatchObject({
      ok: false,
      code: "schema_violation",
      violations: [{ path: "/value", message: expect.any(String) }],
    });

    const array = createJSONDocument(NestedSchema, {
      value: 1,
      nested: { "-": 2 },
      items: [3],
    });
    expect(array.canPatch([
      { op: "replace", path: "/value", value: "invalid" },
      { op: "replace", path: "/items/-", value: 4 },
    ])).toMatchObject({
      ok: false,
      code: "schema_violation",
      violations: [{ path: "/value", message: expect.any(String) }],
    });
  });

  test("preserves sequential failure precedence when a root replacement cannot be applied", () => {
    const doc = createJSONDocument(z.object({ value: z.number() }), { value: 1 });

    expect(doc.canPatch([
      { op: "replace", path: "/value", value: "invalid" },
      { op: "replace", path: "", value: () => ({ value: 2 }) } as never,
    ])).toMatchObject({
      ok: false,
      code: "schema_violation",
      violations: [{ path: "/value", message: expect.any(String) }],
    });
  });

  test("keeps escaped segments distinct from nested paths in replacement targets", () => {
    const EscapedSchema = z.object({
      records: z.object({
        "a/b": z.object({ value: z.number() }),
        a: z.object({ b: z.object({ value: z.number() }) }),
      }),
    });
    const doc = createJSONDocument(EscapedSchema, {
      records: {
        "a/b": { value: 1 },
        a: { b: { value: 2 } },
      },
    });
    const result = doc.canPatch([
      { op: "replace", path: "/records/a~1b/value", value: "invalid" },
      { op: "replace", path: "/records/a/b/value", value: "invalid" },
    ]);

    expect(result).toMatchObject({ ok: false, code: "schema_violation" });
    if (!result.ok) {
      expect(result.violations?.map((violation) => violation.path)).toEqual([
        "/records/a~1b/value",
        "/records/a/b/value",
      ]);
    }
  });
});
