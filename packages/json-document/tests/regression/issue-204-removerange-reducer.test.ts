// #204 — removeRange 가 point 기준으로 올바른 range 를 삭제하고,
// 비-primary range 제거 시 primary identity 를 유지해야 한다.

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createJSONDocument } from "@interactive-os/json-document";

const Schema = z.object({ a: z.string(), b: z.string(), c: z.string() });

function multiDoc() {
  return createJSONDocument(Schema, { a: "1", b: "2", c: "3" }, { selection: { mode: "multiple" } });
}

describe("#204 removeRange selection reducer", () => {
  it("removeRange(point) removes the range the point belongs to", () => {
    const doc = multiDoc();
    doc.selection!.selectRanges(["/a", "/b"]);
    expect(doc.selection!.selectedPointers).toEqual(["/a", "/b"]);
    doc.selection!.removeRange("/b");
    expect(doc.selection!.selectedPointers).toEqual(["/a"]);
  });

  it("removeRange(point) on the first pointer keeps the rest", () => {
    const doc = multiDoc();
    doc.selection!.selectRanges(["/a", "/b", "/c"]);
    doc.selection!.removeRange("/a");
    expect(doc.selection!.selectedPointers).toEqual(["/b", "/c"]);
  });

  it("removeRange of a range before the primary keeps primary identity", () => {
    const doc = multiDoc();
    doc.selection!.selectRanges(["/a", "/b", "/c"], undefined, undefined, 1);
    expect(doc.selection!.primaryPointer).toBe("/b");
    doc.selection!.removeRange(0); // remove /a (before primary)
    expect(doc.selection!.selectedPointers).toEqual(["/b", "/c"]);
    expect(doc.selection!.primaryPointer).toBe("/b");
  });

  it("removeRange of a range after the primary keeps primary identity", () => {
    const doc = multiDoc();
    doc.selection!.selectRanges(["/a", "/b", "/c"], undefined, undefined, 1);
    doc.selection!.removeRange(2); // remove /c (after primary)
    expect(doc.selection!.primaryPointer).toBe("/b");
  });

  it("removeRange of the primary range re-homes primary within bounds", () => {
    const doc = multiDoc();
    doc.selection!.selectRanges(["/a", "/b", "/c"], undefined, undefined, 2);
    expect(doc.selection!.primaryPointer).toBe("/c");
    doc.selection!.removeRange(2); // remove primary (last)
    expect(doc.selection!.selectedPointers).toEqual(["/a", "/b"]);
    expect(doc.selection!.primaryPointer).toBe("/b");
  });
});
