import { describe, expect, test } from "vitest";
import {
  createDocumentEditor,
  createOrderEditor,
  createTreeEditor,
  gridCellsInRange,
  gridPointIndex,
  gridPointFromKey,
  gridPointKey,
  gridRangeBounds,
  gridTopology,
  lineInterval,
  lineTopology,
} from "../src/index.js";

describe("topology", () => {
  test("round-trips grid point keys without reserving identifier characters", () => {
    const point = { rowId: "row\u0000/한글", columnId: "column:[1]" };
    const key = gridPointKey(point);
    expect(gridPointFromKey(key)).toEqual(point);
    expect(gridPointFromKey("not-json")).toBeNull();
    expect(gridPointFromKey('["only-one"]')).toBeNull();
  });

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

  test("Tree, Document, and Order read the same line interval", () => {
    const ids = ["c", "a", "b"] as const;
    expect(lineInterval(lineTopology(ids), "c", "a")).toEqual(["c", "a"]);

    const tree = createTreeEditor({
      nodes: [
        { id: "c", parentId: null, label: "C" },
        { id: "a", parentId: null, label: "A" },
        { id: "b", parentId: null, label: "B" },
      ],
    });
    tree.dispatch({ type: "selection.set", nodeId: "c", topology: { visibleIds: ids } });
    tree.dispatch({ type: "selection.set", nodeId: "a", topology: { visibleIds: ids }, mode: "extend" });
    expect(tree.selectedNodeIdsIn({ visibleIds: ids })).toEqual(["c", "a"]);

    const document = createDocumentEditor({
      blocks: ids.map((id) => ({ id, text: id })),
    });
    document.dispatch({ type: "selection.set", blockId: "c" });
    document.dispatch({ type: "selection.set", blockId: "a", mode: "extend" });
    expect(document.selectedBlockIds).toEqual(["c", "a"]);

    const order = createOrderEditor({
      items: ids.map((id) => ({ id, label: id })),
    });
    order.dispatch({ type: "selection.set", itemId: "c" });
    order.dispatch({ type: "selection.set", itemId: "a", mode: "extend" });
    expect(order.selectedItemIds).toEqual(["c", "a"]);
  });
});
