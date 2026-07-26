// #200 — 기존 키를 덮어쓴 add/copy 의 inverse 는 remove 가 아니라
// 이전 값을 복원하는 replace 여야 한다. (undo 데이터 유실)

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createJSONDocument } from "@interactive-os/json-document/session";

describe("#200 undo restores value overwritten by add/copy", () => {
  it("add overwriting an existing object member restores the prior value on undo", () => {
    const doc = createJSONDocument(z.object({ a: z.number(), d: z.number() }), { a: 50, d: 84 }, { history: 100 });
    doc.patch({ op: "add", path: "/a", value: 64 });
    expect(doc.value).toEqual({ a: 64, d: 84 });
    doc.undo();
    expect(doc.value).toEqual({ a: 50, d: 84 });
  });

  it("copy onto an existing key restores the prior value on undo", () => {
    const doc = createJSONDocument(z.object({ a: z.number(), b: z.number() }), { a: 1, b: 2 }, { history: 100 });
    doc.patch({ op: "copy", from: "/a", path: "/b" });
    expect(doc.value).toEqual({ a: 1, b: 1 });
    doc.undo();
    expect(doc.value).toEqual({ a: 1, b: 2 });
  });

  it("add of a new object member is still removed on undo", () => {
    const doc = createJSONDocument(z.object({ a: z.number(), b: z.number().optional() }), { a: 1 }, { history: 100 });
    doc.patch({ op: "add", path: "/b", value: 9 });
    expect(doc.value).toEqual({ a: 1, b: 9 });
    doc.undo();
    expect(doc.value).toEqual({ a: 1 });
  });

  it("add inserting into an array is still removed on undo (no overwrite)", () => {
    const doc = createJSONDocument(z.object({ arr: z.array(z.number()) }), { arr: [10, 20, 30] }, { history: 100 });
    doc.patch({ op: "add", path: "/arr/1", value: 15 });
    expect(doc.value).toEqual({ arr: [10, 15, 20, 30] });
    doc.undo();
    expect(doc.value).toEqual({ arr: [10, 20, 30] });
  });

  it("nested overwriting add restores the prior nested value on undo", () => {
    const doc = createJSONDocument(
      z.object({ obj: z.object({ x: z.object({ a: z.number() }) }) }),
      { obj: { x: { a: 5 } } },
      { history: 100 },
    );
    doc.patch({ op: "add", path: "/obj/x/a", value: 99 });
    expect(doc.value).toEqual({ obj: { x: { a: 99 } } });
    doc.undo();
    expect(doc.value).toEqual({ obj: { x: { a: 5 } } });
  });
});
