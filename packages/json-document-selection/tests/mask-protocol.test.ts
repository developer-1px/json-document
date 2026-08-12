import { describe, expect, test } from "vitest";
import type { MaskAlgebra, MaskSelection } from "../src/index.js";

describe("mask extension protocol", () => {
  test("keeps weighted representation owned by the host algebra", () => {
    type Mask = readonly number[];
    const algebra: MaskAlgebra<Mask, Mask> = {
      empty: () => [0, 0, 0],
      replace: (region) => [...region],
      union: (mask, region) => mask.map((weight, index) => Math.max(weight, region[index] ?? 0)),
      subtract: (mask, region) => mask.map((weight, index) => Math.max(0, weight - (region[index] ?? 0))),
      intersect: (mask, region) => mask.map((weight, index) => Math.min(weight, region[index] ?? 0)),
      xor: (mask, region) => mask.map((weight, index) => Math.abs(weight - (region[index] ?? 0))),
      isEmpty: (mask) => mask.every((weight) => weight === 0),
    };
    const selection: MaskSelection<Mask> = {
      kind: "mask",
      representation: algebra.union(algebra.empty(), [0, 0.5, 1]),
    };
    expect(selection.representation).toEqual([0, 0.5, 1]);
    expect(algebra.isEmpty(selection.representation)).toBe(false);
  });
});
