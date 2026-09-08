import { createJSONDocument } from "@interactive-os/json-document";
import { createDocumentEditor, createOrderEditor, type OrderDocument } from "@interactive-os/json-document-editing";
import { createKeySelectionFamily, emptyKeySelection, type KeySelectionContext } from "@interactive-os/json-document-selection";
import { describe, expect, test } from "vitest";
import { createGestureSession, createRenameSession, selectAllAffordance, type GestureCancelReason } from "../../src/index.js";

describe("editing grammar / input mapping", () => {
  test.each(["metaKey", "ctrlKey"] as const)("EG-SELECT / %s+A preserve profile retains all on repeat", (modifier) => {
    const editor = createDocumentEditor({ blocks: [{ id: "a", text: "A" }, { id: "b", text: "B" }] });
    const stroke = { key: "A", metaKey: false, ctrlKey: false, [modifier]: true };
    for (const allSelected of [false, true, true]) {
      const hand = selectAllAffordance(stroke, { allSelected }, { repeat: "preserve" }).hand;
      expect(hand).toEqual({ type: "select-all" });
      if (hand?.type === "select-all") editor.dispatch({ type: "selection.select-all" });
      expect(editor.selectedBlockIds).toEqual(["a", "b"]);
      expect(editor.snapshot).toMatchObject({ canUndo: false, canRedo: false });
    }
    expect(selectAllAffordance(stroke, { allSelected: true }, { repeat: "toggle" }).hand).toEqual({ type: "clear" });
    expect(selectAllAffordance({ ...stroke, key: "x" }, { allSelected: true }, { repeat: "preserve" }).hand).toBeNull();
    expect(selectAllAffordance({ key: "a", metaKey: false, ctrlKey: false }, { allSelected: true }, { repeat: "preserve" }).hand).toBeNull();
  });

  test("EG-COMMIT / rejection retains draft; retry finishes once; cancel never commits", () => {
    const attempts: string[] = [];
    const finished: string[] = [];
    const cancelled: string[] = [];
    const published: unknown[] = [];
    const session = createRenameSession<string>({
      tryCommit(key, draft) { attempts.push(`${key}:${draft}`); return draft.length > 0; },
      onFinish: (key) => finished.push(key),
      onCancel: (key, draft) => cancelled.push(`${key}:${draft}`),
      onSnapshot: (snapshot) => published.push(snapshot),
    });
    session.begin("a", "Alpha");
    session.update("");
    expect(session.handleKey("Enter")).toBe(true);
    session.commit();
    expect(session.getSnapshot()).toEqual({ key: "a", draft: "" });
    expect(published).toEqual([{ key: "a", draft: "Alpha" }, { key: "a", draft: "" }]);
    expect(finished).toEqual([]);
    session.update("Beta");
    expect(session.handleKey("Enter")).toBe(true);
    session.commit();
    expect(session.getSnapshot()).toBeNull();
    expect(attempts).toEqual(["a:", "a:", "a:Beta"]);
    expect(finished).toEqual(["a"]);
    session.begin("b", "Draft");
    expect(session.handleKey("Escape")).toBe(true);
    expect(session.getSnapshot()).toBeNull();
    expect(cancelled).toEqual(["b:Draft"]);
    expect(finished).toEqual(["a", "b"]);
    expect(attempts).toHaveLength(3);
  });

  test("rename callback contracts remain mutually exclusive and synchronous", () => {
    const commits: string[] = [];
    const legacy = createRenameSession<string>({ onCommit: (_key, draft) => commits.push(draft) });
    legacy.begin("a", "Alpha");
    legacy.commit();
    expect(commits).toEqual(["Alpha"]);
    expect(legacy.getSnapshot()).toBeNull();
    // These calls are checked by the owning package's test typecheck.
    // @ts-expect-error Select exactly one commit contract.
    createRenameSession<string>({ onCommit: () => {}, tryCommit: () => true });
    // @ts-expect-error A commit contract is required.
    createRenameSession<string>({});
    // @ts-expect-error Result-aware commit is synchronous.
    createRenameSession<string>({ tryCommit: async () => true });
  });

  test("EG-COMMIT / Order rejection preserves value, selection and history until retry", () => {
    const initial: OrderDocument = { items: [{ id: "a", label: "Alpha" }] };
    const editor = createOrderEditor(createJSONDocument(initial, {
      validate: (candidate) => (candidate as OrderDocument).items.every((item) => item.label.length > 0)
        ? { ok: true } : { ok: false, code: "schema_violation" },
    }));
    const before = editor.snapshot;
    let finished = 0;
    const rename = createRenameSession<string>({
      tryCommit: (itemId, label) => editor.dispatch({ type: "item.rename", itemId, label }).ok,
      onFinish: () => { finished++; },
    });
    rename.begin("a", "Alpha");
    rename.update("");
    rename.handleKey("Enter");
    expect(editor.snapshot).toEqual(before);
    expect(rename.getSnapshot()).toEqual({ key: "a", draft: "" });
    expect(finished).toBe(0);
    rename.update("Beta");
    rename.handleKey("Enter");
    expect(rename.getSnapshot()).toBeNull();
    expect(finished).toBe(1);
    expect(editor.snapshot).toMatchObject({ value: { items: [{ id: "a", label: "Beta" }] }, canUndo: true });
    expect(editor.undo()).toMatchObject({ ok: true, snapshot: { value: initial, selection: before.selection, canUndo: false } });
  });

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
