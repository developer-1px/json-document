import { CopyPlus, Redo2, Trash2, Undo2 } from "lucide-react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import type { ObjectEditor } from "@interactive-os/json-document-editing";
import { Command } from "@interactive-os/json-document-ui-primitives-react";

/** Canonical Object editing commands; Hands may inject their gesture cancellation lifecycle. */
export function CanvasEditingCommands({ editor, objectIds, onUndo, onRedo, onDuplicate, onRemove, onResult }: {
  readonly editor: ObjectEditor;
  readonly objectIds?: readonly string[];
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly onDuplicate?: () => void;
  readonly onRemove?: () => void;
  readonly onResult?: (result: { readonly ok: boolean }) => void;
}) {
  const snapshot = useEditingSnapshot(editor);
  const keys = snapshot.selection.keys.filter(key => !objectIds || objectIds.includes(key));
  return <>
    <Command label="실행 취소" disabled={!snapshot.canUndo} onClick={onUndo ?? (() => { const result = editor.undo(); onResult?.(result); })}><Undo2 aria-hidden="true" size={16} /></Command>
    <Command label="다시 실행" disabled={!snapshot.canRedo} onClick={onRedo ?? (() => { const result = editor.redo(); onResult?.(result); })}><Redo2 aria-hidden="true" size={16} /></Command>
    <Command label="복제" disabled={!keys.length} onClick={onDuplicate ?? (() => { const result = editor.dispatch({ type: "object.duplicate", objectIds: keys }); onResult?.(result); })}><CopyPlus aria-hidden="true" size={16} /></Command>
    <Command label="삭제" disabled={!keys.length} onClick={onRemove ?? (() => { const result = editor.dispatch({ type: "object.remove", objectIds: keys }); onResult?.(result); })}><Trash2 aria-hidden="true" size={16} /></Command>
  </>;
}
