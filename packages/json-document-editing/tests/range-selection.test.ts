import { describe, expect, test } from "vitest";
import {
  collapsedRangeSelection,
  selectRangePoint,
} from "../src/range-selection.js";

describe("shared range selection state transitions", () => {
  test("replaces, toggles, and extends the primary range without domain knowledge", () => {
    const same = (left: string, right: string) => left === right;
    let selection = collapsedRangeSelection("a");

    selection = selectRangePoint(selection, "c", "extend", same);
    expect(selection).toEqual({
      kind: "range",
      ranges: [{ anchor: "a", focus: "c" }],
      primaryIndex: 0,
    });

    selection = selectRangePoint(selection, "e", "toggle", same);
    expect(selection).toEqual({
      kind: "range",
      ranges: [
        { anchor: "a", focus: "c" },
        { anchor: "e", focus: "e" },
      ],
      primaryIndex: 1,
    });

    selection = selectRangePoint(selection, "f", "extend", same);
    expect(selection.ranges[1]).toEqual({ anchor: "e", focus: "f" });

    selection = selectRangePoint(selection, "b", "replace", same);
    expect(selection).toEqual({
      kind: "range",
      ranges: [{ anchor: "b", focus: "b" }],
      primaryIndex: 0,
    });
  });

  test("removes a toggled collapsed range and keeps a valid primary", () => {
    const same = (left: string, right: string) => left === right;
    let selection = collapsedRangeSelection("a");
    selection = selectRangePoint(selection, "c", "toggle", same);
    selection = selectRangePoint(selection, "c", "toggle", same);

    expect(selection).toEqual({
      kind: "range",
      ranges: [{ anchor: "a", focus: "a" }],
      primaryIndex: 0,
    });
  });
});
