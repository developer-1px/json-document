import { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { createJSONDocument } from "@interactive-os/json-document";
import { emptyRangeSelection } from "@interactive-os/json-document-selection";
import {
  createDocumentEditor,
  type BlockDocument,
  type DocumentSelection,
} from "@interactive-os/json-document-editing";
import {
  createWebClipboardBinding,
  createWebKeyboardAdapter,
  documentClipboardCodec,
} from "@interactive-os/json-document-web";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import "./styles.css";

const documentModel = createJSONDocument({
  blocks: [
    { id: "alpha", text: "Alpha" },
    { id: "beta", text: "Beta" },
  ],
});
const editor = createDocumentEditor(documentModel, {
  createId: (() => {
    let sequence = 0;
    return () => `external-${++sequence}`;
  })(),
});
const keyboard = createWebKeyboardAdapter();

function ExternalEditor() {
  const snapshot = useEditingSnapshot<DocumentSelection>(editor);
  const value = snapshot.value as BlockDocument;
  const selected = new Set(editor.selectedBlockIds);
  const focusId = snapshot.selection.primaryIndex === null
    ? undefined
    : snapshot.selection.ranges[snapshot.selection.primaryIndex]?.focus.blockId;
  const clipboard = useMemo(() => createWebClipboardBinding({
    codec: documentClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
  }), []);

  return (
    <main
      data-testid="external-editor"
      data-selection-contract={emptyRangeSelection().kind}
      tabIndex={0}
      onCopy={(event) => clipboard.copy(event.nativeEvent)}
      onCut={(event) => clipboard.cut(event.nativeEvent)}
      onPaste={(event) => clipboard.paste(event.nativeEvent)}
      onKeyDown={(event) => {
        const command = keyboard.resolve(event);
        if (command === null) return;
        if (command.type === "undo") {
          event.preventDefault();
          editor.undo();
          return;
        }
        if (command.type === "redo") {
          event.preventDefault();
          editor.redo();
          return;
        }
        if (command.type !== "move") return;
        const current = Math.max(0, value.blocks.findIndex((block) => block.id === focusId));
        const previous = command.direction === "previous"
          || command.direction === "up"
          || command.direction === "left";
        const nextIndex = Math.max(0, Math.min(value.blocks.length - 1, current + (previous ? -1 : 1)));
        const next = value.blocks[nextIndex];
        if (next === undefined) return;
        event.preventDefault();
        editor.dispatch({ type: "selection.set", blockId: next.id, mode: command.operation });
      }}
    >
      <header>
        <p>Consumer-owned React UI</p>
        <output data-testid="history">{snapshot.canUndo ? "undo-ready" : "clean"}</output>
      </header>
      <section aria-label="Document blocks">
        {value.blocks.map((block) => (
          <article
            key={block.id}
            data-block-id={block.id}
            data-selected={selected.has(block.id) ? "true" : "false"}
            onClick={() => editor.dispatch({ type: "selection.set", blockId: block.id })}
          >
            <label>
              <span>{block.id}</span>
              <input
                aria-label={`${block.id} text`}
                value={block.text}
                onChange={(event) => editor.dispatch({
                  type: "text.replace",
                  blockId: block.id,
                  text: event.currentTarget.value,
                  offset: event.currentTarget.selectionStart ?? event.currentTarget.value.length,
                })}
              />
            </label>
          </article>
        ))}
      </section>
    </main>
  );
}

const root = window.document.querySelector("#root");
if (root === null) throw new Error("Missing root element");
createRoot(root).render(<ExternalEditor />);
