import { describe, expect, it } from "vitest";
import { applyPatch, createJSONDocument, isJSONValue, jsonEqual, parseArrayIndex, readPointer } from "@interactive-os/json-document";

describe("canonical JSON primitives", () => {
  it("uses the same JSON tree boundary as Core without normalizing or invoking accessors", () => {
    const cycle: unknown[] = [];
    cycle.push(cycle);
    const shared = {};
    let reads = 0;
    const accessor = Object.defineProperty({}, "value", { enumerable: true, get: () => { reads++; return 1; } });
    const candidates: unknown[] = [
      null, true, 1, "", [], { "a/b~": [1, null] }, Object.create(null),
      undefined, NaN, Infinity, new Date(0), Array(1), cycle, [shared, shared],
      { value: undefined }, accessor, { [Symbol("key")]: 1 },
    ];
    for (const candidate of candidates) {
      expect(isJSONValue(candidate)).toBe(applyPatch(candidate, []).ok);
    }
    expect(reads).toBe(0);
    expect(isJSONValue({ nested: { title: "Draft" } })).toBe(true);
  });

  it("reads the same locations and failures as document.at while borrowing the value", () => {
    const value = { "a/b~": [{ title: "Draft" }], "": true };
    const document = createJSONDocument(value);
    for (const pointer of ["", "#", "/", "/a~1b~0/0", "#/a~1b~0/0/title", "/a~1b~0/01", "/missing", "/toString", "/bad~2", "#/%ZZ"]) {
      expect(readPointer(value, pointer)).toEqual(document.at(pointer));
    }
    const selected = readPointer(value, "#/a~1b~0/0");
    expect(selected.ok && selected.value).toBe(value["a/b~"][0]);
    expect(Object.isFrozen(value)).toBe(false);
    expect(Object.isFrozen(value["a/b~"][0])).toBe(false);
  });

  it("compares JSON values without depending on object key order", () => {
    expect(jsonEqual({ alpha: 1, beta: [true] }, { beta: [true], alpha: 1 })).toBe(true);
    expect(jsonEqual({ alpha: 1 }, { alpha: 2 })).toBe(false);
  });

  it("parses canonical array index segments", () => {
    expect(parseArrayIndex("0")).toBe(0);
    expect(parseArrayIndex("12")).toBe(12);
    expect(parseArrayIndex("01")).toBeNull();
    expect(parseArrayIndex("-1")).toBeNull();
  });
});
