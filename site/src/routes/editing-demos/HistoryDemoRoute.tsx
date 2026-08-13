import { useState } from "react";
import { type BlockDocument } from "@interactive-os/json-document-editing";
import { useDocumentEditor, useEditingSnapshot } from "@interactive-os/json-document-react";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { Button, PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "bravo", text: "Another block" },
    { id: "alpha", text: "Original text" },
  ],
};

export function HistoryDemoRoute() {
  const editor = useDocumentEditor(initialDocument);
  const snapshot = useEditingSnapshot(editor);
  const [lastCall, setLastCall] = useState("No edit yet");

  function edit() {
    editor.dispatch({ type: "text.replace", blockId: "bravo", text: "Edited text", offset: 6 });
    setLastCall("dispatch({ type: \"text.replace\", blockId: \"bravo\", ... })");
  }

  function undo() {
    editor.undo();
    setLastCall("editor.undo()");
  }

  function redo() {
    editor.redo();
    setLastCall("editor.redo()");
  }

  return (
    <PageFrame>
      <PageHeader title="History Demo" illustration="cursor">
        Commit one edit, then use the resulting History item to restore document value and Selection together.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="history-input">
          <p className={ui.text.label}>1 · Edit</p>
          <h2 id="history-input" className={classes("mb-2 mt-1", ui.text.heading)}>Create one History item</h2>
          <p className={classes("mt-0", ui.text.meta)}>
            The edit starts from block bravo at offset 0 and moves Selection to offset 6.
          </p>
          <Button kind="primary" onClick={edit}>Apply edit</Button>
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="history-call">
          <p className={ui.text.label}>2 · History API</p>
          <h2 id="history-call" className={classes("mb-2 mt-1", ui.text.heading)}>{lastCall}</h2>
          <div className="mb-3 flex gap-2">
            <Button onClick={undo} disabled={!snapshot.canUndo}>Undo</Button>
            <Button onClick={redo} disabled={!snapshot.canRedo}>Redo</Button>
          </div>
          <JsonInspector
            label="history"
            value={{ canUndo: snapshot.canUndo, canRedo: snapshot.canRedo }}
            testId="history-demo-status"
            size="compact"
          />
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="history-result">
          <p className={ui.text.label}>3 · Restored state</p>
          <h2 id="history-result" className={classes("mb-2 mt-1", ui.text.heading)}>Value and Selection move together</h2>
          <JsonInspector label="document.value" value={snapshot.value} testId="history-demo-document" size="compact" />
          <JsonInspector label="selection" value={snapshot.selection} testId="history-demo-selection" size="compact" />
        </section>
      </div>
    </PageFrame>
  );
}
