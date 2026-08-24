import { useState } from "react";
import { type BlockDocument, type DocumentClipboard } from "@interactive-os/json-document-editing";
import { useDocumentEditor, useEditing } from "@interactive-os/json-document-react";

const clipboardLabDocument: BlockDocument = {
  blocks: [
    { id: "alpha", text: "Copy this block" },
    { id: "bravo", text: "Paste after this block" },
    { id: "charlie", text: "The document receives cloned blocks" },
  ],
};

/** Owns the Clipboard page's payload and copy/cut/paste command observation. */
export function useClipboardLab() {
  const editor = useDocumentEditor(clipboardLabDocument);
  const [clipboard, setClipboard] = useState<DocumentClipboard | null>(null);
  const [lastCall, setLastCall] = useState("블록을 선택한 뒤 copy 또는 cut을 실행합니다.");
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedBlockIds,
    focusKey: editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.blockId ?? null,
    onSelect: (blockId) => {
      editor.dispatch({ type: "selection.set", blockId });
      setLastCall(`dispatch({ type: "selection.set", blockId: "${blockId}" })`);
    },
    operationFromEvent: () => "replace",
  });
  function copy() {
    const payload = editor.copy();
    if (payload) { setClipboard(payload); setLastCall("editor.copy()"); }
  }
  function cut() {
    const result = editor.cut();
    if (result) { setClipboard(result.clipboard); setLastCall("editor.cut()"); }
  }
  function paste() {
    if (!clipboard) return;
    editor.dispatch({ type: "clipboard.paste", clipboard });
    setLastCall("dispatch({ type: \"clipboard.paste\", clipboard })");
  }
  return { clipboard, copy, cut, editing, lastCall, paste, snapshot: editing.snapshot };
}
