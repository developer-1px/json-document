import { useCallback, useState } from "react";
import type { JSONPatchOperation } from "@interactive-os/json-document";
import type { RichTextDocument, RichTextEditor, RichTextPoint } from "@interactive-os/json-document-rich-text";
import { findRichTextDemoTextNode } from "./richTextDemoQuery";

/** Owns sample Intent commands and action/Patch observation for the Rich Text Demo Host. */
export function useRichTextDemoCommands(editor: RichTextEditor) {
  const [lastPatch, setLastPatch] = useState<ReadonlyArray<JSONPatchOperation>>([]);
  const [lastAction, setLastAction] = useState("selection.ready");

  const onSurfaceAction = useCallback((action: string, result?: ReturnType<RichTextEditor["dispatch"]>) => {
    setLastAction(action);
    if (result?.ok && result.change) setLastPatch(result.change.applied);
  }, []);

  function remember(action: string, result: ReturnType<RichTextEditor["dispatch"]>) {
    setLastAction(result.ok ? action : result.code);
    if (result.ok && result.change) setLastPatch(result.change.applied);
    return result;
  }

  function runHistory(direction: "undo" | "redo") {
    const result = direction === "undo" ? editor.undo() : editor.redo();
    setLastAction(result.ok ? direction : result.code);
    if (result.ok && result.change) setLastPatch(result.change.applied);
  }

  function applySampleIntent() {
    const text = findRichTextDemoTextNode(editor.snapshot.value as RichTextDocument, "text-editable");
    if (!text) return setLastAction("rich-text.point-not-found");
    const point: RichTextPoint = { kind: "text", nodeId: text.id, offset: text.text.length, affinity: "forward" };
    editor.dispatch({ type: "selection.set", selection: { kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0 } });
    remember("text.insert", editor.dispatch({ type: "text.insert", text: " ✓" }));
  }

  function toggleStrong() {
    remember("mark.toggle:strong", editor.dispatch({ type: "mark.toggle", mark: { type: "strong" } }));
  }

  function setHeading() {
    remember("block.set-type:heading", editor.dispatch({ type: "block.set-type", nodeType: "heading", attrs: { level: 3 } }));
  }

  function insertHardBreak() {
    remember("node.insert:hardBreak", editor.dispatch({
      type: "node.insert",
      point: { kind: "child", nodeId: "paragraph-2", offset: 1, affinity: "forward" },
      node: { id: "demo-hard-break", type: "hardBreak" },
    }));
  }

  function updateCodeAttrs() {
    remember("node.set-attrs", editor.dispatch({ type: "node.set-attrs", nodeId: "code-block-1", attrs: { language: "typescript" } }));
  }

  return {
    applySampleIntent,
    insertHardBreak,
    lastAction,
    lastPatch,
    onSurfaceAction,
    runHistory,
    setHeading,
    toggleStrong,
    updateCodeAttrs,
  };
}
