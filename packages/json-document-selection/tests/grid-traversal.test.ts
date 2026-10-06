import {expect, test} from "vitest";
import {traverseGrid} from "../src/index.js";

test("sequential entry visits the rectangle in row or column order, including reverse wrap", () => {
  for (const order of ["row-major", "column-major"] as const) {
    const expected = order === "row-major" ? [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]] : [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]];
    let point = {rowIndex: 0, columnIndex: 0};
    for (let i = 1; i <= expected.length; i++) {
      const next = traverseGrid(point, {rowCount: 2, columnCount: 3, order, wrap: true})!;
      expect([next.rowIndex, next.columnIndex]).toEqual(expected[i % expected.length]);
      expect(traverseGrid(next, {rowCount: 2, columnCount: 3, order, wrap: true, reverse: true})).toEqual(point);
      point = next;
    }
  }
});
test("boundaries, stale coordinates and huge sparse grids do not allocate cell sets", () => {
  expect(traverseGrid({rowIndex: 0, columnIndex: 0}, {rowCount: 2, columnCount: 3, order: "row-major", reverse: true})).toBeNull();
  expect(traverseGrid({rowIndex: -1, columnIndex: 0}, {rowCount: 2, columnCount: 3, order: "row-major", wrap: true})).toBeNull();
  expect(traverseGrid({rowIndex: 999999, columnIndex: 9999}, {rowCount: 1000000, columnCount: 10000, order: "row-major", wrap: true})).toEqual({rowIndex: 0, columnIndex: 0});
});
