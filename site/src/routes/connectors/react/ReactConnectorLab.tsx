import { useRef, useState } from "react";
import { Plus, Redo2, Undo2 } from "lucide-react";
import { createJSONDocument, type JSONValue } from "@interactive-os/json-document";
import { documentSelectionFocus, type BlockDocument } from "@interactive-os/json-document-editing";
import {
  DocumentTextControl,
  useDocumentEditor,
  useEditing,
  useEditingSnapshot,
  useReactConnector,
} from "@interactive-os/json-document-react";
import { historyAffordance } from "@interactive-os/json-document-affordance";
import { Inspector } from "../../../shared/ui/inspector";
import { IconButton, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";

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
      <UseEditingLab />
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
      <IconButton label={`Count ${value.count}`}
        onClick={() => replace("/count", value.count + 1)}
        className="mt-3"
      >
        <Plus aria-hidden="true" size={16} />
      </IconButton>

      <JSONPanel testId="react-document-json" value={value} />
    </section>
  );
}

function EditingSnapshotLab() {
  const editor = useDocumentEditor(initialEditorDocument);
  const snapshot = useEditingSnapshot(editor);
  const value = snapshot.value as BlockDocument;
  const commands = historyAffordance(snapshot).hand;

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
        <IconButton label="Undo"
          disabled={commands.undo.disabled}
          onClick={() => editor.undo()}
        >
          <Undo2 aria-hidden="true" size={16} />
        </IconButton>
        <IconButton label="Redo"
          disabled={commands.redo.disabled}
          onClick={() => editor.redo()}
        >
          <Redo2 aria-hidden="true" size={16} />
        </IconButton>
      </div>

      <JSONPanel testId="react-editor-json" value={snapshot.value} />
    </section>
  );
}

function UseEditingLab() {
  const editor = useDocumentEditor(initialEditorDocument);
  const focus = documentSelectionFocus(editor.snapshot.selection);
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedBlockIds,
    focusKey: focus?.blockId ?? null,
    textOffset: focus?.offset ?? null,
    onSelect: (blockId, mode) => {
      editor.dispatch({ type: "selection.set", blockId, mode });
    },
  });
  const value = editing.snapshot.value as BlockDocument;

  return (
    <section aria-label="Editing selection queries" className={classes("p-4 lg:col-span-2", ui.surface.raised)}>
      <div className="mb-4">
        <p className={ui.text.label}>useEditing</p>
        <h2 className={classes("mb-1 mt-1", ui.text.heading)}>Selection and cursor</h2>
        <p className={classes("m-0", ui.text.meta)}>
          getIsSelected is the object range. getIsFocus is the cursor. getTextOffset is the caret on that focus.
        </p>
      </div>

      <div className="grid gap-2">
        {value.blocks.map((block) => {
          const item = editing.getItem(block.id);
          return (
            <SelectableItem
              key={block.id}
              className={classes("grid gap-2 p-3 text-left", ui.surface.workspace)}
              {...editingItemProps(item)}
            >
              <span className={ui.text.label}>{block.id}</span>
              <DocumentTextControl
                aria-label={`${block.id} cursor`}
                text={block.text}
                offset={item.getTextOffset()}
                readOnly
                rows={2}
                onCaretRange={(_from, offset) => editor.dispatch({ type: "selection.set", blockId: block.id, offset })}
                onTextInput={() => undefined}
                className={classes("resize-none", ui.field.control)}
              />
            </SelectableItem>
          );
        })}
      </div>
    </section>
  );
}

function JSONPanel({ testId, value }: { readonly testId: string; readonly value: JSONValue }) {
  return <Inspector className="mt-4" label="Inspect canonical JSON" items={[
    { label: "Canonical JSON", testId, value },
  ]} />;
}
