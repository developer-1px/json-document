import { describe, expect, test } from "vitest";
import { commitAffordance, resizeAffordance, type ResizeEdge } from "../src/index.js";

const size = { width: 200, height: 100 };
const origin = { x: 0, y: 0 };
const edges = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
const modes = [
  { shiftKey: false, altKey: false }, { shiftKey: true, altKey: false },
  { shiftKey: false, altKey: true }, { shiftKey: true, altKey: true },
];

function bounds(edge: ResizeEdge, point: typeof origin, modifiers = modes[0]!, initial = size) {
  const result = resizeAffordance(origin, point, edge, modifiers, initial);
  expect(result.cursor).toBe(`${edge}-resize`);
  const hand = result.hand;
  if (hand?.type !== "resize") throw new Error("Expected a resize result");
  return { x: hand.dx, y: hand.dy, width: initial.width + hand.dw, height: initial.height + hand.dh };
}

describe("size-aware Resize", () => {
  test.each([
    ["n", 0, -10, 200, 110], ["ne", 40, -10, 240, 110],
    ["e", 40, 0, 240, 100], ["se", 40, 10, 240, 110],
    ["s", 0, 10, 200, 110], ["sw", -40, 10, 240, 110],
    ["w", -40, 0, 240, 100], ["nw", -40, -10, 240, 110],
  ] as const)("%s resizes only its axes and fixes the opposite edge/corner", (edge, dx, dy, width, height) => {
    expect(bounds(edge, { x: dx || 75, y: dy || 75 })).toEqual({
      x: edge.includes("w") ? 200 - width : 0, y: edge.includes("n") ? 100 - height : 0, width, height,
    });
  });

  test.each(edges)("%s uses the initial non-square ratio and Alt fixes the center", (edge) => {
    const x = edge.includes("w") ? -40 : edge.includes("e") ? 40 : 0;
    const y = edge.includes("n") ? -10 : edge.includes("s") ? 10 : 0;
    const width = x === 0 ? 220 : 240, height = width / 2;
    const resized = bounds(edge, { x, y }, { shiftKey: true, altKey: false });
    expect(resized.width).toBeCloseTo(width); expect(resized.height).toBeCloseTo(height);
    expect(resized.x).toBeCloseTo(x === 0 ? (200 - width) / 2 : x < 0 ? 200 - width : 0);
    expect(resized.y).toBeCloseTo(y === 0 ? (100 - height) / 2 : y < 0 ? 100 - height : 0);
    for (const shiftKey of [false, true]) {
      const centered = bounds(edge, { x, y }, { shiftKey, altKey: true });
      expect(centered.x + centered.width / 2).toBeCloseTo(100);
      expect(centered.y + centered.height / 2).toBeCloseTo(50);
      expect(centered.width).toBeCloseTo(shiftKey ? 200 + (width - 200) * 2 : 200 + Math.abs(x) * 2);
      expect(centered.height).toBeCloseTo(shiftKey ? centered.width / 2 : 100 + Math.abs(y) * 2);
    }
  });

  test.each(edges.flatMap((edge) => modes.map((mode) => ({ edge, ...mode }))))("$edge clamps without moving its anchor (Shift=$shiftKey Alt=$altKey)", ({ edge, shiftKey, altKey }) => {
    const horizontal = edge.includes("e") || edge.includes("w"), vertical = edge.includes("n") || edge.includes("s");
    const result = bounds(edge, { x: edge.includes("w") ? 1000 : -1000, y: edge.includes("n") ? 1000 : -1000 }, { shiftKey, altKey });
    expect(result.width).toBeCloseTo(shiftKey ? 2 : horizontal ? 1 : 200);
    expect(result.height).toBeCloseTo(shiftKey || vertical ? 1 : 100);
    expect(result.x + result.width * (altKey || !horizontal ? 0.5 : edge.includes("w") ? 1 : 0)).toBeCloseTo(altKey || !horizontal ? 100 : edge.includes("w") ? 200 : 0);
    expect(result.y + result.height * (altKey || !vertical ? 0.5 : edge.includes("n") ? 1 : 0)).toBeCloseTo(altKey || !vertical ? 50 : edge.includes("n") ? 100 : 0);
  });

  test.each(edges)("%s keeps a stationary input a no-op in every modifier mode", (edge) => {
    for (const mode of modes) expect(commitAffordance(resizeAffordance(origin, origin, edge, mode, size))).toBeNull();
  });

  test("a tall object's ratio, shrinking and initially sub-unit dimensions remain well-defined", () => {
    expect(bounds("se", { x: -10, y: -80 }, { shiftKey: true, altKey: false }, { width: 100, height: 400 })).toEqual({ x: 0, y: 0, width: 80, height: 320 });
    const small = { width: 0.5, height: 0.25 };
    expect(bounds("nw", origin, modes[0], small)).toEqual({ x: 0, y: 0, ...small });
    expect(bounds("nw", { x: 10, y: 10 }, modes[0], small)).toEqual({ x: -0.5, y: -0.75, width: 1, height: 1 });
  });

  test.each([0, -1, Infinity, NaN])("rejects invalid initial dimensions (%s)", (width) => {
    expect(() => resizeAffordance(origin, origin, "e", undefined, { width, height: 100 })).toThrow(RangeError);
  });
});
