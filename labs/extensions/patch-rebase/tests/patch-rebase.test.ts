import { describe, expect, expectTypeOf, test, vi } from "vitest";
import * as z from "zod";

import {
  createJSONDocument,
  type JSONPatchOperation,
  type Pointer,
  type SelectionPointObject,
} from "@interactive-os/json-document";
import {
  rebaseChange,
  type RebaseChangeInput,
  type RebaseChangeResult,
} from "../src/index.js";

const Schema = z.object({
  title: z.string(),
  status: z.enum(["draft", "review"]),
});

const CollectionSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
  })),
});

const OptionalPanelSchema = z.object({
  title: z.string(),
  panel: z.object({ focus: z.string() }).optional(),
});

const NumericKeySchema = z.object({
  records: z.record(z.string(), z.object({ title: z.string() })),
});

const ExclusiveFlagsSchema = z.object({
  local: z.boolean(),
  remote: z.boolean(),
}).refine((value) => !(value.local && value.remote));

const SlotSchema = z.object({ title: z.string() });
const MixedGroupsSchema = z.object({
  groups: z.array(z.object({
    slots: z.union([
      z.array(SlotSchema),
      z.record(z.string(), SlotSchema),
    ]),
  })),
});

const ReplaceAncestorSchema = z.object({
  a: z.object({ x: z.number() }).or(z.object({ y: z.number() })),
  b: z.number(),
});

const NullableAncestorSchema = z.object({
  a: z.object({ x: z.number() }).nullable(),
  b: z.number(),
});

