// #202 — JSONPath fast-path 는 컨테이너가 배열이 아닌 object 일 때
// 일반 evaluator 로 위임해야 한다. (wildcard/filter over object map)

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createJSONDocument } from "@interactive-os/json-document";

function pointers(state: unknown, query: string): string[] {
  const doc = createJSONDocument(z.unknown(), state);
  const r = doc.query(query);
  if (!r.ok) throw new Error(`query failed: ${r.code}`);
  return r.pointers;
}

describe("#202 JSONPath fast-path over object container", () => {
  it("wildcard-field over an object map yields member pointers", () => {
    const r = pointers({ a: { x: { b: 1 }, y: { b: 2 } } }, "$.a.*.b");
    expect(r.sort()).toEqual(["/a/x/b", "/a/y/b"]);
  });

  it("regex filter (full match) over an object map yields matching member pointers", () => {
    const r = pointers({ a: { k: { b: "x" }, m: { b: "y" } } }, "$.a[?match(@.b,'x')]");
    expect(r).toEqual(["/a/k"]);
  });

  it("regex filter (search) over an object map yields partial-match member pointers", () => {
    const r = pointers({ a: { k: { b: "xyz" }, m: { b: "no" } } }, "$.a[?search(@.b,'x')]");
    expect(r).toEqual(["/a/k"]);
  });

  it("wildcard-field over an array container still works (fast path)", () => {
    const r = pointers({ a: [{ b: 1 }, { b: 2 }, { c: 3 }] }, "$.a.*.b");
    expect(r).toEqual(["/a/0/b", "/a/1/b"]);
  });

  it("absent key yields empty result", () => {
    expect(pointers({ other: 1 }, "$.a.*.b")).toEqual([]);
  });
});
