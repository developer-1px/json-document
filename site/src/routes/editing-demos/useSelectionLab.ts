import { useState } from "react";
import { type BlockDocument, type DocumentIntent } from "@interactive-os/json-document-editing";
import { useDocumentEditor, useEditing } from "@interactive-os/json-document-react";

export const selectionLabDocument: BlockDocument = {
  blocks: [
    { id: "alpha", text: "Anchor" },
    { id: "bravo", text: "Middle" },
    { id: "charlie", text: "Focus" },
  ],
};

/** Owns the Selection page's mode and dispatch observation state. */
export function useSelectionLab() {
  const editor = useDocumentEditor(selectionLabDocument);
  const [mode, setMode] = useState<"replace" | "extend" | "toggle">("replace");
  const [lastIntent, setLastIntent] = useState<DocumentIntent | null>(null);
  const [lastResult, setLastResult] = useState<{ readonly ok: boolean; readonly code?: string } | null>(null);
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedBlockIds,
    focusKey: editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.blockId ?? null,
    onSelect: (blockId, nextMode) => {
      const intent: DocumentIntent = { type: "selection.set", blockId, mode: nextMode };
      const result = editor.dispatch(intent);
      setLastIntent(intent);
      setLastResult(result.ok ? { ok: true } : { ok: false, code: result.code });
    },
    operationFromEvent: () => mode,
  });
  return { editing, lastIntent, lastResult, mode, setMode, snapshot: editing.snapshot };
}
