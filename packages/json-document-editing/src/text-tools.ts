import { applyTextEdit } from "./text-edit.js";
import type { TextEditor } from "./text.js";

/** Model-facing tools bound to one editor and its last observed source. */
export function createTextEditorTools(editor: TextEditor) {
  let source: string | undefined;
  return [
    {
      name: "read_document", description: "Read the current Markdown document before editing.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      execute: (_args: unknown): unknown => {
        source = editor.text;
        return { ok: true, source, selection: editor.snapshot.selection };
      },
    },
    {
      name: "edit_document", description: "Replace one exact unique Markdown passage. Use an empty before to append; after is the replacement Markdown. Read the document first. Preserve unrelated content.",
      parameters: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } }, required: ["before", "after"], additionalProperties: false },
      execute: (args: unknown): unknown => {
        if (!args || typeof args !== "object" || !("before" in args) || !("after" in args) || typeof args.before !== "string" || typeof args.after !== "string") return { ok: false, code: "text.invalid-edit" };
        if (source === undefined) return { ok: false, code: "text.read-required" };
        const result = applyTextEdit(editor, { source, before: args.before, after: args.after });
        if (!result.ok) return result;
        source = editor.text;
        return { ok: true, source };
      },
    },
  ];
}
