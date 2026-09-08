import type { JSONDocument, JSONValue } from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";
import type { EditingResult, EditingSnapshot } from "../../src/index.js";

/** Test-only calls and observations; profiles keep their own intent/selection types. */
export interface EditingGrammarBinding<Selection extends JSONValue, Clipboard> {
  readonly document: JSONDocument;
  readonly editor: {
    readonly snapshot: EditingSnapshot<Selection>;
    subscribe(listener: (snapshot: EditingSnapshot<Selection>) => void): () => void;
    copy(): Clipboard | null;
    cut(): { readonly clipboard: Clipboard; readonly result: EditingResult<Selection> } | null;
    undo(): EditingResult<Selection>;
    redo(): EditingResult<Selection>;
  };
  selectStart(): EditingResult<Selection>;
  extend(): EditingResult<Selection>;
  assertSelected(selection: Selection): void;
  readonly clipboard: Clipboard;
  edit(): EditingResult<Selection>;
  assertEdited(snapshot: EditingSnapshot<Selection>): void;
  paste(): EditingResult<Selection>;
  assertPasted(snapshot: EditingSnapshot<Selection>): void;
  assertCut(snapshot: EditingSnapshot<Selection>): void;
  reject(): EditingResult<Selection>;
  readonly rejectionCode: string;
  noop(): EditingResult<Selection>;
  removeExternal(): void;
  assertExternal(selection: Selection): void;
}

function content<Selection extends JSONValue>(snapshot: EditingSnapshot<Selection>) {
  return { value: snapshot.value, selection: snapshot.selection };
}

/** One local-history step: coherent publication, exact restoration, retained result. */
function roundTrip<Selection extends JSONValue, Clipboard>(
  binding: EditingGrammarBinding<Selection, Clipboard>,
  action: () => EditingResult<Selection>,
  assertAfter: (snapshot: EditingSnapshot<Selection>) => void,
) {
  const { editor, document } = binding;
  const before = structuredClone(content(editor.snapshot));
  const published: EditingSnapshot<Selection>[] = [];
  const release = editor.subscribe((snapshot) => published.push(snapshot));
  try {
    const result = action();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.code);
    const after = structuredClone(content(result.snapshot));
    expect(after.value).not.toEqual(before.value);
    assertAfter(result.snapshot);
    expect(document.value).toEqual(after.value);
    expect(result.snapshot).toMatchObject({ ...after, canUndo: true, canRedo: false });
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject(result.snapshot);
    expect(editor.snapshot).toMatchObject(result.snapshot);

    const undone = editor.undo();
    expect(undone).toMatchObject({ ok: true, snapshot: { ...before, canUndo: false, canRedo: true } });
    expect(content(editor.snapshot)).toEqual(before);
    expect(document.value).toEqual(before.value);
    const redone = editor.redo();
    expect(redone).toMatchObject({ ok: true, snapshot: { ...after, canUndo: true, canRedo: false } });
    expect(content(editor.snapshot)).toEqual(after);
    expect(document.value).toEqual(after.value);
    expect(published.map(content)).toEqual([after, before, after]);
    expect(content(result.snapshot)).toEqual(after);
    expect(published[0]).toMatchObject({ ...after, canUndo: true, canRedo: false });
  } finally {
    release();
  }
}

