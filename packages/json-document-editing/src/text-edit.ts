import type { TextEditor } from "./text.js";

/** Exact source edit against the text the caller observed. Empty before appends. */
export interface TextEdit {
  readonly source: string;
  readonly before: string;
  readonly after: string;
}

/** Apply one unambiguous edit through the editor's selection and undo history. */
export function applyTextEdit(editor: TextEditor, edit: TextEdit) {
  if (editor.text !== edit.source) return { ok: false, code: "text.stale-source" } as const;
  const start = edit.before ? edit.source.indexOf(edit.before) : edit.source.length;
  if (start < 0) return { ok: false, code: "text.match-not-found" } as const;
  if (edit.before && edit.source.indexOf(edit.before, start + 1) >= 0) return { ok: false, code: "text.ambiguous-match" } as const;
  const value = edit.source.slice(0, start) + edit.after + edit.source.slice(start + edit.before.length);
  const caret = start + edit.after.length;
  return editor.replace(value, { anchor: caret, focus: caret });
}

/** Move an exact passage before/after a unique anchor; empty anchor means start/end. */
export interface TextMove {
  readonly source: string;
  readonly text: string;
  readonly anchor: string;
  readonly placement: "before" | "after";
}

/** Relocate source bytes in one undoable edit, without regenerating their content. */
export function moveText(editor: TextEditor, move: TextMove) {
  if (editor.text !== move.source) return { ok: false, code: "text.stale-source" } as const;
  if (!move.text || (move.placement !== "before" && move.placement !== "after")) return { ok: false, code: "text.invalid-move" } as const;
  const from = move.source.indexOf(move.text);
  if (from < 0) return { ok: false, code: "text.match-not-found" } as const;
  if (move.source.indexOf(move.text, from + 1) >= 0) return { ok: false, code: "text.ambiguous-match" } as const;
  const end = from + move.text.length;
  let destination = move.placement === "before" ? 0 : move.source.length;
  if (move.anchor) {
    const anchor = move.source.indexOf(move.anchor);
    if (anchor < 0) return { ok: false, code: "text.anchor-not-found" } as const;
    if (move.source.indexOf(move.anchor, anchor + 1) >= 0) return { ok: false, code: "text.ambiguous-anchor" } as const;
    if (anchor < end && anchor + move.anchor.length > from) return { ok: false, code: "text.overlapping-move" } as const;
    destination = anchor + (move.placement === "after" ? move.anchor.length : 0);
  }
  const remaining = move.source.slice(0, from) + move.source.slice(end);
  const target = destination > from ? destination - move.text.length : destination;
  const value = remaining.slice(0, target) + move.text + remaining.slice(target);
  return editor.replace(value, { anchor: target, focus: target + move.text.length });
}
