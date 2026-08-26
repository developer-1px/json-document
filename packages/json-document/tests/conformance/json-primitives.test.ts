import { describe, expect, it } from "vitest";
import { jsonEqual, parseArrayIndex } from "@interactive-os/json-document";

describe("canonical JSON primitives", () => {
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
