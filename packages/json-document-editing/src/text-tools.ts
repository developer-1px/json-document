import { applyTextEdit, moveText } from "./text-edit.js";
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
        return { ok: true, source, selection: editor.snapshot.selection, canUndo: editor.snapshot.canUndo, canRedo: editor.snapshot.canRedo };
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
    {
      name: "move_document", description: "Reorder an existing passage without rewriting it. Read first. text and anchor must each match exactly once and not overlap. Move text before/after anchor. Empty anchor means document start (before) or end (after). Include the paragraph/list separators in text and anchor as needed to preserve Markdown layout. Use this tool for order changes instead of edit_document.",
      parameters: { type: "object", properties: { text: { type: "string" }, anchor: { type: "string" }, placement: { type: "string", enum: ["before", "after"] } }, required: ["text", "anchor", "placement"], additionalProperties: false },
      execute: (args: unknown): unknown => {
        if (!args || typeof args !== "object" || !("text" in args) || !("anchor" in args) || !("placement" in args) || typeof args.text !== "string" || typeof args.anchor !== "string" || (args.placement !== "before" && args.placement !== "after")) return { ok: false, code: "text.invalid-move" };
        if (source === undefined) return { ok: false, code: "text.read-required" };
        const result = moveText(editor, { source, text: args.text, anchor: args.anchor, placement: args.placement });
        if (!result.ok) return result;
        source = editor.text;
        return { ok: true, source };
      },
    },
    {
      name: "find_in_document", description: "Find literal text in the current document. Returns matching source offsets and nearby context. Does not modify the document.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
      execute: (args: unknown): unknown => {
        if (!args || typeof args !== "object" || !("query" in args) || typeof args.query !== "string" || !args.query) return { ok: false, code: "text.invalid-query" };
        const text = editor.text;
        const matches: Array<{ from: number; to: number; context: string }> = [];
        let from = text.indexOf(args.query);
        while (from >= 0 && matches.length < 100) {
          matches.push({ from, to: from + args.query.length, context: text.slice(Math.max(0, from - 80), from + args.query.length + 80) });
          from = text.indexOf(args.query, from + 1);
        }
        return { ok: true, matches, truncated: from >= 0 };
      },
    },
    {
      name: "read_selection", description: "Read the user's current document selection, including source offsets. Empty text means no range is selected. Does not alter the selection.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      execute: (_args: unknown): unknown => ({ ok: true, text: editor.copy(), selection: editor.snapshot.selection }),
    },
    ...(["undo", "redo"] as const).map(action => ({
      name: `${action}_document`, description: `${action === "undo" ? "Undo" : "Redo"} one document edit when the user requests it. Read the current document first. Includes both manual and agent edits.`,
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      execute: (_args: unknown): unknown => {
        if (source === undefined) return { ok: false, code: "text.read-required" };
        if (editor.text !== source) return { ok: false, code: "text.stale-source" };
        if (!(action === "undo" ? editor.snapshot.canUndo : editor.snapshot.canRedo)) return { ok: false, code: "text.history-unavailable" };
        const result = editor[action]();
        if (!result.ok) return result;
        source = editor.text;
        return { ok: true, source, canUndo: editor.snapshot.canUndo, canRedo: editor.snapshot.canRedo };
      },
    })),
  ];
}
