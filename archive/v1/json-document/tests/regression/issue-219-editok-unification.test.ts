// #219 이행 1단계b — mutation verb 성공 shape 통일 { ok, value, applied, target }.
// "duplicate 는 새 객체(위치)를 반환한다"는 정본을 전 verb 로 일반화.

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createJSONDocument } from "@interactive-os/json-document/session";

const Schema = z.object({
  items: z.array(z.object({ id: z.string() })),
  meta: z.object({ title: z.string() }),
});

const initial = { items: [{ id: "a" }, { id: "b" }], meta: { title: "t" } };

describe("#219 EditOk unification", () => {
  it("insert returns value/applied/target with the concrete landing pointer", () => {
    const doc = createJSONDocument(Schema, initial);
    const r = doc.insert("/items/-", { id: "c" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.target).toBe("/items/2");
    expect(r.applied).toEqual([{ op: "add", path: "/items/2", value: { id: "c" } }]);
    expect(r.value).toBe(doc.value);
  });

  it("insert with before-target lands at the resolved index", () => {
    const doc = createJSONDocument(Schema, initial);
    const r = doc.insert({ before: "/items/0" }, { id: "z" });
    expect(r.ok && r.target).toBe("/items/0");
  });

  it("replace returns the replaced pointer as target", () => {
    const doc = createJSONDocument(Schema, initial);
    const r = doc.replace("/meta/title", "u");
    expect(r.ok && r.target).toBe("/meta/title");
  });

  it("JSONPath multi-replace has no single landing point → target null", () => {
    const doc = createJSONDocument(Schema, initial);
    const r = doc.replace("$.items[*].id", "same");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.target).toBeNull();
    expect(r.applied.length).toBe(2);
  });

  it("move returns the destination as target", () => {
    const doc = createJSONDocument(Schema, initial);
    const r = doc.move("/items/1", { before: "/items/0" });
    expect(r.ok && r.target).toBe("/items/0");
  });

  it("delete has no landing point → target null", () => {
    const doc = createJSONDocument(Schema, initial);
    const r = doc.delete("/items/0");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.target).toBeNull();
    expect(r.applied).toEqual([{ op: "remove", path: "/items/0" }]);
  });

  it("duplicate exposes target alongside duplicatedTo (identical)", () => {
    const doc = createJSONDocument(Schema, initial);
    const r = doc.duplicate("/items/0", { rekey: { fields: ["id"], strategy: "suffix" } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.target).toBe("/items/1");
    expect(r.duplicatedTo).toBe(r.target);
  });

  it("paste returns the first landing slot as target; cut has target null", () => {
    const doc = createJSONDocument(Schema, initial);
    doc.copy("/items/0");
    const pasted = doc.paste("/items/-");
    expect(pasted.ok && pasted.target).toBe("/items/2");
    const cutR = doc.cut("/items/0");
    expect(cutR.ok).toBe(true);
    if (!cutR.ok) return;
    expect(cutR.target).toBeNull();
  });

  it("selection-sugar insert also reports its landing target", () => {
    const doc = createJSONDocument(Schema, initial, { selection: { initial: ["/items/1"] } });
    const r = doc.insert({ id: "n" });
    expect(r.ok && r.target).toBe("/items/1");
  });
});
