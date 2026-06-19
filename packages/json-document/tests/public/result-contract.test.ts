import { describe, expect, test } from "vitest";
import * as z from "zod";

import { createJSONDocument, type JSONPatchOperation } from "@interactive-os/json-document";

const Item = z.object({
  id: z.string(),
  title: z.string(),
});

const Schema = z.object({
  items: z.array(Item),
  meta: z.record(z.string(), z.string()),
  title: z.string(),
});

type Value = z.output<typeof Schema>;

const initial: Value = {
  items: [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
  ],
  meta: { owner: "core" },
  title: "Document",
};

function createDoc() {
  return createJSONDocument(Schema, initial, {
    history: 20,
    selection: { mode: "multiple", initial: ["/items/0"] },
  });
}

function expectOkKeys(result: unknown, keys: ReadonlyArray<string>) {
  expect(result).toMatchObject({ ok: true });
  expect(Object.keys(result as Record<string, unknown>).sort()).toEqual([...keys].sort());
}

describe("json-document 1.0 result contract", () => {
  test("locks JSONResult mutation shape and lastPatch handoff", () => {
    const doc = createDoc();

    const insertPatch: JSONPatchOperation[] = [
      { op: "add", path: "/items/2", value: { id: "c", title: "C" } },
    ];
    const inserted = doc.insert("/items/-", { id: "c", title: "C" });
    expect(inserted).toEqual({ ok: true });
    expect(doc.lastPatch).toEqual(insertPatch);

    const replaced = doc.replace("/items/2/title", "C1");
    expect(replaced).toEqual({ ok: true });
    expect(doc.lastPatch).toEqual([{ op: "replace", path: "/items/2/title", value: "C1" }]);

    const moved = doc.move("/items/2", { before: "/items/0" });
    expect(moved).toEqual({ ok: true });
    expect(doc.lastPatch).toEqual([{ op: "move", from: "/items/2", path: "/items/0" }]);

    const deleted = doc.delete("/items/0");
    expect(deleted).toEqual({ ok: true });
    expect(doc.lastPatch).toEqual([{ op: "remove", path: "/items/0" }]);
  });

  test("locks clipboard and structural command success payloads", () => {
    const doc = createDoc();

    const copied = doc.copy(["/items/0", "/items/1"]);
    expectOkKeys(copied, ["ok", "payload", "source", "sources"]);
    if (!copied.ok) return;
    expect(copied).toMatchObject({
      payload: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
      source: "/items/0",
      sources: ["/items/0", "/items/1"],
    });
    expect(doc.value).toEqual(initial);
    expect(doc.lastPatch).toEqual([]);

    const pasted = doc.paste("/items/-");
    expectOkKeys(pasted, ["ok", "value", "applied"]);
    if (!pasted.ok) return;
    expect(pasted.applied).toEqual([
      { op: "add", path: "/items/2", value: { id: "a", title: "A" } },
      { op: "add", path: "/items/3", value: { id: "b", title: "B" } },
    ]);
    expect(pasted.value).toBe(doc.value);
    expect(doc.lastPatch).toEqual(pasted.applied);

    const duplicated = doc.duplicate("/items/0", {
      rekey: { fields: ["id"], strategy: "suffix" },
    });
    expectOkKeys(duplicated, ["ok", "value", "applied", "duplicatedTo"]);
    if (!duplicated.ok) return;
    expect(duplicated.duplicatedTo).toBe("/items/1");
    expect(duplicated.applied).toEqual([
      {
        op: "add",
        path: "/items/1",
        value: { id: "a-copy", title: "A" },
      },
    ]);
    expect(duplicated.value).toBe(doc.value);
    expect(doc.lastPatch).toEqual(duplicated.applied);

    const cut = doc.cut("/items/1");
    expectOkKeys(cut, ["ok", "value", "applied", "payload", "source", "sources"]);
    if (!cut.ok) return;
    expect(cut).toMatchObject({
      applied: [{ op: "remove", path: "/items/1" }],
      payload: { id: "a-copy", title: "A" },
      source: "/items/1",
      sources: ["/items/1"],
    });
    expect(cut.value).toBe(doc.value);
    expect(doc.lastPatch).toEqual(cut.applied);
  });

  test("locks failure code payloads without depending on reason text", () => {
    const doc = createDoc();

    expect(doc.at("items/0")).toMatchObject({
      ok: false,
      code: "invalid_pointer",
      pointer: "items/0",
    });
    expect(doc.query("$.items[")).toMatchObject({
      ok: false,
      code: "invalid_query",
    });
    expect(doc.canUndo()).toMatchObject({
      ok: false,
      code: "empty_stack",
    });
    expect(doc.canReplace("/items/0/id", 1)).toMatchObject({
      ok: false,
      code: "schema_violation",
      violations: [{ path: "/items/0/id", message: expect.any(String) }],
    });
    expect(doc.copy([])).toMatchObject({
      ok: false,
      code: "empty_selection",
    });
    expect(doc.clipboard.write({ fn: () => undefined })).toMatchObject({
      ok: false,
      code: "not_serializable",
    });
    expect(doc.paste("/items/-")).toMatchObject({
      ok: false,
      code: "empty_clipboard",
    });
    expect(doc.duplicate("/meta/owner")).toMatchObject({
      ok: false,
      code: "missing_new_key",
    });
  });
});
