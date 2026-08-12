import { describe, expect, test } from "vitest";
import {
  idlePointerInteraction,
  reduceMarqueeInteraction,
  reduceNavigation,
  reducePressInteraction,
  type PointerInteractionState,
} from "../src/index.js";

type Point = { readonly x: number; readonly y: number };
type Region = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

const marqueeContext = {
  regions: {
    fromPoints(start: Point, current: Point): Region {
      return {
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        width: Math.abs(start.x - current.x),
        height: Math.abs(start.y - current.y),
      };
    },
  },
  spatialIndex: {
    hitPoint: () => null,
    hitRegion: (region: Region) => region.width >= 10 ? ["a", "b"] : [],
  },
  hitMode: "intersects" as const,
};

describe("headless interactions", () => {
  test("press previews and commits semantic operations", () => {
    let state: PointerInteractionState<number> = idlePointerInteraction();
    let result = reducePressInteraction(state, {
      phase: "start", pointerId: "mouse:1", point: 2, operation: "extend",
    });
    state = result.state;
    expect(result.preview).toEqual({ point: 2, operation: "extend" });

    result = reducePressInteraction(state, { phase: "end", pointerId: "mouse:1", point: 4 });
    expect(result.commit).toEqual({ point: 4, operation: "extend" });
    expect(result.state).toEqual({ kind: "idle" });
  });

  test("marquee ignores a second pointer and clears preview on cancel", () => {
    let state: PointerInteractionState<Point> = idlePointerInteraction();
    let result = reduceMarqueeInteraction(state, {
      phase: "start", pointerId: "touch:1", point: { x: 0, y: 0 }, operation: "add",
    }, marqueeContext);
    state = result.state;

    result = reduceMarqueeInteraction(state, {
      phase: "move", pointerId: "touch:2", point: { x: 20, y: 20 },
    }, marqueeContext);
    expect(result.changed).toBe(false);
    expect(result.preview).toBeNull();

    result = reduceMarqueeInteraction(state, {
      phase: "move", pointerId: "touch:1", point: { x: 20, y: 5 },
    }, marqueeContext);
    expect(result.preview).toEqual({
      region: { x: 0, y: 0, width: 20, height: 5 },
      keys: ["a", "b"],
      operation: "add",
    });

    result = reduceMarqueeInteraction(result.state, {
      phase: "cancel", pointerId: "touch:1",
    }, marqueeContext);
    expect(result).toMatchObject({ state: { kind: "idle" }, preview: null, commit: null, canceled: true });
  });

  test("keyboard navigation changes current separately and emits a family command", () => {
    const result = reduceNavigation({ current: "b" }, {
      type: "move", direction: "next", operation: "extend",
    }, {
      move: (current) => current === "b" ? "c" : null,
      boundary: (edge) => edge === "start" ? "a" : "d",
      select: (point, operation) => ({ type: operation, point }),
      activate: (point) => ({ lease: `edit:${point}` }),
    });
    expect(result.navigation).toEqual({ current: "c" });
    expect(result.selectionCommand).toEqual({ type: "extend", point: "c" });
    expect(result.activation).toBeNull();
  });
});
