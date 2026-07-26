import { describe, expect, test, vi } from "vitest";
import * as z from "zod";

import {
  applyPatch,
  createJSONDocument,
  type JSONPatchOperation,
} from "@interactive-os/json-document/session";

describe("JSON document state invariants", () => {
  test("rejects a non-JSON schema output before creating a document", () => {
    const Schema = z.object({ createdAt: z.date() });

    expect(() => createJSONDocument(Schema, {
      createdAt: new Date("2026-07-14T00:00:00.000Z"),
    })).toThrow("Initial document value is not JSON-serializable: /createdAt: non-plain object (Date)");
  });

  test("trustedInitial skips schema parsing but not the JSON state boundary", () => {
    expect(() => createJSONDocument(
      z.date(),
      new Date("2026-07-14T00:00:00.000Z"),
      { trustedInitial: true },
    )).toThrow("Initial document value is not JSON-serializable: : non-plain object (Date)");
  });

  test("checks a mutable trustedInitial against the JSON boundary for known output schemas", () => {
    expect(() => createJSONDocument(
      z.object({ value: z.string() }),
      { value: () => "not JSON" } as never,
      { trustedInitial: true },
    )).toThrow("Initial document value is not JSON-serializable: /value: function is not JSON");
  });

  test("rejects non-JSON output produced by a schema overwrite", () => {
    const Schema = z.number().overwrite(() => Number.NaN);

    expect(() => createJSONDocument(Schema, 1)).toThrow(
      "Initial document value is not JSON-serializable",
    );
  });

  test("rejects non-JSON output produced by a mutating custom check", () => {
    const Schema = z.object({ value: z.unknown() }).superRefine((value) => {
      value.value = () => "not JSON";
    });

    expect(() => createJSONDocument(Schema, { value: "initial" })).toThrow(
      "Initial document value is not JSON-serializable",
    );
  });

  test("isolates mutating custom schema checks from patch candidates", () => {
    const Schema = z.any().superRefine((value) => {
      if (value?.trigger === true) value.poison = () => "not JSON";
    });
    const doc = createJSONDocument(Schema, {
      trigger: false,
      nested: { value: 1 },
    });
    void doc.value;

    expect(doc.patch({ op: "replace", path: "/trigger", value: true })).toEqual({ ok: true });
    expect(doc.value).toEqual({ trigger: true, nested: { value: 1 } });
    expect("poison" in doc.value).toBe(false);

    const rootResult = doc.patch({
      op: "replace",
      path: "",
      value: { trigger: true, nested: { value: 2 } },
    });
    expect(rootResult).toEqual({ ok: true });
    expect(doc.value).toEqual({ trigger: true, nested: { value: 2 } });
  });

  test("keeps failed custom validation atomic before and after snapshot materialization", () => {
    const Schema = z.any().superRefine((value, context) => {
      if (value?.trigger !== true) return;
      value.nested.value = 99;
      context.addIssue({ code: "custom", message: "reject" });
    });

    for (const materialize of [false, true]) {
      const doc = createJSONDocument(Schema, {
        trigger: false,
        nested: { value: 1 },
      });
      if (materialize) void doc.value;

      expect(doc.patch({ op: "replace", path: "/trigger", value: true })).toMatchObject({
        ok: false,
        code: "schema_violation",
      });
      expect(doc.value).toEqual({ trigger: false, nested: { value: 1 } });
      expect(doc.lastPatch).toEqual([]);
    }
  });

  test("keeps capability probes pure when custom schema checks mutate their input", () => {
    const Schema = z.custom<Record<string, unknown>>((value) => {
      if (value !== null && typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (record.trigger === true) {
          (record.nested as Record<string, unknown>).poison = () => "not JSON";
        }
      }
      return true;
    });
    const initial = { trigger: false, nested: { value: 1 } };
    const doc = createJSONDocument(Schema, initial);

    expect(doc.canPatch({ op: "replace", path: "/trigger", value: true })).toEqual({ ok: true });
    expect(doc.value).toEqual(initial);
    expect(doc.lastPatch).toEqual([]);
  });

  test("isolates custom schema checks in the public pure patch helper", () => {
    const Schema = z.any().superRefine((value) => {
      if (value?.trigger === true) value.nested.poison = () => "not JSON";
    });
    const initial = { trigger: false, nested: { value: 1 } };

    const result = applyPatch(Schema, initial, [
      { op: "replace", path: "/trigger", value: true },
    ]);

    expect(result.result).toEqual({ ok: true });
    expect(result.state).toEqual({ trigger: true, nested: { value: 1 } });
    expect(initial).toEqual({ trigger: false, nested: { value: 1 } });
  });

  test("rejects a non-JSON load atomically", () => {
    const doc = createJSONDocument(z.object({ value: z.unknown() }), { value: "initial" });
    const listener = vi.fn();
    doc.subscribe(listener);

    expect(doc.load({ value: new Date("2026-07-14T00:00:00.000Z") })).toEqual({
      ok: false,
      code: "not_serializable",
      reason: "/value: non-plain object (Date)",
    });
    expect(doc.value).toEqual({ value: "initial" });
    expect(listener).not.toHaveBeenCalled();
  });

  test("reset treats null as an explicit JSON root value", () => {
    const doc = createJSONDocument(z.union([z.string(), z.null()]), "initial");
    expect(doc.load("changed")).toEqual({ ok: true });

    expect(doc.reset(null)).toEqual({ ok: true });
    expect(doc.value).toBeNull();
  });

  test("exposes the document value as an immutable snapshot", () => {
    const doc = createJSONDocument(
      z.object({ items: z.array(z.object({ id: z.string() })) }),
      { items: [{ id: "a" }] },
    );

    expect(Object.isFrozen(doc.value)).toBe(true);
    expect(Object.isFrozen(doc.value.items)).toBe(true);
    expect(Object.isFrozen(doc.value.items[0])).toBe(true);
    expect(() => {
      doc.value.items[0]!.id = "corrupt";
    }).toThrow(TypeError);
    expect(doc.value).toEqual({ items: [{ id: "a" }] });
  });

  test("deep-freezes children below a schema-produced shallow readonly node", () => {
    const doc = createJSONDocument(
      z.object({
        item: z.object({
          nested: z.object({ value: z.number() }),
        }).readonly(),
      }),
      { item: { nested: { value: 1 } } },
    );

    const snapshot = doc.value;
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.item)).toBe(true);
    expect(Object.isFrozen(snapshot.item.nested)).toBe(true);
    expect(() => {
      snapshot.item.nested.value = 99;
    }).toThrow(TypeError);
    expect(doc.value.item.nested.value).toBe(1);
  });

  test("owns patch payloads without freezing the caller's object", () => {
    const doc = createJSONDocument(
      z.object({ items: z.array(z.object({ id: z.string() })) }),
      { items: [] },
    );
    const payload = { id: "a" };

    expect(doc.patch({ op: "add", path: "/items/-", value: payload })).toEqual({ ok: true });
    expect(Object.isFrozen(payload)).toBe(false);
    expect(doc.value.items[0]).not.toBe(payload);

    payload.id = "external mutation";
    expect(doc.value).toEqual({ items: [{ id: "a" }] });
    expect(Object.isFrozen(doc.value.items[0])).toBe(true);
  });

  test("owns operation records used by lastPatch and history", () => {
    const doc = createJSONDocument(
      z.object({ a: z.object({ value: z.number() }), b: z.object({ value: z.number() }) }),
      { a: { value: 1 }, b: { value: 10 } },
      { history: 10 },
    );
    const operation: JSONPatchOperation = { op: "replace", path: "/a/value", value: 2 };

    expect(doc.patch(operation)).toEqual({ ok: true });
    operation.path = "/b/value";
    operation.value = 99;

    expect(doc.lastPatch).toEqual([{ op: "replace", path: "/a/value", value: 2 }]);
    expect(Object.isFrozen(doc.lastPatch[0])).toBe(true);
    expect(doc.history.undo()).toBe(true);
    expect(doc.history.redo()).toBe(true);
    expect(doc.value).toEqual({ a: { value: 2 }, b: { value: 10 } });
  });

  test("isolates later subscribers from mutation attempts by an earlier subscriber", () => {
    const doc = createJSONDocument(z.object({ item: z.object({ value: z.number() }) }), {
      item: { value: 1 },
    });
    const observed = vi.fn();
    doc.subscribe((applied) => {
      expect(Object.isFrozen(applied)).toBe(true);
      expect(Object.isFrozen(applied[0])).toBe(true);
      try {
        (applied as JSONPatchOperation[])[0] = { op: "remove", path: "/item" };
      } catch {
        // Expected for the immutable publication record.
      }
      try {
        (applied[0] as Extract<JSONPatchOperation, { op: "replace" }>).path = "/missing";
      } catch {
        // Expected for the immutable publication record.
      }
    });
    doc.subscribe(observed);

    expect(doc.patch({ op: "replace", path: "/item/value", value: 2 })).toEqual({ ok: true });
    expect(observed.mock.calls[0]?.[0]).toEqual([
      { op: "replace", path: "/item/value", value: 2 },
    ]);
    expect(doc.value).toEqual({ item: { value: 2 } });
  });

  test("owns and freezes values accepted by load", () => {
    const doc = createJSONDocument(z.object({ data: z.unknown() }), { data: { value: 1 } });
    const loaded = { data: { value: 2 } };

    expect(doc.load(loaded)).toEqual({ ok: true });
    expect(Object.isFrozen(loaded)).toBe(false);
    expect(Object.isFrozen(loaded.data)).toBe(false);
    loaded.data.value = 99;

    expect(doc.value).toEqual({ data: { value: 2 } });
    expect(Object.isFrozen(doc.value)).toBe(true);
    expect(Object.isFrozen(doc.value.data)).toBe(true);
  });

  test("reset without a value restores the parsed initial snapshot", () => {
    const doc = createJSONDocument(z.string().transform((value) => value.length), "initial");
    expect(doc.value).toBe(7);
    expect(doc.load("next")).toEqual({ ok: true });
    expect(doc.value).toBe(4);

    expect(doc.reset()).toEqual({ ok: true });
    expect(doc.value).toBe(7);
  });

  test("owns commit operations before preview and history recording", () => {
    const Schema = z.object({ item: z.object({ label: z.string() }) });
    const doc = createJSONDocument(Schema, { item: { label: "before" } }, { history: 10 });
    const payload = { label: "after" };
    const operations: JSONPatchOperation[] = [{ op: "replace", path: "/item", value: payload }];

    expect(doc.commit(operations)).toEqual({ ok: true });
    expect(Object.isFrozen(payload)).toBe(false);
    payload.label = "mutated payload";
    operations[0] = { op: "remove", path: "/item" };

    expect(doc.history.undo()).toBe(true);
    expect(doc.history.redo()).toBe(true);
    expect(doc.value).toEqual({ item: { label: "after" } });
  });

  test("owns values published through the high-level insert path", () => {
    const doc = createJSONDocument(
      z.object({ items: z.array(z.object({ id: z.string() })) }),
      { items: [] },
    );
    const payload = { id: "a" };

    expect(doc.insert("/items/-", payload)).toMatchObject({ ok: true });
    expect(Object.isFrozen(payload)).toBe(false);
    payload.id = "external mutation";

    expect(doc.value).toEqual({ items: [{ id: "a" }] });
    expect(Object.isFrozen(doc.value.items[0])).toBe(true);
  });

  test("clones a mutable trustedInitial value but reuses a pre-frozen snapshot", () => {
    const Schema = z.object({ item: z.object({ id: z.string() }) });
    const mutable = { item: { id: "mutable" } };
    const mutableDoc = createJSONDocument(Schema, mutable, { trustedInitial: true });

    expect(mutableDoc.value).not.toBe(mutable);
    expect(Object.isFrozen(mutable)).toBe(false);
    mutable.item.id = "external mutation";
    expect(mutableDoc.value).toEqual({ item: { id: "mutable" } });

    const frozenItem = Object.freeze({ id: "frozen" });
    const frozen = Object.freeze({ item: frozenItem });
    const frozenDoc = createJSONDocument(Schema, frozen, { trustedInitial: true });
    expect(frozenDoc.value).toBe(frozen);
  });

  test("preserves deep immutability when patching a frozen trustedInitial snapshot", () => {
    const Item = z.object({ id: z.string(), meta: z.object({ label: z.string() }) });
    const Schema = z.object({ items: z.array(Item) });
    const first = {
      id: "a",
      meta: { label: "before" },
    };
    const second = {
      id: "b",
      meta: { label: "untouched" },
    };
    const initial = { items: [first, second] };
    Object.freeze(first.meta);
    Object.freeze(first);
    Object.freeze(second.meta);
    Object.freeze(second);
    Object.freeze(initial.items);
    Object.freeze(initial);
    const doc = createJSONDocument(Schema, initial, { trustedInitial: true });

    expect(doc.patch({
      op: "replace",
      path: "/items/0/meta/label",
      value: "after",
    })).toEqual({ ok: true });

    const snapshot = doc.value;
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.items)).toBe(true);
    expect(Object.isFrozen(snapshot.items[0])).toBe(true);
    expect(Object.isFrozen(snapshot.items[0]!.meta)).toBe(true);
    expect(snapshot.items[1]).toBe(second);
    expect(() => {
      snapshot.items[0]!.meta.label = "corrupt";
    }).toThrow(TypeError);
    expect(doc.value.items[0]!.meta.label).toBe("after");
  });

  test("document patch rejects URI fragment paths without changing state", () => {
    const doc = createJSONDocument(z.object({ value: z.number() }), { value: 1 });

    expect(doc.patch({ op: "replace", path: "#/value", value: 2 })).toMatchObject({
      ok: false,
      code: "invalid_pointer",
      pointer: "#/value",
    });
    expect(doc.value).toEqual({ value: 1 });
    expect(doc.lastPatch).toEqual([]);
  });

  test("freezes cloned subtrees produced by copy operations", () => {
    const doc = createJSONDocument(
      z.object({ items: z.array(z.object({ meta: z.object({ label: z.string() }) })) }),
      { items: [{ meta: { label: "a" } }] },
    );

    expect(doc.patch({ op: "copy", from: "/items/0", path: "/items/-" })).toEqual({ ok: true });
    expect(doc.value.items[1]).not.toBe(doc.value.items[0]);
    expect(Object.isFrozen(doc.value.items[1])).toBe(true);
    expect(Object.isFrozen(doc.value.items[1]!.meta)).toBe(true);
  });

  test("keeps a copied subtree immutable when the same batch moves it", () => {
    const Node = z.object({ meta: z.object({ label: z.string() }) });
    const doc = createJSONDocument(z.object({
      source: Node,
      temporary: Node.optional(),
      destination: Node.optional(),
    }), {
      source: { meta: { label: "a" } },
    });

    expect(doc.patch([
      { op: "copy", from: "/source", path: "/temporary" },
      { op: "move", from: "/temporary", path: "/destination" },
    ])).toEqual({ ok: true });
    expect(Object.isFrozen(doc.value.destination)).toBe(true);
    expect(Object.isFrozen(doc.value.destination!.meta)).toBe(true);
  });

  test("keeps a copied subtree immutable when a later array insert shifts it", () => {
    const Node = z.object({ meta: z.object({ label: z.string() }) });
    const doc = createJSONDocument(z.object({
      source: Node,
      items: z.array(Node),
    }), {
      source: { meta: { label: "copied" } },
      items: [],
    });
    void doc.value;

    expect(doc.patch([
      { op: "copy", from: "/source", path: "/items/0" },
      { op: "add", path: "/items/0", value: { meta: { label: "inserted" } } },
    ])).toEqual({ ok: true });
    expect(doc.value.items.map((item) => item.meta.label)).toEqual(["inserted", "copied"]);
    expect(Object.isFrozen(doc.value.items[1])).toBe(true);
    expect(Object.isFrozen(doc.value.items[1]!.meta)).toBe(true);
    expect(() => {
      doc.value.items[1]!.meta.label = "corrupt";
    }).toThrow(TypeError);
  });

  test("records reentrant subscriber patches in publication order", () => {
    const doc = createJSONDocument(
      z.object({ value: z.number() }),
      { value: 1 },
      { history: 10 },
    );
    let reentered = false;
    doc.subscribe((applied) => {
      if (reentered || applied[0]?.path !== "/value") return;
      reentered = true;
      expect(doc.patch({ op: "replace", path: "/value", value: 3 })).toEqual({ ok: true });
    });

    expect(doc.patch({ op: "replace", path: "/value", value: 2 })).toEqual({ ok: true });
    expect(doc.value).toEqual({ value: 3 });
    expect(doc.history.undoDepth).toBe(2);

    expect(doc.history.undo()).toBe(true);
    expect(doc.value).toEqual({ value: 2 });
    expect(doc.history.undo()).toBe(true);
    expect(doc.value).toEqual({ value: 1 });
  });

  test("preserves a history transaction opened by a reentrant subscriber", () => {
    const doc = createJSONDocument(
      z.object({ a: z.number(), b: z.number(), c: z.number() }),
      { a: 1, b: 1, c: 1 },
      { history: 10 },
    );
    let reentered = false;
    doc.subscribe((applied) => {
      if (reentered || applied[0]?.path !== "/a") return;
      reentered = true;
      doc.history.transaction(() => {
        expect(doc.patch({ op: "replace", path: "/b", value: 2 })).toEqual({ ok: true });
        expect(doc.patch({ op: "replace", path: "/c", value: 2 })).toEqual({ ok: true });
      });
    });

    expect(doc.patch({ op: "replace", path: "/a", value: 2 })).toEqual({ ok: true });
    expect(doc.value).toEqual({ a: 2, b: 2, c: 2 });
    expect(doc.history.undoDepth).toBe(2);

    expect(doc.history.undo()).toBe(true);
    expect(doc.value).toEqual({ a: 2, b: 1, c: 1 });
    expect(doc.history.undo()).toBe(true);
    expect(doc.value).toEqual({ a: 1, b: 1, c: 1 });
  });

  test("keeps each subscriber event's selection metadata publication-local", () => {
    const doc = createJSONDocument(
      z.object({ items: z.array(z.object({ id: z.string() })) }),
      { items: [{ id: "a" }, { id: "b" }] },
      { selection: { initial: ["/items/1"] } },
    );
    let reentered = false;
    doc.subscribe((applied) => {
      if (reentered || applied[0]?.path !== "/items/0/id") return;
      reentered = true;
      expect(doc.patch({ op: "remove", path: "/items/0" })).toEqual({ ok: true });
    });
    const outerMetadata = vi.fn();
    doc.subscribe((applied, metadata) => {
      if (applied[0]?.path === "/items/0/id") outerMetadata(metadata);
    });

    expect(doc.patch({ op: "replace", path: "/items/0/id", value: "A" })).toEqual({ ok: true });

    expect(doc.selection?.selectedPointers).toEqual(["/items/0"]);
    expect(outerMetadata).toHaveBeenCalledWith(expect.objectContaining({
      selectionBefore: expect.objectContaining({ selectedPointers: ["/items/1"] }),
      selectionAfter: expect.objectContaining({ selectedPointers: ["/items/1"] }),
    }));
  });

  test("captures selection metadata before selection callbacks can reenter", () => {
    const doc = createJSONDocument(
      z.object({ items: z.array(z.object({ id: z.string() })) }),
      { items: [{ id: "a" }, { id: "b" }, { id: "c" }] },
      { selection: { initial: ["/items/2"] } },
    );
    let reentered = false;
    doc.selection?.subscribe(() => {
      if (reentered) return;
      reentered = true;
      expect(doc.patch({ op: "remove", path: "/items/1" })).toEqual({ ok: true });
    });
    const observed: Array<ReadonlyArray<string>> = [];
    doc.subscribe((_applied, metadata) => {
      observed.push(metadata?.selectionAfter?.selectedPointers ?? []);
    });

    expect(doc.patch({ op: "remove", path: "/items/0" })).toEqual({ ok: true });

    expect(observed).toEqual([["/items/0"], ["/items/1"]]);
    expect(doc.selection?.selectedPointers).toEqual(["/items/0"]);
    expect(doc.lastPatch).toEqual([{ op: "remove", path: "/items/1" }]);
  });

  test("returns the outer edit's canonical patch when a subscriber reenters", () => {
    const doc = createJSONDocument(
      z.object({ outer: z.number(), inner: z.number() }),
      { outer: 1, inner: 1 },
    );
    let reentered = false;
    doc.subscribe((applied) => {
      if (reentered || applied[0]?.path !== "/outer") return;
      reentered = true;
      expect(doc.patch({ op: "replace", path: "/inner", value: 2 })).toEqual({ ok: true });
    });

    const result = doc.replace("/outer", 2);

    expect(result).toMatchObject({
      ok: true,
      applied: [{ op: "replace", path: "/outer", value: 2 }],
      target: "/outer",
      value: { outer: 2, inner: 2 },
    });
    expect(doc.lastPatch).toEqual([{ op: "replace", path: "/inner", value: 2 }]);
  });

  test("keeps previewed insert results and history publication-local under reentry", () => {
    const doc = createJSONDocument(
      z.object({
        items: z.array(z.object({ id: z.string() })),
        marker: z.number(),
      }),
      { items: [], marker: 0 },
      { history: 10 },
    );
    let reentered = false;
    doc.subscribe((applied) => {
      if (reentered || applied[0]?.path !== "/items/0") return;
      reentered = true;
      expect(doc.patch({ op: "replace", path: "/marker", value: 1 })).toEqual({ ok: true });
    });

    const result = doc.insert("/items/0", { id: "a" });

    expect(result).toMatchObject({
      ok: true,
      applied: [{ op: "add", path: "/items/0", value: { id: "a" } }],
      target: "/items/0",
      value: { items: [{ id: "a" }], marker: 1 },
    });
    expect(doc.history.undo()).toBe(true);
    expect(doc.value).toEqual({ items: [{ id: "a" }], marker: 0 });
    expect(doc.history.undo()).toBe(true);
    expect(doc.value).toEqual({ items: [], marker: 0 });
  });

  test("does not publish or record a successful test-only patch", () => {
    const doc = createJSONDocument(
      z.object({ value: z.number() }),
      { value: 1 },
      { history: 10 },
    );
    const listener = vi.fn();
    doc.subscribe(listener);
    expect(doc.patch({ op: "replace", path: "/value", value: 2 })).toEqual({ ok: true });
    const previousLastPatch = doc.lastPatch;
    const previousUndoDepth = doc.history.undoDepth;
    listener.mockClear();

    expect(doc.patch({ op: "test", path: "/value", value: 2 })).toEqual({ ok: true });

    expect(doc.lastPatch).toEqual(previousLastPatch);
    expect(doc.history.undoDepth).toBe(previousUndoDepth);
    expect(listener).not.toHaveBeenCalled();
  });

  test("records an explicit selection-only commit as one undoable history step", () => {
    const doc = createJSONDocument(
      z.object({ items: z.array(z.string()) }),
      { items: ["a", "b"] },
      {
        history: 10,
        selection: { initial: ["/items/0"] },
      },
    );

    expect(doc.commit(
      [{ op: "test", path: "/items/0", value: "a" }],
      { selectionAfter: "/items/1" },
    )).toEqual({ ok: true });
    expect(doc.selection?.selectedPointers).toEqual(["/items/1"]);
    expect(doc.history.undoDepth).toBe(1);
    expect(doc.lastPatch).toEqual([]);

    expect(doc.history.undo()).toBe(true);
    expect(doc.selection?.selectedPointers).toEqual(["/items/0"]);
    expect(doc.history.redo()).toBe(true);
    expect(doc.selection?.selectedPointers).toEqual(["/items/1"]);
  });

  test("ignores selectionAfter on a no-op commit when selection is disabled", () => {
    const doc = createJSONDocument(
      z.object({ items: z.array(z.string()) }),
      { items: ["a", "b"] },
      { history: 10 },
    );

    expect(doc.commit(
      [{ op: "test", path: "/items/0", value: "a" }],
      { selectionAfter: "/items/1" },
    )).toEqual({ ok: true });
    expect(doc.selection).toBeUndefined();
    expect(doc.history.undoDepth).toBe(0);
    expect(doc.lastPatch).toEqual([]);
  });

  test("deep-freezes a subtree copied to the document root", () => {
    const doc = createJSONDocument(z.unknown(), {
      source: { meta: { label: "a" } },
    });

    expect(doc.patch({ op: "copy", from: "/source", path: "" })).toEqual({ ok: true });
    const value = doc.value as { meta: { label: string } };
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.meta)).toBe(true);
  });
});
