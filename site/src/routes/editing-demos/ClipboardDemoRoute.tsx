import { useState } from "react";
import { type BlockDocument, type DocumentClipboard } from "@interactive-os/json-document-editing";
import { useDocumentEditor, useEditingSnapshot } from "@interactive-os/json-document-react";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { Button, PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "alpha", text: "Copy this block" },
    { id: "bravo", text: "Paste after this block" },
    { id: "charlie", text: "The document receives cloned blocks" },
  ],
};

export function ClipboardDemoRoute() {
  const editor = useDocumentEditor(initialDocument);
  const snapshot = useEditingSnapshot(editor);
  const [clipboard, setClipboard] = useState<DocumentClipboard | null>(null);
  const [lastCall, setLastCall] = useState("Select a block, then copy or cut it.");
  const selected = new Set(editor.selectedBlockIds);

  function select(blockId: string) {
    editor.dispatch({ type: "selection.set", blockId });
    setLastCall(`dispatch({ type: "selection.set", blockId: "${blockId}" })`);
  }

  function copy() {
    const payload = editor.copy();
    if (!payload) return;
    setClipboard(payload);
    setLastCall("editor.copy()");
  }

  function cut() {
    const result = editor.cut();
    if (!result) return;
    setClipboard(result.clipboard);
    setLastCall("editor.cut()");
  }

  function paste() {
    if (!clipboard) return;
    editor.dispatch({ type: "clipboard.paste", clipboard });
    setLastCall("dispatch({ type: \"clipboard.paste\", clipboard })");
  }

  return (
    <PageFrame>
      <PageHeader title="Clipboard Demo" illustration="braces">
        Start with Selection, create a structured payload with copy or cut, then pass that payload to paste.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="clipboard-input">
          <p className={ui.text.label}>1 · Selection</p>
          <h2 id="clipboard-input" className={classes("mb-2 mt-1", ui.text.heading)}>Choose source blocks</h2>
          <div className="grid gap-1">
            {(snapshot.value as BlockDocument).blocks.map((block) => (
              <button
                key={block.id}
                type="button"
                aria-pressed={selected.has(block.id)}
                className={classes("px-3 py-2 text-left", ui.action.toggle)}
                onClick={() => select(block.id)}
              >
                {block.text}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={copy}>Copy</Button>
            <Button onClick={cut}>Cut</Button>
          </div>
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="clipboard-payload">
          <p className={ui.text.label}>2 · API and payload</p>
          <h2 id="clipboard-payload" className={classes("mb-2 mt-1", ui.text.heading)}>{lastCall}</h2>
          <JsonInspector label="clipboard" value={clipboard} testId="clipboard-demo-payload" size="compact" />
          <Button className="mt-3" kind="primary" onClick={paste} disabled={!clipboard}>Paste payload</Button>
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="clipboard-result">
          <p className={ui.text.label}>3 · Result</p>
          <h2 id="clipboard-result" className={classes("mb-2 mt-1", ui.text.heading)}>Paste commits cloned blocks</h2>
          <JsonInspector label="document.value" value={snapshot.value} testId="clipboard-demo-document" size="tall" />
          <JsonInspector label="selection" value={snapshot.selection} testId="clipboard-demo-selection" size="compact" />
        </section>
      </div>
    </PageFrame>
  );
}
