import { describe, expect, test } from "vitest";
import {
  createTreeEditor,
  type TreeDocument,
  type TreeTopology,
} from "../src/index.js";

const initial: TreeDocument = {
  nodes: [
    { id: "root", parentId: null, label: "Workspace" },
    { id: "a", parentId: "root", label: "Alpha" },
    { id: "a-1", parentId: "a", label: "Alpha child" },
    { id: "b", parentId: "root", label: "Beta" },
    { id: "b-1", parentId: "b", label: "Beta child" },
  ],
};

const expanded: TreeTopology = { visibleIds: ["root", "a", "a-1", "b", "b-1"] };
const collapsedA: TreeTopology = { visibleIds: ["root", "a", "b", "b-1"] };

describe("tree editing selection family", () => {
  test("extends through host visible order and normalizes hidden endpoints to an ancestor", () => {
    const editor = createTreeEditor(initial);
    editor.dispatch({ type: "selection.set", nodeId: "a-1", topology: expanded });
    editor.dispatch({ type: "selection.set", nodeId: "b-1", topology: expanded, mode: "extend" });
    expect(editor.selectedNodeIdsIn(expanded)).toEqual(["a-1", "b", "b-1"]);

    editor.reconcile(collapsedA);
    expect(editor.snapshot.selection).toEqual({
      kind: "range",
      ranges: [{
        anchor: { nodeId: "a" },
        focus: { nodeId: "b-1" },
      }],
      primaryIndex: 0,
    });
    expect(editor.selectedNodeIdsIn(collapsedA)).toEqual(["a", "b", "b-1"]);
    expect(editor.snapshot.canUndo).toBe(false);
  });

  test("deletes selected hierarchy closures and restores value with selection", () => {
    const editor = createTreeEditor(initial);
    editor.dispatch({ type: "selection.set", nodeId: "a", topology: collapsedA });
    const selectionBefore = editor.snapshot.selection;

    expect(editor.dispatch({ type: "selection.remove", topology: collapsedA }).ok).toBe(true);
    expect((editor.snapshot.value as TreeDocument).nodes.map((node) => node.id)).toEqual([
      "root",
      "b",
      "b-1",
    ]);

    expect(editor.undo().ok).toBe(true);
    expect(editor.snapshot.value).toEqual(initial);
    expect(editor.snapshot.selection).toEqual(selectionBefore);
  });
});
