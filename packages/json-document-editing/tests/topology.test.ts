import { describe, expect, test } from "vitest";
import {
  gridCellsInRange,
  gridPointIndex,
  gridRangeBounds,
  gridTopology,
  lineInterval,
  lineTopology,
} from "../src/index.js";

describe("topology", () => {
  test("reads a 1D interval in visible order, not JSON insertion order", () => {
    const visible = lineTopology(["c", "a", "b"]);
    expect(lineInterval(visible, "c", "a")).toEqual(["c", "a"]);
    expect(lineInterval(visible, "a", "missing")).toEqual([]);
  });

  test("reads a 2D range in visible row and column order", () => {
    const visible = gridTopology(["r3", "r1", "r2"], ["score", "name"]);
    expect(gridPointIndex(visible, { rowId: "r1", columnId: "name" })).toEqual({
      rowIndex: 1,
      columnIndex: 1,
    });
    expect(gridRangeBounds(visible, {
      anchor: { rowId: "r3", columnId: "score" },
      focus: { rowId: "r1", columnId: "name" },
    })).toEqual({
      rowStart: 0,
      rowEnd: 1,
      columnStart: 0,
      columnEnd: 1,
    });
    expect(gridCellsInRange(visible, {
      anchor: { rowId: "r3", columnId: "score" },
      focus: { rowId: "r1", columnId: "name" },
    })).toEqual([
      { rowId: "r3", columnId: "score" },
      { rowId: "r3", columnId: "name" },
      { rowId: "r1", columnId: "score" },
      { rowId: "r1", columnId: "name" },
    ]);
  });
});
