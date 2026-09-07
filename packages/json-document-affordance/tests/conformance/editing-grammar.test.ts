import { createDocumentEditor } from "@interactive-os/json-document-editing";
import { createKeySelectionFamily, emptyKeySelection, type KeySelectionContext } from "@interactive-os/json-document-selection";
import { describe, expect, test } from "vitest";
import { createGestureSession, selectAllAffordance, type GestureCancelReason } from "../../src/index.js";

describe("editing grammar / input mapping", () => {
  test.each(["metaKey", "ctrlKey"] as const)("EG-SELECT / %s+A toggle profile sends clear as a distinct intent", (modifier) => {
    const context: KeySelectionContext = { keys: ["a", "b"], universe: "visible:v1", universeMismatch: "clear" };
    const family = createKeySelectionFamily();
    const stroke = { key: "a", metaKey: false, ctrlKey: false, [modifier]: true };
    expect(selectAllAffordance(stroke, { allSelected: false }).hand).toEqual({ type: "select-all" });
    const selected = family.transition(emptyKeySelection(), { type: "select-all", universe: context.universe }, context).state;
    expect(family.targets(selected, context)).toEqual(["a", "b"]);
    const second = selectAllAffordance(stroke, { allSelected: true }).hand;
    expect(second).toEqual({ type: "clear" });
    if (second?.type !== "clear") throw new Error("Expected the toggle profile to emit clear");
    expect(family.targets(family.transition(selected, second, context).state, context)).toEqual([]);
    expect(selectAllAffordance({ key: "a", metaKey: false, ctrlKey: false }, { allSelected: false }).hand).toBeNull();
  });

  test.each(["cancel", "pointer-cancel", "lost-capture"] satisfies GestureCancelReason[])("EG-GESTURE / %s discards preview; commit moves once", (reason) => {
    const initial = { blocks: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }] };
    const editor = createDocumentEditor(initial);
    // Navigation changes the editing target without moving content.
    expect(editor.dispatch({ type: "selection.set", blockId: "b" }).ok).toBe(true);
    expect(editor.snapshot.value).toEqual(initial);
    expect(editor.snapshot.canUndo).toBe(false);
    const before = structuredClone(editor.snapshot);
    const published: unknown[] = [];
    const release = editor.subscribe((snapshot) => published.push(snapshot));
    const gesture = createGestureSession<{ type: "block-move"; direction: -1 | 1 }>({
      onCommit(preview) { expect(editor.dispatch({ type: "selection.move", direction: preview.direction }).ok).toBe(true); },
    });
    try {
      gesture.begin({ type: "block-move", direction: -1 });
      gesture.preview({ type: "block-move", direction: 1 });
      gesture.preview({ type: "block-move", direction: -1 });
      expect(editor.snapshot).toMatchObject(before);
      gesture.cancel(reason);
      expect(gesture.getActive()).toBeNull();
      expect(gesture.commit()).toBeNull();
      expect(editor.snapshot).toMatchObject(before);
      expect(published).toEqual([]);

      gesture.begin({ type: "block-move", direction: -1 });
      gesture.preview({ type: "block-move", direction: 1 });
      expect(editor.snapshot).toMatchObject(before);
      expect(gesture.commit()).toEqual({ type: "block-move", direction: 1 });
      expect(gesture.getActive()).toBeNull();
      expect(gesture.commit()).toBeNull();
      expect(published).toHaveLength(1);
      expect(editor.snapshot.value).toEqual({ blocks: [initial.blocks[0], initial.blocks[2], initial.blocks[1]] });
      expect(editor.selectedBlockIds).toEqual(["b"]);
      expect(editor.undo().ok).toBe(true);
      expect(editor.snapshot).toMatchObject({ value: before.value, selection: before.selection, canUndo: false, canRedo: true });
    } finally { release(); }
  });
});
