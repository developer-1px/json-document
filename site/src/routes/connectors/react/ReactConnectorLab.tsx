import { useState } from "react";
import { createJSONDocument, type JSONValue } from "@interactive-os/json-document";
import { type BlockDocument } from "@interactive-os/json-document-editing";
import {
  useDocumentEditor,
  useEditingSnapshot,
  useReactConnector,
} from "@interactive-os/json-document-react";
import { Inspector } from "../../../shared/ui/inspector";
import { ActionButton } from "../../../shared/ui/interactive";
import { classes, ui } from "../../../shared/ui/styles";

const initialEditorDocument: BlockDocument = {
  blocks: [
    { id: "react", text: "React renders this editing snapshot." },
    { id: "json", text: "Every edit remains canonical JSON." },
  ],
};

export function ReactConnectorLab() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <JSONDocumentSubscriptionLab />
      <EditingSnapshotLab />
    </div>
  );
}

function JSONDocumentSubscriptionLab() {
  const [document] = useState(() => createJSONDocument({ title: "Connector draft", count: 0 }));
  const value = useReactConnector(document) as { readonly title: string; readonly count: number };

  function replace(path: "/title" | "/count", next: JSONValue) {
    document.commit([{ op: "replace", path, value: next }], {
      metadata: { origin: "react-connector-demo" },
    });
  }

  return (
    <section aria-label="JSON Document subscription" className={classes("p-4", ui.surface.raised)}>
      <div className="mb-4">
        <p className={ui.text.label}>useReactConnector</p>
        <h2 className={classes("mb-1 mt-1", ui.text.heading)}>Document subscription</h2>
        <p className={classes("m-0", ui.text.meta)}>A React view follows the six-member JSON Document through its public subscription.</p>
      </div>

      <label className={classes("grid gap-1", ui.text.meta)}>
        Document title
        <input
          value={value.title}
          onChange={(event) => replace("/title", event.currentTarget.value)}
          className={ui.field.control}
        />
      </label>
      <ActionButton
        onClick={() => replace("/count", value.count + 1)}
        className="mt-3"
      >
        Count {value.count}
      </ActionButton>

      <JSONPanel testId="react-document-json" value={value} />
    </section>
  );
}

function EditingSnapshotLab() {
  const editor = useDocumentEditor(initialEditorDocument);
  const snapshot = useEditingSnapshot(editor);
  const value = snapshot.value as BlockDocument;

  return (
    <section aria-label="Editing snapshot subscription" className={classes("p-4", ui.surface.raised)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className={ui.text.label}>useDocumentEditor + useEditingSnapshot</p>
          <h2 className={classes("mb-1 mt-1", ui.text.heading)}>Editing snapshot</h2>
          <p className={classes("m-0", ui.text.meta)}>The component owns one editor and rerenders from published editing snapshots.</p>
        </div>
        <span className={classes("shrink-0", ui.text.meta)}>revision {snapshot.revision}</span>
      </div>

      <div className="grid gap-2">
        {value.blocks.map((block, index) => (
          <textarea
            key={block.id}
            aria-label={`Connector block ${index + 1}`}
            rows={2}
            value={block.text}
            onFocus={() => editor.dispatch({ type: "selection.set", blockId: block.id })}
            onChange={(event) => editor.dispatch({
              type: "text.replace",
              blockId: block.id,
              text: event.currentTarget.value,
              offset: event.currentTarget.selectionStart,
            })}
            className={classes("resize-none", ui.field.control)}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <ActionButton
          disabled={!snapshot.canUndo}
          onClick={() => editor.undo()}
        >
          Undo
        </ActionButton>
        <ActionButton
          disabled={!snapshot.canRedo}
          onClick={() => editor.redo()}
        >
          Redo
        </ActionButton>
      </div>

      <JSONPanel testId="react-editor-json" value={snapshot.value} />
    </section>
  );
}

function JSONPanel({ testId, value }: { readonly testId: string; readonly value: JSONValue }) {
  return <Inspector className="mt-4" label="Inspect canonical JSON" items={[
    { label: "Canonical JSON", testId, value },
  ]} />;
}
