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
