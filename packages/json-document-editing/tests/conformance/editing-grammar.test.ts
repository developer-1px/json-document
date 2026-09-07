import { createJSONDocument } from "@interactive-os/json-document";
import { expect } from "vitest";
import { createDocumentEditor, createSheetEditor, type DocumentSelection, type SheetSelection } from "../../src/index.js";
import { editingGrammar } from "./editing-grammar.js";

const blocks = [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }, { id: "c", text: "Gamma" }];
function blockRange(anchor: string, focus = anchor, offset = 1): DocumentSelection {
  return { kind: "range", ranges: [{ anchor: { blockId: anchor, offset }, focus: { blockId: focus, offset } }], primaryIndex: 0 };
}

editingGrammar("Document / block range / local history", () => {
  const document = createJSONDocument({ blocks });
  let id = 0;
  const editor = createDocumentEditor(document, { createId: () => `new-${++id}` });
  const clipboard = { type: "application/vnd.interactive-os.blocks+json" as const, blocks, text: "Alpha\nBeta\nGamma" };
  return {
    document, editor, clipboard,
    selectStart: () => editor.dispatch({ type: "selection.set", blockId: "a", offset: 0 }),
    extend: () => editor.dispatch({ type: "selection.set", blockId: "c", offset: 1, mode: "extend" }),
    assertSelected(selection) {
      expect(selection).toEqual({ kind: "range", primaryIndex: 0, ranges: [{
        anchor: { blockId: "a", offset: 0 }, focus: { blockId: "c", offset: 1 },
      }] });
      expect(editor.selectedBlockIds).toEqual(["a", "b", "c"]);
    },
    edit: () => editor.dispatch({ type: "text.replace", blockId: "c", text: "Changed" }),
    assertEdited(snapshot) {
      expect(snapshot.value).toEqual({ blocks: [blocks[0], blocks[1], { id: "c", text: "Changed" }] });
      expect(snapshot.selection).toEqual(blockRange("c", "c", 7));
    },
    paste: () => editor.dispatch({ type: "clipboard.paste", clipboard }),
    assertPasted(snapshot) {
      // Fixed injected allocator: existing IDs survive, every inserted block is fresh.
      expect(snapshot.value).toEqual({ blocks: [...blocks,
        { id: "new-1", text: "Alpha" }, { id: "new-2", text: "Beta" }, { id: "new-3", text: "Gamma" },
      ] });
      expect(snapshot.selection).toEqual({ kind: "range", primaryIndex: 0, ranges: [
        { anchor: { blockId: "new-1", offset: 0 }, focus: { blockId: "new-1", offset: 0 } },
        { anchor: { blockId: "new-2", offset: 0 }, focus: { blockId: "new-2", offset: 0 } },
        { anchor: { blockId: "new-3", offset: 0 }, focus: { blockId: "new-3", offset: 0 } },
      ] });
    },
    assertCut(snapshot) {
      expect(snapshot.value).toEqual({ blocks: [] });
      expect(snapshot.selection).toEqual({ kind: "range", ranges: [], primaryIndex: null });
    },
    reject: () => editor.dispatch({ type: "text.replace", blockId: "missing", text: "rejected" }),
    rejectionCode: "text.block-not-found",
    noop: () => editor.dispatch({ type: "text.replace", blockId: "a", text: "Alpha" }),
    removeExternal() { expect(document.commit([{ op: "remove", path: "/blocks/0" }]).ok).toBe(true); },
    assertExternal(selection) { expect(selection).toEqual({ kind: "range", ranges: [], primaryIndex: null }); },
  };
});

const sheet = {
  columns: [{ id: "name", label: "Name" }, { id: "value", label: "Value" }],
  rows: [
    { id: "a", cells: { name: "Alpha", value: 1 } },
    { id: "b", cells: { name: "Beta", value: 2 } },
    { id: "c", cells: { name: "Gamma", value: 3 } },
  ],
};
function cellsRange(anchorRow: string, focusRow = anchorRow, columnId = "name"): SheetSelection {
  const anchor = { rowId: anchorRow, columnId };
  const focus = { rowId: focusRow, columnId };
  return { kind: "range", anchor, focus, ranges: [{ anchor, focus }], primaryIndex: 0 };
}

editingGrammar("Sheet / primary rectangle / local history", () => {
  const document = createJSONDocument(sheet);
  const editor = createSheetEditor(document);
  return {
    document, editor,
    clipboard: { type: "application/vnd.interactive-os.sheet+json" as const, cells: [["Alpha"], ["Beta"], ["Gamma"]], text: "Alpha\nBeta\nGamma" },
    selectStart: () => editor.dispatch({ type: "selection.set", rowId: "a", columnId: "name" }),
    extend: () => editor.dispatch({ type: "selection.set", rowId: "c", columnId: "name", mode: "extend" }),
    assertSelected(selection) {
      expect(selection).toEqual(cellsRange("a", "c"));
      expect(editor.selectedCells).toEqual([
        { rowId: "a", columnId: "name", value: "Alpha" },
        { rowId: "b", columnId: "name", value: "Beta" },
        { rowId: "c", columnId: "name", value: "Gamma" },
      ]);
    },
    edit: () => editor.dispatch({ type: "cell.commit", rowId: "c", columnId: "value", value: 30 }),
    assertEdited(snapshot) {
      expect(snapshot.value).toEqual({ ...sheet, rows: [sheet.rows[0], sheet.rows[1], { id: "c", cells: { name: "Gamma", value: 30 } }] });
      expect(snapshot.selection).toEqual(cellsRange("c", "c", "value"));
    },
    // The selected rectangle is a:c; paste starts at focus c and leaves a:b intact.
    paste: () => editor.dispatch({ type: "clipboard.paste", clipboard: {
      type: "application/vnd.interactive-os.sheet+json", cells: [["Pasted"]], text: "Pasted",
    } }),
    assertPasted(snapshot) {
      expect(snapshot.value).toEqual({ ...sheet, rows: [sheet.rows[0], sheet.rows[1], { id: "c", cells: { name: "Pasted", value: 3 } }] });
      expect(snapshot.selection).toEqual(cellsRange("c"));
    },
    assertCut(snapshot) {
      expect(snapshot.value).toEqual({ ...sheet, rows: [
        { id: "a", cells: { name: null, value: 1 } },
        { id: "b", cells: { name: null, value: 2 } },
        { id: "c", cells: { name: null, value: 3 } },
      ] });
      expect(snapshot.selection).toEqual(cellsRange("a", "c"));
    },
    reject: () => editor.dispatch({ type: "clipboard.paste", clipboard: {
      type: "application/vnd.interactive-os.sheet+json", cells: [[1, 2, 3]], text: "1\t2\t3",
    } }),
    rejectionCode: "paste.out-of-bounds",
    noop: () => editor.dispatch({ type: "cell.commit", rowId: "a", columnId: "name", value: "Alpha" }),
    removeExternal() { expect(document.commit([{ op: "remove", path: "/rows/0" }]).ok).toBe(true); },
    assertExternal(selection) { expect(selection).toEqual({ kind: "range", anchor: null, focus: null, ranges: [], primaryIndex: null }); },
  };
});
