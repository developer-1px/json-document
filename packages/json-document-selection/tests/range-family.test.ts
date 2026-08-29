import { describe, expect, test } from "vitest";
import {
  collapsedRangeSelection,
  createMaterializedRangeSelectionFamily,
  createRangeSelectionFamily,
  emptyRangeSelection,
  type OrderedTopology,
} from "../src/index.js";

function topology(ids: readonly string[]): OrderedTopology<string, string> {
  return {
    equals: (left, right) => left === right,
    interval(anchor, focus) {
      const start = ids.indexOf(anchor);
      const end = ids.indexOf(focus);
      if (start < 0 || end < 0) return [];
      return ids.slice(Math.min(start, end), Math.max(start, end) + 1);
    },
    reconcilePoint: (point) => ids.includes(point) ? point : null,
  };
}

describe("range selection family", () => {
  test("preserves directional anchor/focus and a valid primary", () => {
    const family = createRangeSelectionFamily<string>();
    const context = { topology: topology(["a", "b", "c", "d"]) };
    let state = collapsedRangeSelection("d");
    state = family.transition(state, { type: "extend-primary", point: "b" }, context).state;
    state = family.transition(state, { type: "toggle-point", point: "a" }, context).state;

    expect(state).toEqual({
      kind: "range",
      ranges: [{ anchor: "d", focus: "b" }, { anchor: "a", focus: "a" }],
      primaryIndex: 1,
    });
    expect(family.targets(state, context)).toEqual(["b", "c", "d", "a"]);
  });

  test("uses null primary for an empty selection", () => {
    const family = createRangeSelectionFamily<string>();
    const context = { topology: topology(["a"]) };
    const state = family.transition(collapsedRangeSelection("a"), {
      type: "toggle-point",
      point: "a",
    }, context).state;
    expect(state).toEqual(emptyRangeSelection());
  });

  test("reconciles endpoints deterministically and idempotently", () => {
    const family = createRangeSelectionFamily<string>();
    const state = {
      kind: "range" as const,
      ranges: [{ anchor: "missing", focus: "b" }, { anchor: "gone", focus: "gone" }],
      primaryIndex: 1,
    };
    const context = { topology: topology(["a", "b", "c"]) };
    const result = family.reconcile(state, context);
    expect(result.state).toEqual({
      kind: "range",
      ranges: [{ anchor: "b", focus: "b" }],
      primaryIndex: 0,
    });
    expect(family.reconcile(result.state, context).changed).toBe(false);
    expect(JSON.parse(JSON.stringify(result.state))).toEqual(result.state);
  });

  test("maps points before topology reconciliation", () => {
    const family = createRangeSelectionFamily<string>();
    const context = { topology: topology(["a", "b2", "c"]) };
    const result = family.map({
      kind: "range",
      ranges: [{ anchor: "a", focus: "b" }],
      primaryIndex: 0,
    }, {
      mapPoint: (point) => point === "b" ? "b2" : point,
    }, context);
    expect(result.state.ranges).toEqual([{ anchor: "a", focus: "b2" }]);
  });
});

describe("materialized range selection family", () => {
  test("keeps resolved points when the visible interval changes", () => {
    const family = createMaterializedRangeSelectionFamily<string>();
    const first = { topology: topology(["a", "b", "c", "d"]) };
    let state = family.transition({ kind: "range", ranges: [], primaryIndex: null }, {
      type: "collapse",
      point: "a",
    }, first).state;
    state = family.transition(state, { type: "extend-primary", point: "c" }, first).state;

    const nextView: OrderedTopology<string, string> = {
      equals: (left, right) => left === right,
      interval: (anchor, focus) => anchor === focus && ["c", "d"].includes(anchor) ? [anchor] : [],
      reconcilePoint: (point) => ["a", "b", "c", "d"].includes(point) ? point : null,
    };
    expect(family.targets(state, { topology: nextView })).toEqual(["a", "b", "c"]);
    expect(family.reconcile(state, { topology: nextView }).state).toEqual(state);
  });

  test("toggle removes a point from a materialized interval", () => {
    const family = createMaterializedRangeSelectionFamily<string>();
    const context = { topology: topology(["a", "b", "c"]) };
    let state = family.transition({ kind: "range", ranges: [], primaryIndex: null }, { type: "collapse", point: "a" }, context).state;
    state = family.transition(state, { type: "extend-primary", point: "c" }, context).state;
    state = family.transition(state, { type: "toggle-point", point: "b" }, context).state;
    expect(family.targets(state, context)).toEqual(["a", "c"]);
  });
});