describe("@interactive-os/json-document-patch-rebase", () => {
  test("preserves pointer-only result types while adding point overloads", () => {
    expectTypeOf<Parameters<typeof rebaseChange>[1]>()
      .toEqualTypeOf<RebaseChangeInput<unknown>>();
    expectTypeOf<ReturnType<typeof rebaseChange>>()
      .toEqualTypeOf<RebaseChangeResult>();
    const pointerPlan = rebaseChange(Schema, {
      base: { title: "Draft", status: "draft" },
      concurrentBatches: [],
      operations: [],
      selectionAfter: "/title",
    });
    const pointPlan = rebaseChange(Schema, {
      base: { title: "Draft", status: "draft" },
      concurrentBatches: [],
      operations: [],
      selectionAfter: { path: "/title", offset: 1 },
    });
    if (pointerPlan.ok) {
      expectTypeOf(pointerPlan.selectionAfter)
        .toEqualTypeOf<Pointer | undefined>();
    }
    if (pointPlan.ok) {
      expectTypeOf(pointPlan.selectionAfter)
        .toEqualTypeOf<SelectionPointObject | undefined>();
    }
  });

  test("preserves disjoint concurrent and local changes", () => {
    const base = {
      title: "Draft",
      status: "draft" as const,
    };
    const concurrent: JSONPatchOperation[] = [
      { op: "replace", path: "/status", value: "review" },
    ];
    const local: JSONPatchOperation[] = [
      { op: "replace", path: "/title", value: "Reviewed" },
    ];

    const planned = rebaseChange(Schema, {
      base,
      concurrentBatches: [concurrent],
      operations: local,
    });

    expect(planned).toEqual({
      ok: true,
      operations: [
        { op: "test", path: "/title", value: "Draft" },
        { op: "replace", path: "/title", value: "Reviewed" },
      ],
      diagnostics: [],
    });

    if (!planned.ok) throw new Error(planned.reason);
    const doc = createJSONDocument(Schema, base, { history: 10 });
    expect(doc.patch(concurrent)).toEqual({ ok: true });
    expect(doc.commit(planned.operations)).toEqual({ ok: true });
    expect(doc.value).toEqual({
      title: "Reviewed",
      status: "review",
    });
  });

  test("shifts a local target and selection after a concurrent array insertion", () => {
    const base = {
      items: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
    };
    const concurrent: JSONPatchOperation[] = [{
      op: "add",
      path: "/items/0",
      value: { id: "x", title: "X" },
    }];

    const planned = rebaseChange(CollectionSchema, {
      base,
      concurrentBatches: [concurrent],
      operations: [{ op: "replace", path: "/items/1/title", value: "B2" }],
      selectionAfter: "/items/1/title",
    });

    expect(planned).toEqual({
      ok: true,
      operations: [
        { op: "test", path: "/items/2/title", value: "B" },
        { op: "replace", path: "/items/2/title", value: "B2" },
      ],
      selectionAfter: "/items/2/title",
      diagnostics: [{
        code: "pointer_shifted",
        reason: "local pointer shifted by concurrent array edits",
        pointer: "/items/1/title",
        rebasedPointer: "/items/2/title",
        operationIndex: 0,
      }],
    });

    if (!planned.ok || planned.selectionAfter === undefined) {
      throw new Error("expected a rebased selection");
    }
    const doc = createJSONDocument(CollectionSchema, base, {
      history: 10,
      selection: { mode: "single", initial: ["/items/1/title"] },
    });
    expect(doc.patch(concurrent)).toEqual({ ok: true });
    expect(doc.commit(planned.operations, {
      selectionAfter: planned.selectionAfter,
    })).toEqual({ ok: true });
    expect(doc.value.items).toEqual([
      { id: "x", title: "X" },
      { id: "a", title: "A" },
      { id: "b", title: "B2" },
    ]);
    expect(doc.selection?.primaryPointer).toBe("/items/2/title");
  });

  test("shifts a selection point path without losing caret metadata", () => {
    const base = {
      items: [
        { id: "a", title: "A" },
        { id: "b", title: "Before" },
      ],
    };

    expect(rebaseChange(CollectionSchema, {
      base,
      concurrentBatches: [[{
        op: "add",
        path: "/items/0",
        value: { id: "x", title: "X" },
      }]],
      operations: [{
        op: "replace",
        path: "/items/1/title",
        value: "Reviewed",
      }],
      selectionAfter: {
        path: "/items/1/title",
        offset: 4,
        affinity: "forward",
      },
    })).toEqual({
      ok: true,
      operations: [
        { op: "test", path: "/items/2/title", value: "Before" },
        { op: "replace", path: "/items/2/title", value: "Reviewed" },
      ],
      selectionAfter: {
        path: "/items/2/title",
        offset: 4,
        affinity: "forward",
      },
      diagnostics: [{
        code: "pointer_shifted",
        reason: "local pointer shifted by concurrent array edits",
        pointer: "/items/1/title",
        rebasedPointer: "/items/2/title",
        operationIndex: 0,
      }],
    });
  });

  test("shifts a local target and selection after an earlier array removal", () => {
    const base = {
      items: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
        { id: "c", title: "C" },
      ],
    };

    expect(rebaseChange(CollectionSchema, {
      base,
      concurrentBatches: [[
        { op: "remove", path: "/items/0" },
      ]],
      operations: [
        { op: "replace", path: "/items/2/title", value: "C2" },
      ],
      selectionAfter: "/items/2/title",
    })).toEqual({
      ok: true,
      operations: [
        { op: "test", path: "/items/1/title", value: "C" },
        { op: "replace", path: "/items/1/title", value: "C2" },
      ],
      selectionAfter: "/items/1/title",
      diagnostics: [{
        code: "pointer_shifted",
        reason: "local pointer shifted by concurrent array edits",
        pointer: "/items/2/title",
        rebasedPointer: "/items/1/title",
        operationIndex: 0,
      }],
    });
  });

  test("normalizes encoded URI-fragment pointers before array insertion transforms", () => {
    const planned = rebaseChange(CollectionSchema, {
      base: {
        items: [
          { id: "a", title: "A" },
          { id: "b", title: "B" },
        ],
      },
      concurrentBatches: [[{
        op: "add",
        path: "#/items%2F0",
        value: { id: "x", title: "X" },
      }]],
      operations: [{
        op: "replace",
        path: "#/items%2F1%2Ftitle",
        value: "B2",
      }],
      selectionAfter: "#/items%2F1%2Ftitle",
    });

    expect(planned).toMatchObject({
      ok: true,
      operations: [
        { op: "test", path: "/items/2/title", value: "B" },
        { op: "replace", path: "/items/2/title", value: "B2" },
      ],
      selectionAfter: "/items/2/title",
    });
  });

  test("normalizes encoded URI-fragment pointers before array removal transforms", () => {
    const planned = rebaseChange(CollectionSchema, {
      base: {
        items: [
          { id: "a", title: "A" },
          { id: "b", title: "B" },
          { id: "c", title: "C" },
        ],
      },
      concurrentBatches: [[{
        op: "remove",
        path: "#/items%2F0",
      }]],
      operations: [{
        op: "replace",
        path: "#/items%2F2%2Ftitle",
        value: "C2",
      }],
      selectionAfter: "#/items%2F2%2Ftitle",
    });

    expect(planned).toMatchObject({
      ok: true,
      operations: [
        { op: "test", path: "/items/1/title", value: "C" },
        { op: "replace", path: "/items/1/title", value: "C2" },
      ],
      selectionAfter: "/items/1/title",
    });
  });

  test("reports a conflict instead of overwriting a concurrent target change", () => {
    const base = {
      title: "Draft",
      status: "draft" as const,
    };

    expect(rebaseChange(Schema, {
      base,
      concurrentBatches: [[
        { op: "replace", path: "/title", value: "Remote" },
      ]],
      operations: [
        { op: "replace", path: "/title", value: "Local" },
      ],
    })).toEqual({
      ok: false,
      code: "conflict",
      reason: "local target overlaps a concurrent change: /title",
      conflicts: [{
        code: "target_changed",
        reason: "local target overlaps a concurrent change: /title",
        pointer: "/title",
        operationIndex: 0,
        concurrentBatchIndex: 0,
        concurrentOperationIndex: 0,
      }],
    });
  });

  test("guards the gap between planning and commit without moving selection", () => {
    const base = {
      title: "Draft",
      status: "draft" as const,
    };
    const planned = rebaseChange(Schema, {
      base,
      concurrentBatches: [],
      operations: [
        { op: "replace", path: "/title", value: "Local" },
      ],
      selectionAfter: "/title",
    });
    if (!planned.ok || planned.selectionAfter === undefined) {
      throw new Error("expected a guarded rebase plan");
    }
    const doc = createJSONDocument(Schema, base, {
      history: 10,
      selection: { mode: "single", initial: ["/status"] },
    });
    expect(doc.replace("/title", "Remote")).toMatchObject({ ok: true });
    const listener = vi.fn();
    doc.subscribe(listener);

    expect(doc.commit(planned.operations, {
      selectionAfter: planned.selectionAfter,
    })).toMatchObject({
      ok: false,
      code: "test_failed",
      pointer: "/title",
    });
    expect(doc.value.title).toBe("Remote");
    expect(doc.selection?.primaryPointer).toBe("/status");
    expect(doc.history.undoDepth).toBe(1);
    expect(listener).not.toHaveBeenCalled();
  });

  test("drops a selection target removed by a disjoint concurrent change", () => {
    const planned = rebaseChange(OptionalPanelSchema, {
      base: {
        title: "Draft",
        panel: { focus: "details" },
      },
      concurrentBatches: [[
        { op: "remove", path: "/panel" },
      ]],
      operations: [
        { op: "replace", path: "/title", value: "Local" },
      ],
      selectionAfter: "/panel/focus",
    });

    expect(planned).toEqual({
      ok: true,
      operations: [
        { op: "test", path: "/title", value: "Draft" },
        { op: "replace", path: "/title", value: "Local" },
      ],
      diagnostics: [{
        code: "selection_dropped",
        reason: "selection target was removed by concurrent edits",
        pointer: "/panel/focus",
      }],
    });
  });

  test("does not shift numeric object keys as if they were array indexes", () => {
    expect(rebaseChange(NumericKeySchema, {
      base: {
        records: {
          "0": { title: "A" },
          "1": { title: "B" },
        },
      },
      concurrentBatches: [[{
        op: "add",
        path: "/records/0",
        value: { title: "Remote" },
      }]],
      operations: [{
        op: "replace",
        path: "/records/1/title",
        value: "Local",
      }],
    })).toEqual({
      ok: true,
      operations: [
        { op: "test", path: "/records/1/title", value: "B" },
        { op: "replace", path: "/records/1/title", value: "Local" },
      ],
      diagnostics: [],
    });
  });

  test("guards an independent selection target during the planning gap", () => {
    const base = {
      title: "Draft",
      panel: { focus: "details" },
    };
    const planned = rebaseChange(OptionalPanelSchema, {
      base,
      concurrentBatches: [],
      operations: [
        { op: "replace", path: "/title", value: "Local" },
      ],
      selectionAfter: "/panel/focus",
    });

    expect(planned).toEqual({
      ok: true,
      operations: [
        { op: "test", path: "/title", value: "Draft" },
        { op: "test", path: "/panel/focus", value: "details" },
        { op: "replace", path: "/title", value: "Local" },
      ],
      selectionAfter: "/panel/focus",
      diagnostics: [],
    });

    if (!planned.ok || planned.selectionAfter === undefined) {
      throw new Error("expected a guarded selection");
    }
    const doc = createJSONDocument(OptionalPanelSchema, base, {
      history: 10,
      selection: { mode: "single", initial: ["/title"] },
    });
    expect(doc.delete("/panel")).toMatchObject({ ok: true });

    expect(doc.commit(planned.operations, {
      selectionAfter: planned.selectionAfter,
    })).toMatchObject({
      ok: false,
      code: "path_not_found",
      pointer: "/panel/focus",
    });
    expect(doc.value.title).toBe("Draft");
    expect(doc.selection?.primaryPointer).toBe("/title");
    expect(doc.history.undoDepth).toBe(1);
  });

  test("reports a schema conflict created by otherwise disjoint changes", () => {
    expect(rebaseChange(ExclusiveFlagsSchema, {
      base: { local: false, remote: false },
      concurrentBatches: [[
        { op: "replace", path: "/remote", value: true },
      ]],
      operations: [
        { op: "replace", path: "/local", value: true },
      ],
    })).toMatchObject({
      ok: false,
      code: "conflict",
      conflicts: [{ code: "schema_conflict" }],
    });
  });

  test("uses each concurrent operation's actual container kind", () => {
    const base = {
      groups: [{
        slots: [
          { title: "A0" },
          { title: "A1" },
        ],
      }, {
        slots: {
          "0": { title: "B0" },
          "1": { title: "B1" },
          "2": { title: "B2" },
        },
      }],
    };
    const concurrent: JSONPatchOperation[] = [
      { op: "remove", path: "/groups/0" },
      {
        op: "add",
        path: "/groups/0/slots/0",
        value: { title: "Remote" },
      },
    ];
    const planned = rebaseChange(MixedGroupsSchema, {
      base,
      concurrentBatches: [concurrent],
      operations: [{
        op: "replace",
        path: "/groups/1/slots/1/title",
        value: "Local",
      }],
    });

    expect(planned).toEqual({
      ok: true,
      operations: [
        { op: "test", path: "/groups/0/slots/1/title", value: "B1" },
        { op: "replace", path: "/groups/0/slots/1/title", value: "Local" },
      ],
      diagnostics: [{
        code: "pointer_shifted",
        reason: "local pointer shifted by concurrent array edits",
        pointer: "/groups/1/slots/1/title",
        rebasedPointer: "/groups/0/slots/1/title",
        operationIndex: 0,
      }],
    });

    if (!planned.ok) throw new Error(planned.reason);
    const doc = createJSONDocument(MixedGroupsSchema, base);
    expect(doc.patch(concurrent)).toEqual({ ok: true });
    expect(doc.commit(planned.operations)).toEqual({ ok: true });
    expect(doc.value.groups[0]?.slots).toEqual({
      "0": { title: "Remote" },
      "1": { title: "Local" },
      "2": { title: "B2" },
    });
  });

  test("rejects unsupported concurrent operations for selection-only plans", () => {
    expect(rebaseChange(NumericKeySchema, {
      base: {
        records: {
          "0": { title: "A" },
          "1": { title: "B" },
          "2": { title: "C" },
        },
      },
      concurrentBatches: [[{
        op: "copy",
        from: "/records/0",
        path: "/records/0",
      }]],
      operations: [],
      selectionAfter: "/records/1/title",
    })).toEqual({
      ok: false,
      code: "conflict",
      reason: "cannot conservatively rebase across concurrent copy operation",
      conflicts: [{
        code: "unsupported_operation",
        reason: "cannot conservatively rebase across concurrent copy operation",
        pointer: "/records/0",
        concurrentBatchIndex: 0,
        concurrentOperationIndex: 0,
      }],
    });
  });

  test("treats the URI-fragment root as an unsupported root mutation", () => {
    const base = {
      title: "Draft",
      status: "draft" as const,
    };

    expect(rebaseChange(Schema, {
      base,
      concurrentBatches: [[
        { op: "replace", path: "/status", value: "review" },
      ]],
      operations: [{
        op: "replace",
        path: "#",
        value: { title: "Local", status: "draft" },
      }],
    })).toMatchObject({
      ok: false,
      code: "conflict",
      conflicts: [{
        code: "unsupported_operation",
        pointer: "",
        operationIndex: 0,
      }],
    });

    expect(rebaseChange(Schema, {
      base,
      concurrentBatches: [[{
        op: "replace",
        path: "#",
        value: { title: "Remote", status: "draft" },
      }]],
      operations: [],
      selectionAfter: "#/title",
    })).toMatchObject({
      ok: false,
      code: "conflict",
      conflicts: [{
        code: "unsupported_operation",
        pointer: "",
        concurrentBatchIndex: 0,
        concurrentOperationIndex: 0,
      }],
    });
  });

  test("drops a selection removed by the rebased local change", () => {
    expect(rebaseChange(ReplaceAncestorSchema, {
      base: { a: { x: 1 }, b: 0 },
      concurrentBatches: [],
      operations: [
        { op: "replace", path: "/a", value: { y: 2 } },
      ],
      selectionAfter: "/a/x",
    })).toEqual({
      ok: true,
      operations: [
        { op: "test", path: "/a", value: { x: 1 } },
        { op: "replace", path: "/a", value: { y: 2 } },
      ],
      diagnostics: [{
        code: "selection_dropped",
        reason: "selection target does not exist after the rebased change",
        pointer: "/a/x",
      }],
    });
  });

  test("returns a structured conflict for an invalid selection pointer", () => {
    expect(rebaseChange(Schema, {
      base: { title: "Draft", status: "draft" },
      concurrentBatches: [],
      operations: [
        { op: "replace", path: "/title", value: "Local" },
      ],
      selectionAfter: "title",
    })).toEqual({
      ok: false,
      code: "conflict",
      reason: "invalid selection pointer: title",
      conflicts: [{
        code: "invalid_selection",
        reason: "invalid selection pointer: title",
        pointer: "title",
      }],
    });
  });

  test("returns a structured conflict for invalid selection point metadata", () => {
    expect(rebaseChange(Schema, {
      base: { title: "Draft", status: "draft" },
      concurrentBatches: [],
      operations: [
        { op: "replace", path: "/title", value: "Local" },
      ],
      selectionAfter: { path: "/title", offset: -1 },
    })).toEqual({
      ok: false,
      code: "conflict",
      reason: "invalid selection point",
      conflicts: [{
        code: "invalid_selection",
        reason: "invalid selection point",
        pointer: "/title",
      }],
    });
  });

  test("uses an ancestor guard for a sequentially created local target", () => {
    expect(rebaseChange(NullableAncestorSchema, {
      base: { a: null, b: 0 },
      concurrentBatches: [[
        { op: "replace", path: "/b", value: 1 },
      ]],
      operations: [
        { op: "replace", path: "/a", value: { x: 1 } },
        { op: "replace", path: "/a/x", value: 2 },
      ],
    })).toEqual({
      ok: true,
      operations: [
        { op: "test", path: "/a", value: null },
        { op: "replace", path: "/a", value: { x: 1 } },
        { op: "replace", path: "/a/x", value: 2 },
      ],
      diagnostics: [],
    });
  });

  test("reports an invalid local change before replaying concurrent batches", () => {
    expect(rebaseChange(Schema, {
      base: { title: "Draft", status: "draft" },
      concurrentBatches: [[
        { op: "replace", path: "/status", value: "invalid" },
      ]],
      operations: [
        { op: "replace", path: "/title", value: 42 },
      ],
    })).toMatchObject({
      ok: false,
      code: "change_patch_failed",
      result: { code: "schema_violation" },
    });
  });
});
