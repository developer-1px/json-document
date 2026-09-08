import { describe, expect, test } from "vitest";
import { computeAnchoredFloatingPosition, type FloatingPlacement } from "../src/index.js";

const boundary = { x: 0, y: 0, width: 800, height: 600 };
const floating = { width: 160, height: 120 };

describe("anchored floating position", () => {
  test.each([
    ["top", 280, 172],
    ["bottom", 280, 316],
    ["left", 152, 244],
    ["right", 408, 244],
    ["top-start", 320, 172],
    ["top-end", 240, 172],
  ] as const)("places %s relative to the anchor", (placement, x, y) => {
    expect(position({ x: 320, y: 300, width: 80, height: 8 }, placement)).toMatchObject({ x, y, placement, fits: true });
  });

  test("uses the first fitting fallback when the preferred side clips", () => {
    const result = computeAnchoredFloatingPosition({
      anchor: { x: 320, y: 4, width: 80, height: 24 }, floating, boundary,
      offset: 8,
      policy: { type: "preferred", placement: "top", fallbacks: ["bottom", "right"] },
    });
    expect(result).toMatchObject({ placement: "bottom", x: 280, y: 36, fits: true });
  });

  test("shifts a fitting side along the boundary cross axis", () => {
    const result = position({ x: 770, y: 240, width: 24, height: 24 }, "top");
    expect(result).toMatchObject({ placement: "top", x: 640, fits: true });
  });

  test("keeps collision shifts tethered to the anchor", () => {
    const result = computeAnchoredFloatingPosition({
      anchor: { x: 200, y: 606, width: 76, height: 36 }, floating, boundary,
      offset: 8,
      policy: { type: "preferred", placement: "right-start", fallbacks: ["left-start", "bottom-start", "top-start"] },
    });
    expect(result).toMatchObject({ placement: "top-start", x: 200, y: 478, fits: true });
  });

  test("keeps a locked side and reports insufficient space", () => {
    const result = computeAnchoredFloatingPosition({
      anchor: { x: 100, y: 20, width: 40, height: 20 }, floating, boundary,
      offset: 8,
      policy: { type: "locked", placement: "top" },
    });
    expect(result).toMatchObject({
      placement: "top", y: -108, availableHeight: 12, fits: false,
      overflow: { top: 108, right: 0, bottom: 0, left: 0 },
    });
  });

  test("respects boundary padding in collision and available size", () => {
    const result = computeAnchoredFloatingPosition({
      anchor: { x: 8, y: 300, width: 40, height: 20 }, floating, boundary,
      boundaryPadding: 16,
      offset: 8,
      policy: { type: "preferred", placement: "left", fallbacks: ["right"] },
    });
    expect(result).toMatchObject({ placement: "right", x: 56, availableWidth: 728, fits: true });
  });
});

function position(anchor: { x: number; y: number; width: number; height: number }, placement: FloatingPlacement) {
  return computeAnchoredFloatingPosition({
    anchor, floating, boundary, offset: 8,
    policy: { type: "preferred", placement },
  });
}
