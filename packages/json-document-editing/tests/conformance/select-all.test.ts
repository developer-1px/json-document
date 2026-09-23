import { expect, test } from "vitest";
import {
  createDocumentEditor, createOrderEditor, createTreeEditor, createSheetEditor,
  type EditingSnapshot, type EditingResult,
} from "../../src/index.js";
import type { JSONValue } from "@interactive-os/json-document";

function assertSelectionTransition<Selection extends JSONValue>(
  editor: {
    readonly snapshot: EditingSnapshot<Selection>;
    subscribe(listener: (snapshot: EditingSnapshot<Selection>) => void): () => void;
  },
  selectAll: () => EditingResult<Selection>,
  expected: unknown,
) {
  const before = editor.snapshot;
  const seen: Selection[] = [];
  const release = editor.subscribe((snapshot) => seen.push(snapshot.selection));
  try {
    for (let repeat = 0; repeat < 3; repeat++) {
      expect(selectAll().ok).toBe(true);
      expect(editor.snapshot.selection).toEqual(expected);
      expect(editor.snapshot).toMatchObject({ value: before.value, canUndo: before.canUndo, canRedo: before.canRedo });
      // One final selection per dispatch, with no first/last intermediate state.
      expect(seen).toHaveLength(repeat + 1);
      expect(seen[repeat]).toEqual(expected);
    }
  } finally { release(); }
}

const empty = { kind: "range", ranges: [], primaryIndex: null };
const range = (anchor: JSONValue, focus: JSONValue) => ({ kind: "range", ranges: [{ anchor, focus }], primaryIndex: 0 });

test.each([0, 1, 3])("Document select-all covers %i blocks, including text endpoints", (count) => {
  const blocks = [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }, { id: "c", text: "Gamma" }].slice(0, count);
  const editor = createDocumentEditor({ blocks });
  const first = blocks[0], last = blocks.at(-1);
  const expected = first && last ? range({ blockId: first.id, offset: 0 }, { blockId: last.id, offset: last.text.length }) : empty;
  assertSelectionTransition(editor, () => editor.dispatch({ type: "selection.select-all" }), expected);
  expect(editor.selectedBlockIds).toEqual(blocks.map((block) => block.id));
  if (first) {
    editor.dispatch({ type: "text.replace", blockId: first.id, text: "Changed" });
    expect(editor.undo().ok).toBe(true);
    assertSelectionTransition(editor, () => editor.dispatch({ type: "selection.select-all" }), expected);
    expect(editor.redo().ok).toBe(true);
    expect(editor.snapshot.canUndo).toBe(true);
  }
});

test.each([0, 1, 3])("Order select-all covers %i items and preserves history", (count) => {
  const items = [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }].slice(0, count);
  const editor = createOrderEditor({ items });
  const first = items[0], last = items.at(-1);
  const expected = first && last ? range({ itemId: first.id }, { itemId: last.id }) : empty;
  assertSelectionTransition(editor, () => editor.dispatch({ type: "selection.select-all" }), expected);
  expect(editor.selectedItemIds).toEqual(items.map((item) => item.id));
  if (first) {
    editor.dispatch({ type: "item.rename", itemId: first.id, label: "Changed" });
    assertSelectionTransition(editor, () => editor.dispatch({ type: "selection.select-all" }), expected);
    expect(editor.undo().ok).toBe(true);
    assertSelectionTransition(editor, () => editor.dispatch({ type: "selection.select-all" }), expected);
    expect(editor.redo().ok).toBe(true);
  }
});

test.each([[], ["b"], ["b", "a"]].map((visibleIds) => ({ visibleIds })))("Tree select-all uses exactly the visible topology $visibleIds", ({ visibleIds }) => {
  const editor = createTreeEditor({ nodes: [
    { id: "a", parentId: null, label: "A" },
    { id: "hidden", parentId: "a", label: "Hidden" },
    { id: "b", parentId: null, label: "B" },
  ] });
  const topology = { visibleIds };
  const first = visibleIds[0], last = visibleIds.at(-1);
  const expected = first && last ? range({ nodeId: first }, { nodeId: last }) : empty;
  assertSelectionTransition(editor, () => editor.dispatch({ type: "selection.select-all", topology }), expected);
  expect(editor.selectedNodeIdsIn(topology)).toEqual(visibleIds);
  if (visibleIds.includes("a")) {
    // Selection scope remains visible; existing Copy/Cut descendant closure is unchanged.
    expect(editor.copy(topology)?.nodes.map((node) => node.id)).toEqual(["a", "hidden", "b"]);
    expect(editor.cut(topology)?.result.ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    assertSelectionTransition(editor, () => editor.dispatch({ type: "selection.select-all", topology }), expected);
    expect(editor.redo().ok).toBe(true);
  }
});

test.each([
  { rowIds: [], columnIds: ["x"] }, { rowIds: ["a"], columnIds: [] },
  { rowIds: ["b"], columnIds: ["y"] }, { rowIds: ["b", "a"], columnIds: ["y", "x"] },
])("Sheet select-all respects declared axes $rowIds / $columnIds", (topology) => {
  const editor = createSheetEditor({
    columns: [{ id: "x", label: "X" }, { id: "y", label: "Y" }],
    rows: [{ id: "a", cells: { x: 1, y: 2 } }, { id: "b", cells: { x: 3, y: 4 } }, { id: "hidden", cells: { x: 5, y: 6 } }],
  });
  const anchor = topology.rowIds[0] && topology.columnIds[0]
    ? { rowId: topology.rowIds[0], columnId: topology.columnIds[0] } : null;
  const focus = anchor ? { rowId: topology.rowIds.at(-1)!, columnId: topology.columnIds.at(-1)! } : null;
  const expected = { ...(anchor ? range(anchor, focus) : empty), anchor, focus };
  const select = () => editor.dispatch({ type: "selection.select-all", topology });
  assertSelectionTransition(editor, select, expected);
  expect(editor.selectedCellsIn(topology).map(({ rowId, columnId }) => ({ rowId, columnId }))).toEqual(
    topology.rowIds.flatMap((rowId) => topology.columnIds.map((columnId) => ({ rowId, columnId }))),
  );
  if (anchor) {
    expect(editor.dispatch({ type: "selection.fill", value: 0, topology }).ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    assertSelectionTransition(editor, select, expected);
    expect(editor.redo().ok).toBe(true);
  }
});

test("Sheet omitted topology covers all cells; empty documents clear selection", () => {
  const sheet = createSheetEditor({ columns: [{ id: "x", label: "X" }], rows: [{ id: "a", cells: { x: 1 } }, { id: "b", cells: { x: 2 } }] });
  expect(sheet.dispatch({ type: "selection.select-all" }).ok).toBe(true);
  expect(sheet.selectedCells).toHaveLength(2);
  const emptySheet = createSheetEditor({ rows: [], columns: [] });
  assertSelectionTransition(emptySheet, () => emptySheet.dispatch({ type: "selection.select-all" }), { ...empty, anchor: null, focus: null });
  const tree = createTreeEditor({ nodes: [] });
  assertSelectionTransition(tree, () => tree.dispatch({ type: "selection.select-all", topology: { visibleIds: [] } }), empty);
});
