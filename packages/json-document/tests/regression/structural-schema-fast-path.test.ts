import { describe, expect, test, vi } from "vitest";
import * as z from "zod";

import { applyPatch, createJSONDocument } from "@interactive-os/json-document";

describe("structural schema validation isolation", () => {
  test("keeps full validation isolated while preserving committed COW branches", () => {
    let labelValidations = 0;
    const LabelSchema = z.string().trim().min(1).superRefine(() => {
      labelValidations += 1;
    });
    const Schema = createCanvasSchema(LabelSchema);
    const doc = createJSONDocument(Schema, {
      nodes: Array.from({ length: 64 }, (_, index) => ({
        label: `node-${index}`,
        props: { index, nested: { visible: true } },
      })),
    });
    const before = doc.value;
    const safeParse = vi.spyOn(Schema, "safeParse");
    labelValidations = 0;

    expect(doc.patch({
      op: "replace",
      path: "/nodes/63/label",
      value: "updated",
    })).toEqual({ ok: true });

    expect(safeParse).toHaveBeenCalledTimes(1);
    const validationInput = safeParse.mock.calls[0]?.[0] as typeof before;
    expect(validationInput.nodes[0]).not.toBe(before.nodes[0]);
    expect(validationInput.nodes[63]).not.toBe(before.nodes[63]);
    expect(doc.value.nodes[0]).toBe(before.nodes[0]);
    expect(doc.value.nodes[63]?.label).toBe("updated");
    expect(labelValidations).toBe(64);
  });

  test("validates a Canvas built-in scalar replacement without reparsing the root", () => {
    const LabelSchema = z.string().trim().min(1);
    const Schema = createCanvasSchema(LabelSchema);
    const doc = createJSONDocument(Schema, {
      nodes: Array.from({ length: 64 }, (_, index) => ({
        label: `node-${index}`,
        props: { index, nested: { visible: true } },
      })),
    });
    const rootSafeParse = vi.spyOn(Schema, "safeParse");
    const labelSafeParse = vi.spyOn(LabelSchema, "safeParse");

    expect(doc.patch({
      op: "replace",
      path: "/nodes/63/label",
      value: "updated",
    })).toEqual({ ok: true });

    expect(rootSafeParse).not.toHaveBeenCalled();
    expect(labelSafeParse).toHaveBeenCalledTimes(1);
    expect(doc.value.nodes[63]?.label).toBe("updated");
  });

  test("rejects an invalid Canvas scalar replacement atomically at its document path", () => {
    const Schema = createCanvasSchema(z.string().trim().min(1));
    const doc = createJSONDocument(Schema, {
      nodes: [{ label: "node-0", props: {} }],
    });
    const listener = vi.fn();
    doc.subscribe(listener);

    const operation = {
      op: "replace",
      path: "/nodes/0/label",
      value: "   ",
    } as const;
    expect(doc.canPatch(operation)).toMatchObject({
      ok: false,
      code: "schema_violation",
      violations: [{ path: "/nodes/0/label", message: expect.any(String) }],
    });
    expect(doc.patch(operation)).toMatchObject({
      ok: false,
      code: "schema_violation",
    });

    expect(doc.value.nodes[0]?.label).toBe("node-0");
    expect(doc.lastPatch).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
  });

  test("reports every invalid scalar in an independent Canvas replacement batch", () => {
    const Schema = createCanvasSchema(z.string().trim().min(1));
    const doc = createJSONDocument(Schema, {
      nodes: [
        { label: "node-0", props: {} },
        { label: "node-1", props: {} },
      ],
    });

    const result = doc.canPatch([
      { op: "replace", path: "/nodes/0/label", value: " " },
      { op: "replace", path: "/nodes/1/label", value: "\t" },
    ]);

    expect(result).toMatchObject({ ok: false, code: "schema_violation" });
    if (result.ok) throw new Error("invalid Canvas batch was accepted");
    expect(result.violations).toEqual([
      { path: "/nodes/0/label", message: expect.any(String) },
      { path: "/nodes/1/label", message: expect.any(String) },
    ]);
    expect(doc.value.nodes.map((node) => node.label)).toEqual(["node-0", "node-1"]);
  });

  test("keeps custom scalar refinement on full-root validation", () => {
    let acceptsGuardedValue = true;
    let guardedValidations = 0;
    const Schema = z.object({
      guarded: z.string().superRefine((_, context) => {
        guardedValidations += 1;
        if (!acceptsGuardedValue) {
          context.addIssue({ code: "custom", message: "guard is closed" });
        }
      }),
      other: z.string(),
    });
    const doc = createJSONDocument(Schema, { guarded: "stable", other: "before" });
    guardedValidations = 0;
    acceptsGuardedValue = false;

    expect(doc.patch({ op: "replace", path: "/other", value: "after" })).toMatchObject({
      ok: false,
      code: "schema_violation",
    });
    expect(guardedValidations).toBe(1);
    expect(doc.value).toEqual({ guarded: "stable", other: "before" });
  });

  test("isolates refined object validation while preserving committed COW branches", () => {
    let blockValidations = 0;
    const BlockSchema = z.object({
      id: z.string().min(1),
      text: z.string(),
    }).superRefine((block) => {
      blockValidations += 1;
      block.text = block.text.toUpperCase();
    });
    const Schema = z.object({
      blocks: z.array(BlockSchema),
    }).refine((value) => new Set(value.blocks.map((block) => block.id)).size === value.blocks.length);
    const doc = createJSONDocument(Schema, {
      blocks: [
        { id: "a", text: "first" },
        { id: "b", text: "second" },
      ],
    });
    const before = doc.value;
    const safeParse = vi.spyOn(Schema, "safeParse");
    blockValidations = 0;

    expect(doc.patch({
      op: "replace",
      path: "/blocks/1/text",
      value: "after",
    })).toEqual({ ok: true });

    const validationInput = safeParse.mock.calls[0]?.[0] as typeof before;
    expect(validationInput.blocks[0]).not.toBe(before.blocks[0]);
    expect(validationInput.blocks[1]).not.toBe(before.blocks[1]);
    expect(doc.value.blocks[0]).toBe(before.blocks[0]);
    expect(blockValidations).toBe(2);
    expect(doc.value.blocks[1]?.text).toBe("after");
  });

  test("isolates container checks that run against a failed partial parse", () => {
    const Schema = z.object({
      source: z.object({ value: z.number() }),
      target: z.string(),
    }).refine((value) => {
      if (typeof value.target === "object" && value.target !== null) {
        (value.target as { value: number }).value = 999;
      }
      return true;
    }, { when: () => true });
    const initial = { source: { value: 1 }, target: "valid" };

    const result = applyPatch(Schema, initial, [
      { op: "move", from: "/source", path: "/target" },
    ]);

    expect(result.result).toMatchObject({ ok: false, code: "schema_violation" });
    expect(result.state).toBe(initial);
    expect(initial).toEqual({ source: { value: 1 }, target: "valid" });

    for (const materialize of [false, true]) {
      const doc = createJSONDocument(Schema, {
        source: { value: 1 },
        target: "valid",
      });
      if (materialize) void doc.value;

      expect(doc.patch({
        op: "move",
        from: "/source",
        path: "/target",
      })).toMatchObject({ ok: false, code: "schema_violation" });
      expect(doc.value).toEqual({ source: { value: 1 }, target: "valid" });
      expect(doc.lastPatch).toEqual([]);
    }
  });

  test("validates the final state of repeated checked root-field replacements", () => {
    const doc = createJSONDocument(
      z.object({ label: z.string().min(1) }),
      { label: "before" },
    );

    expect(doc.patch([
      { op: "replace", path: "/label", value: "" },
      { op: "replace", path: "/label", value: "after" },
    ])).toEqual({ ok: true });
    expect(doc.value).toEqual({ label: "after" });
  });

  test("validates the final state of repeated checked array-field replacements", () => {
    const doc = createJSONDocument(
      z.object({ items: z.array(z.object({ label: z.string().min(1) })) }),
      { items: [{ label: "before" }] },
    );

    expect(doc.patch([
      { op: "replace", path: "/items/0/label", value: "" },
      { op: "replace", path: "/items/0/label", value: "after" },
    ])).toEqual({ ok: true });
    expect(doc.value).toEqual({ items: [{ label: "after" }] });
  });

  test("keeps standalone custom string formats on full-root validation", () => {
    let acceptsGuard = true;
    const GuardSchema = z.stringFormat("dynamic-guard", () => acceptsGuard);
    const Schema = z.object({
      guard: GuardSchema,
      other: z.string(),
    });
    const doc = createJSONDocument(Schema, {
      guard: "stable",
      other: "before",
    });
    acceptsGuard = false;

    expect(doc.patch({
      op: "replace",
      path: "/other",
      value: "after",
    })).toMatchObject({ ok: false, code: "schema_violation" });
    expect(doc.value).toEqual({ guard: "stable", other: "before" });
  });

  test("isolates local validation error callbacks from replacement payloads", () => {
    const MutatingStringSchema = z.string({
      error: (issue) => {
        if (issue.input !== null && typeof issue.input === "object") {
          (issue.input as { value?: number }).value = 999;
        }
        return "must be a string";
      },
    });
    const doc = createJSONDocument(
      z.object({ label: MutatingStringSchema }),
      { label: "before" },
    );
    const payload = { value: 1 };

    expect(doc.patch({
      op: "replace",
      path: "/label",
      value: payload,
    } as never)).toMatchObject({ ok: false, code: "schema_violation" });
    expect(payload).toEqual({ value: 1 });
    expect(doc.value).toEqual({ label: "before" });
  });

  test("isolates global error callbacks during local value validation", () => {
    const globalConfig = z.config();
    const previousCustomError = globalConfig.customError;
    z.config({
      customError: (issue) => {
        if (issue.input !== null && typeof issue.input === "object") {
          (issue.input as { value?: number }).value = 999;
        }
        return "global validation failure";
      },
    });
    try {
      const doc = createJSONDocument(
        z.object({ label: z.string() }),
        { label: "before" },
      );
      const payload = { value: 1 };

      expect(doc.patch({
        op: "replace",
        path: "/label",
        value: payload,
      } as never)).toMatchObject({ ok: false, code: "schema_violation" });
      expect(payload).toEqual({ value: 1 });
      expect(doc.value).toEqual({ label: "before" });
    } finally {
      if (previousCustomError === undefined) {
        delete globalConfig.customError;
      } else {
        z.config({ customError: previousCustomError });
      }
    }
  });

  test("isolates global error callbacks from sequential copy and move sources", () => {
    const globalConfig = z.config();
    const previousCustomError = globalConfig.customError;
    z.config({
      customError: (issue) => {
        if (issue.input !== null && typeof issue.input === "object") {
          (issue.input as { value?: number }).value = 555;
        }
        return "global validation failure";
      },
    });
    try {
      const Schema = z.object({
        sources: z.array(z.object({ value: z.number() })),
        targets: z.array(z.string()),
      });
      for (const operation of ["copy", "move"] as const) {
        for (const materialize of [false, true]) {
          const doc = createJSONDocument(Schema, {
            sources: [{ value: 1 }],
            targets: ["valid"],
          });
          if (materialize) void doc.value;

          expect(doc.patch({
            op: operation,
            from: "/sources/0",
            path: "/targets/0",
          })).toMatchObject({ ok: false, code: "schema_violation" });
          expect(doc.value).toEqual({
            sources: [{ value: 1 }],
            targets: ["valid"],
          });
          expect(doc.lastPatch).toEqual([]);
        }
      }
    } finally {
      if (previousCustomError === undefined) {
        delete globalConfig.customError;
      } else {
        z.config({ customError: previousCustomError });
      }
    }
  });

  test("isolates a nested mutating custom check from the candidate graph", () => {
    const Schema = z.object({
      nested: z.any().superRefine((value) => {
        if (value?.trigger === true) value.poison = () => "not JSON";
      }),
    });
    const doc = createJSONDocument(Schema, { nested: { trigger: false } });

    expect(doc.patch({
      op: "replace",
      path: "/nested/trigger",
      value: true,
    })).toEqual({ ok: true });
    expect(doc.value).toEqual({ nested: { trigger: true } });
    expect("poison" in doc.value.nested).toBe(false);
  });

  test("does not cache a recursive back-edge as independently structural", () => {
    const GuardedSchema = z.object({
      enabled: z.boolean(),
      value: z.number(),
    }).superRefine((value, context) => {
      if (!value.enabled && value.value > 0) {
        context.addIssue({ code: "custom", path: ["value"], message: "disabled" });
      }
    });
    let RecursiveSchema: z.ZodTypeAny;
    const Backedge: z.ZodTypeAny = z.lazy(() => RecursiveSchema);
    RecursiveSchema = z.object({
      child: Backedge.optional(),
      guarded: GuardedSchema,
    });
    const first = createJSONDocument(RecursiveSchema, {
      guarded: { enabled: false, value: 0 },
    });
    expect(first.patch({ op: "replace", path: "/guarded/value", value: -1 })).toEqual({ ok: true });

    const WrappedSchema = z.object({ node: Backedge });
    const wrapped = createJSONDocument(WrappedSchema, {
      node: { guarded: { enabled: false, value: 0 } },
    });
    expect(wrapped.patch({
      op: "replace",
      path: "/node/guarded/value",
      value: 1,
    })).toMatchObject({ ok: false, code: "schema_violation" });
    expect(wrapped.value).toEqual({
      node: { guarded: { enabled: false, value: 0 } },
    });
  });

  test("keeps checked record keys and container invariants on full validation", () => {
    const record = createJSONDocument(
      z.record(z.string().min(2), z.number()),
      { ok: 1 },
    );
    expect(record.patch({ op: "add", path: "/x", value: 2 })).toMatchObject({
      ok: false,
      code: "schema_violation",
    });
    expect(record.value).toEqual({ ok: 1 });

    const formattedRecord = createJSONDocument(
      z.record(z.stringFormat("x-key", (key) => key.startsWith("x")), z.number()),
      { xgood: 1 },
    );
    expect(formattedRecord.patch({ op: "add", path: "/bad", value: 2 })).toMatchObject({
      ok: false,
      code: "schema_violation",
    });
    expect(formattedRecord.value).toEqual({ xgood: 1 });

    const array = createJSONDocument(
      z.object({ items: z.array(z.string()).min(1) }),
      { items: ["kept"] },
    );
    expect(array.patch({ op: "remove", path: "/items/0" })).toMatchObject({
      ok: false,
      code: "schema_violation",
    });
    expect(array.value).toEqual({ items: ["kept"] });
  });
});

function createCanvasSchema(LabelSchema: z.ZodType<string>) {
  const JSONValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.null(),
    z.array(JSONValueSchema),
    z.record(z.string(), JSONValueSchema),
  ]));
  return z.object({
    nodes: z.array(z.object({
      label: LabelSchema,
      props: z.record(z.string(), JSONValueSchema),
    }).strict()),
  }).strict();
}