export function editingGrammar<Selection extends JSONValue, Clipboard>(
  profile: string,
  create: () => EditingGrammarBinding<Selection, Clipboard>,
) {
  describe(`editing grammar / ${profile}`, () => {
    test.each(["empty", "undo", "redo"] as const)("EG-SELECT / extend preserves targets and %s history", (history) => {
      const binding = create();
      const { editor, document } = binding;
      const initial = structuredClone(content(editor.snapshot));
      if (history !== "empty") expect(binding.edit().ok).toBe(true);
      const edited = structuredClone(content(editor.snapshot));
      if (history === "redo") expect(editor.undo().ok).toBe(true);
      const before = structuredClone(editor.snapshot);
      expect(binding.selectStart().ok).toBe(true);
      expect(binding.extend().ok).toBe(true);
      binding.assertSelected(editor.snapshot.selection);
      expect(document.value).toEqual(before.value);
      expect(editor.snapshot).toMatchObject({ value: before.value, canUndo: before.canUndo, canRedo: before.canRedo });
      if (history === "undo") {
        expect(editor.undo().ok).toBe(true);
        expect(content(editor.snapshot)).toEqual(initial);
      } else if (history === "redo") {
        expect(editor.redo().ok).toBe(true);
        expect(content(editor.snapshot)).toEqual(edited);
      }
    });

    test("EG-COPY / repeated structured copy preserves state and redo", () => {
      const binding = create();
      const { editor } = binding;
      expect(binding.edit().ok).toBe(true);
      const edited = structuredClone(content(editor.snapshot));
      expect(editor.undo().ok).toBe(true);
      expect(binding.selectStart().ok).toBe(true);
      expect(binding.extend().ok).toBe(true);
      const before = structuredClone(editor.snapshot);
      const published: EditingSnapshot<Selection>[] = [];
      const release = editor.subscribe((snapshot) => published.push(snapshot));
      try {
        expect(editor.copy()).toEqual(binding.clipboard);
        expect(editor.copy()).toEqual(binding.clipboard);
        expect(editor.snapshot).toMatchObject(before);
        expect(binding.document.value).toEqual(before.value);
        expect(published).toEqual([]);
        expect(editor.redo().ok).toBe(true);
        expect(content(editor.snapshot)).toEqual(edited);
      } finally { release(); }
    });

    test("EG-EDIT EG-HISTORY EG-RESULT / edit → undo → redo", () => {
      const binding = create();
      roundTrip(binding, binding.edit, binding.assertEdited);
    });

    test("EG-PASTE EG-HISTORY EG-RESULT / profile paste → undo → redo", () => {
      const binding = create();
      expect(binding.selectStart().ok).toBe(true);
      expect(binding.extend().ok).toBe(true);
      roundTrip(binding, binding.paste, binding.assertPasted);
    });

    test("EG-CUT EG-HISTORY / capture target → remove → undo → redo", () => {
      const binding = create();
      expect(binding.selectStart().ok).toBe(true);
      expect(binding.extend().ok).toBe(true);
      roundTrip(binding, () => {
        const cut = binding.editor.cut();
        expect(cut).not.toBeNull();
        expect(cut?.clipboard).toEqual(binding.clipboard);
        return cut!.result;
      }, binding.assertCut);
    });

    test.each(["undo", "redo"] as const)("EG-EDIT / rejection preserves %s and publishes nothing", (history) => {
      const binding = create();
      const initial = structuredClone(content(binding.editor.snapshot));
      expect(binding.edit().ok).toBe(true);
      const edited = structuredClone(content(binding.editor.snapshot));
      if (history === "redo") expect(binding.editor.undo().ok).toBe(true);
      const before = structuredClone(binding.editor.snapshot);
      const published: EditingSnapshot<Selection>[] = [];
      const release = binding.editor.subscribe((snapshot) => published.push(snapshot));
      try {
        expect(binding.reject()).toMatchObject({ ok: false, code: binding.rejectionCode });
        expect(binding.editor.snapshot).toMatchObject(before);
        expect(binding.document.value).toEqual(before.value);
        expect(published).toEqual([]);
        expect(binding.editor[history]().ok).toBe(true);
        expect(content(binding.editor.snapshot)).toEqual(history === "undo" ? initial : edited);
      } finally { release(); }
    });

    test("EG-HISTORY / no-op preserves redo without recording a step", () => {
      const binding = create();
      expect(binding.edit().ok).toBe(true);
      const edited = structuredClone(content(binding.editor.snapshot));
      expect(binding.editor.undo().ok).toBe(true);
      const before = structuredClone(binding.editor.snapshot);
      expect(binding.noop().ok).toBe(true);
      expect(binding.editor.snapshot).toMatchObject({ value: before.value, canUndo: false, canRedo: true });
      expect(binding.editor.redo().ok).toBe(true);
      expect(content(binding.editor.snapshot)).toEqual(edited);
    });

    test.each([false, true])("EG-TARGET EG-HISTORY / external deletion, observed=%s", (observed) => {
      const binding = create();
      expect(binding.edit().ok).toBe(true);
      expect(binding.selectStart().ok).toBe(true);
      const published: EditingSnapshot<Selection>[] = [];
      const release = observed ? binding.editor.subscribe((snapshot) => published.push(snapshot)) : () => {};
      try {
        binding.removeExternal();
        const after = binding.editor.snapshot;
        binding.assertExternal(after.selection);
        expect(after).toMatchObject({ value: binding.document.value, canUndo: false, canRedo: false });
        if (observed) {
          expect(published).toHaveLength(1);
          expect(published[0]).toMatchObject(after);
        }
        const saved = structuredClone(content(after));
        expect(binding.editor.undo().ok).toBe(false);
        expect(binding.editor.redo().ok).toBe(false);
        expect(content(binding.editor.snapshot)).toEqual(saved);
      } finally { release(); }
    });
  });
}
