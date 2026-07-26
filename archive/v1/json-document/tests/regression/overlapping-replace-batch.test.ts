import { describe, expect, test, vi } from "vitest";
import * as z from "zod";

import {
  createJSONDocument,
  type JSONPatchOperation,
} from "@interactive-os/json-document/session";

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
});
