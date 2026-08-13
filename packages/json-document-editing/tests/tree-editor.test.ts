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

  test("copies a selected hierarchy closure and pastes it under the same parent", () => {
    let sequence = 0;
    const editor = createTreeEditor(initial, { createId: () => `n${++sequence}` });
    editor.dispatch({ type: "selection.set", nodeId: "a", topology: collapsedA });
    const clipboard = editor.copy(collapsedA);
    expect(clipboard?.nodes.map((node) => node.id)).toEqual(["a", "a-1"]);
    expect(clipboard?.text).toBe("Alpha\nAlpha child");

    expect(editor.dispatch({
      type: "clipboard.paste",
      clipboard: clipboard!,
      topology: collapsedA,
      afterId: "b",
    }).ok).toBe(true);
    const document = editor.snapshot.value as TreeDocument;
    expect(document.nodes.map((node) => ({ id: node.id, parentId: node.parentId }))).toEqual([
      { id: "root", parentId: null },
      { id: "a", parentId: "root" },
      { id: "a-1", parentId: "a" },
      { id: "b", parentId: "root" },
      { id: "b-1", parentId: "b" },
      { id: "n1", parentId: "root" },
      { id: "n2", parentId: "n1" },
    ]);
    expect(editor.snapshot.selection.ranges[0]?.anchor.nodeId).toBe("n1");

    const pastedTopology: TreeTopology = { visibleIds: ["root", "a", "a-1", "b", "b-1", "n1", "n2"] };
    const cut = editor.cut(pastedTopology);
    expect(cut?.clipboard.nodes.map((node) => node.id)).toEqual(["n1", "n2"]);
    expect((editor.snapshot.value as TreeDocument).nodes.some((node) => node.id === "n1")).toBe(false);
    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as TreeDocument).nodes.some((node) => node.id === "n1")).toBe(true);
  });
});
