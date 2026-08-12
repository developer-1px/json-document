import { useState } from "react";
import { createJSONDocument, type JSONValue } from "@interactive-os/json-document";
import { type BlockDocument } from "@interactive-os/json-document-editing";
import {
  useDocumentEditor,
  useEditingSnapshot,
  useJSONDocumentValue,
} from "@interactive-os/json-document-react";

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
  const value = useJSONDocumentValue(document) as { readonly title: string; readonly count: number };

  function replace(path: "/title" | "/count", next: JSONValue) {
    document.commit([{ op: "replace", path, value: next }], {
      metadata: { origin: "react-connector-demo" },
    });
  }

  return (
    <section aria-label="JSON Document subscription" className="rounded border border-stone-200 bg-white p-4">
      <div className="mb-4">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-stone-400">useJSONDocumentValue</p>
        <h2 className="mb-1 mt-1 text-base font-semibold text-stone-950">Document subscription</h2>
        <p className="m-0 text-xs leading-5 text-stone-500">A React view follows the six-member JSON Document through its public subscription.</p>
      </div>

      <label className="grid gap-1 text-xs font-medium text-stone-600">
        Document title
        <input
          value={value.title}
          onChange={(event) => replace("/title", event.currentTarget.value)}
          className="rounded border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-900"
        />
      </label>
      <button
        type="button"
        onClick={() => replace("/count", value.count + 1)}
        className="mt-3 rounded border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100"
      >
        Count {value.count}
      </button>

      <JSONPanel testId="react-document-json" value={value} />
    </section>
  );
}

function EditingSnapshotLab() {
  const editor = useDocumentEditor(initialEditorDocument);
  const snapshot = useEditingSnapshot(editor);
  const value = snapshot.value as BlockDocument;

  return (
    <section aria-label="Editing snapshot subscription" className="rounded border border-stone-200 bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-stone-400">useDocumentEditor + useEditingSnapshot</p>
          <h2 className="mb-1 mt-1 text-base font-semibold text-stone-950">Editing snapshot</h2>
          <p className="m-0 text-xs leading-5 text-stone-500">The component owns one editor and rerenders from published editing snapshots.</p>
        </div>
        <span className="shrink-0 text-xs text-stone-400">revision {snapshot.revision}</span>
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
            className="resize-none rounded border border-stone-300 px-3 py-2 text-sm leading-6 text-stone-800 outline-none focus:border-stone-900"
          />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!snapshot.canUndo}
          onClick={() => editor.undo()}
          className="rounded border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-35"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!snapshot.canRedo}
          onClick={() => editor.redo()}
          className="rounded border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-35"
        >
          Redo
        </button>
      </div>

      <JSONPanel testId="react-editor-json" value={snapshot.value} />
    </section>
  );
}

function JSONPanel({ testId, value }: { readonly testId: string; readonly value: JSONValue }) {
  return (
    <div className="mt-4 rounded border border-stone-800 bg-stone-950 p-3 text-stone-100">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">Canonical JSON</div>
      <pre data-testid={testId} className="m-0 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5">
        <code>{JSON.stringify(value, null, 2)}</code>
      </pre>
    </div>
  );
}
