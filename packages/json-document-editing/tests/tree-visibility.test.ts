import { describe, expect, test } from "vitest";
import {
  projectTreeVisibility,
  treeVisibilityNeighbor,
  type TreeNode,
} from "../src/index.js";

const nodes: TreeNode[] = [
  { id: "fruit", parentId: null, label: "Fruit" },
  { id: "apple", parentId: "fruit", label: "Apple" },
  { id: "pear", parentId: "fruit", label: "Pear" },
  { id: "veg", parentId: null, label: "Vegetables" },
];

describe("Tree visibility", () => {
  test("projects visible rows, topology, hierarchy, and fold facts", () => {
    const visibility = projectTreeVisibility(nodes, new Set(["fruit"]));
    expect(visibility.topology.visibleIds).toEqual(["fruit", "apple", "pear", "veg"]);
    expect(visibility.rows).toMatchObject([
      { id: "fruit", depth: 0, posInSet: 1, setSize: 2, hasChildren: true, expanded: true },
      { id: "apple", depth: 1, posInSet: 1, setSize: 2, hasChildren: false, expanded: false },
      { id: "pear", depth: 1, posInSet: 2, setSize: 2, hasChildren: false, expanded: false },
      { id: "veg", depth: 0, posInSet: 2, setSize: 2, hasChildren: false, expanded: false },
    ]);
  });

  test("moves through the projected line and hierarchy", () => {
    const visibility = projectTreeVisibility(nodes, new Set(["fruit"]));
    expect(treeVisibilityNeighbor(visibility, "fruit", { type: "move", direction: "right" })).toBe("apple");
    expect(treeVisibilityNeighbor(visibility, "apple", { type: "move", direction: "left" })).toBe("fruit");
    expect(treeVisibilityNeighbor(visibility, "pear", { type: "move", direction: "down" })).toBe("veg");
    expect(treeVisibilityNeighbor(visibility, "veg", { type: "boundary", edge: "start" })).toBe("fruit");
  });
});
