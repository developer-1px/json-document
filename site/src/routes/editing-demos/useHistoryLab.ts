import { useState } from "react";
import { type BlockDocument } from "@interactive-os/json-document-editing";
import { useDocumentEditor, useEditing } from "@interactive-os/json-document-react";
import { historyAffordance } from "@interactive-os/json-document-affordance";

const historyLabDocument: BlockDocument = {
  blocks: [
    { id: "bravo", text: "Another block" },
    { id: "alpha", text: "Original text" },
  ],
};

/** Owns the History page's edit/undo/redo command observation. */
export function useHistoryLab() {
  const editor = useDocumentEditor(historyLabDocument);
  const focus = editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus;
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedBlockIds,
    focusKey: focus?.blockId ?? null,
    textOffset: focus?.offset ?? null,
    onSelect: (blockId, mode) => editor.dispatch({ type: "selection.set", blockId, mode }),
  });
  const snapshot = editing.snapshot;
  const [lastCall, setLastCall] = useState("아직 편집하지 않았습니다");
  function edit() {
    editor.dispatch({ type: "text.replace", blockId: "bravo", text: "Edited text", offset: 6 });
    setLastCall("dispatch({ type: \"text.replace\", blockId: \"bravo\", ... })");
  }
  function undo() { editor.undo(); setLastCall("editor.undo()"); }
  function redo() { editor.redo(); setLastCall("editor.redo()"); }
  return {
    commands: historyAffordance(snapshot).hand,
    document: snapshot.value as BlockDocument,
    edit,
    editing,
    lastCall,
    redo,
    snapshot,
    undo,
  };
}
