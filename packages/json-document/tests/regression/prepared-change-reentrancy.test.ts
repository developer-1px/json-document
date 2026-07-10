import { describe, expect, test } from "vitest";
import * as z from "zod";

import { createJSONDocument } from "@interactive-os/json-document";

describe("prepared document changes", () => {
  test("captures the base revision before schema validation can reenter", () => {
    let validationCount = 0;
    let onValidation: ((value: number) => void) | undefined;
    const Schema = z.number().superRefine((value) => {
      validationCount += 1;
      onValidation?.(value);
    });
    const doc = createJSONDocument(Schema, 1);
    let armed = true;
    onValidation = (value) => {
      if (!armed || value !== 2) return;
      armed = false;
      doc.load(doc.value, { preserveHistory: true });
    };
    const before = validationCount;

    expect(doc.replace("", 2)).toMatchObject({ ok: true });

    // outer validation + reentrant load validation + stale retry validation
    expect(validationCount - before).toBe(3);
    expect(doc.value).toBe(2);
  });

  test("bounds a schema that changes the document on every prepare attempt", () => {
    let onValidation: ((value: number) => void) | undefined;
    const Schema = z.number().superRefine((value) => onValidation?.(value));
    const doc = createJSONDocument(Schema, 1);
    onValidation = (value) => {
      if (value === 2) doc.load(1, { preserveHistory: true });
    };

    expect(() => doc.replace("", 2)).toThrow(
      "state changed repeatedly while preparing the patch",
    );
    expect(doc.value).toBe(1);
  });

  test("reapplies previewed insert operations to the latest state", () => {
    let interfere: (() => void) | undefined;
    let armed = false;
    const Schema = z.object({
      items: z.array(z.object({ id: z.string() })),
    }).superRefine(() => {
      if (!armed) return;
      armed = false;
      interfere?.();
    });
    const doc = createJSONDocument(Schema, { items: [{ id: "initial" }] }, { history: 10 });
    interfere = () => {
      doc.load({ items: [{ id: "remote" }] }, { preserveHistory: true });
    };
    armed = true;

    expect(doc.insert("/items/-", { id: "local" })).toMatchObject({ ok: true });

    expect(doc.value.items.map((item) => item.id)).toEqual(["remote", "local"]);
    expect(doc.undo()).toEqual({ ok: true });
    expect(doc.value.items.map((item) => item.id)).toEqual(["remote"]);
  });

  test("replans a failed preview when validation changed the base", () => {
    let interfere: (() => void) | undefined;
    let armed = false;
    const Schema = z.object({
      enabled: z.boolean(),
      value: z.number(),
    }).superRefine((state, context) => {
      if (!state.enabled && state.value > 0) {
        if (armed) {
          armed = false;
          interfere?.();
        }
        context.addIssue({ code: "custom", message: "value requires enabled" });
      }
    });
    const doc = createJSONDocument(Schema, { enabled: false, value: 0 });
    expect(doc.clipboard.write(1)).toEqual({ ok: true });
    interfere = () => {
      doc.load({ enabled: true, value: 0 }, { preserveHistory: true });
    };
    armed = true;

    expect(doc.paste({ replace: "/value" })).toMatchObject({ ok: true });
    expect(doc.value).toEqual({ enabled: true, value: 1 });
  });

  test("replans cut payload and patch together after a stale preview", () => {
    let interfere: (() => void) | undefined;
    let armed = false;
    const Schema = z.object({
      items: z.array(z.object({ id: z.string() })),
    }).superRefine(() => {
      if (!armed) return;
      armed = false;
      interfere?.();
    });
    const doc = createJSONDocument(Schema, { items: [{ id: "initial" }] }, { history: 10 });
    interfere = () => {
      doc.load({ items: [{ id: "remote" }, { id: "remaining" }] }, { preserveHistory: true });
    };
    armed = true;

    expect(doc.cut("/items/0")).toMatchObject({
      ok: true,
      payload: { id: "remote" },
      source: "/items/0",
    });
    expect(doc.value.items.map((item) => item.id)).toEqual(["remaining"]);
    expect(doc.clipboard.read()).toMatchObject({
      ok: true,
      payload: { id: "remote" },
    });
  });

  test("replans duplicate when a custom rekey strategy changes the base", () => {
    const Schema = z.object({
      items: z.array(z.object({ id: z.string(), name: z.string() })),
    });
    const doc = createJSONDocument(Schema, {
      items: [{ id: "initial", name: "Initial" }],
    });
    let armed = true;

    expect(doc.duplicate("/items/0", {
      rekey: {
        fields: ["id"],
        strategy: (value) => {
          if (armed) {
            armed = false;
            doc.load({
              items: [{ id: "remote", name: "Remote" }],
            }, { preserveHistory: true });
          }
          return `${String(value)}-copy`;
        },
      },
    })).toMatchObject({
      ok: true,
      duplicatedTo: "/items/1",
      applied: [{
        op: "add",
        path: "/items/1",
        value: { id: "remote-copy", name: "Remote" },
      }],
    });
    expect(doc.value.items).toEqual([
      { id: "remote", name: "Remote" },
      { id: "remote-copy", name: "Remote" },
    ]);
  });
});
