import { fieldPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { useRef, useState } from "react";
import { Plus, Redo2, Undo2 } from "lucide-react";
import { createJSONDocument, isJSONValue, readPointer, trackPointer, type JSONValue } from "@interactive-os/json-document";
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
import { Command, Field, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { classes } from "../../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";

const initialEditorDocument: BlockDocument = {
  blocks: [
    { id: "react", text: "React renders this editing snapshot." },
    { id: "json", text: "Every edit remains canonical JSON." },
  ],
};

export function ReactConnectorLab() {
  return (
    <div className="grid gap-group lg:grid-cols-2">
      <JSONDocumentSubscriptionLab />
      <EditingSnapshotLab />
      <UseEditingLab />
      <PointerTrackingLab />
      <JSONValueLab />
    </div>
  );
}

function JSONValueLab() {
  const samples = [
    { label: "Nested value", value: { "a/b~": [{ title: "Draft" }] }, pointer: "#/a~1b~0/0/title" },
    { label: "Non-finite number", value: { score: NaN }, pointer: "/score" },
    { label: "Sparse array", value: Array(1), pointer: "/0" },
  ];
  const [index, setIndex] = useState(0);
  const sample = samples[index]!;
  const input: unknown = sample.value;
  const valid = isJSONValue(input);
  const result = valid ? readPointer(input, sample.pointer) : null;
  return (
    <section aria-label="JSON value boundary" className="lg:col-span-2">
      <h2 className={contentPresentation.itemTitle}>Read a JSON snapshot</h2>
      <p className={contentPresentation.caption}>Validate incoming values, then resolve an address without copying the snapshot.</p>
      <div className="flex gap-related">
        {samples.map((item, index) => <Command key={item.label} onClick={() => setIndex(index)}>{item.label}</Command>)}
      </div>
      <p className={contentPresentation.caption}><output data-testid="json-value-valid">{valid ? "Valid JSON value" : "Not a JSON value"}</output></p>
      <Inspector label="Inspect JSON value" items={[
        { label: "Pointer", testId: "json-value-pointer", value: sample.pointer },
        { label: "Read result", testId: "json-value-read", value: result },
      ]} />
    </section>
  );
}

function PointerTrackingLab() {
  const [shape, setShape] = useState<"array" | "object">("array");
  const before = shape === "array" ? { items: ["a", "b"] } : { items: { "0": "a", "1": "b" } };
  const document = createJSONDocument(before);
  const committed = document.commit([{ op: "add", path: "/items/0", value: "A" }]);
  const tracked = committed.ok ? trackPointer("/items/1", committed.change.applied, before) : null;

  return (
    <section aria-label="Context-aware pointer tracking" className="lg:col-span-2">
      <h2 className={contentPresentation.itemTitle}>Track a position through a patch</h2>
      <p className={contentPresentation.caption}>The previous snapshot distinguishes array insertion from numeric object-key replacement.</p>
      <div className="flex gap-related">
        <Command onClick={() => setShape("array")}>Array insertion</Command>
        <Command onClick={() => setShape("object")}>Numeric object key</Command>
      </div>
      <p className={contentPresentation.caption}>Tracked address: <output data-testid="tracked-pointer">{tracked ?? "removed"}</output></p>
      <Inspector label="Inspect pointer tracking" items={[
        { label: "Before", testId: "pointer-before-json", value: before },
        { label: "After", testId: "pointer-after-json", value: document.value },
        { label: "Applied", testId: "pointer-applied-json", value: committed.ok ? committed.change.applied : [] },
      ]} />
    </section>
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
    <section aria-label="JSON Document subscription" className={classes("p-group")}>
      <div className="mb-group">
        <p className={contentPresentation.caption}>useReactConnector</p>
        <h2 className={classes("mb-related mt-related", contentPresentation.itemTitle)}>Document subscription</h2>
        <p className={classes("m-0", contentPresentation.caption)}>A React view follows the six-member JSON Document through its public subscription.</p>
      </div>

      <label className={classes("grid gap-related", contentPresentation.caption)}>
        Document title
        <Field
          label="Document title"
          value={value.title}
          onValueChange={(value) => replace("/title", value)}
        />
      </label>
      <Command label={`Count ${value.count}`}
        onClick={() => replace("/count", value.count + 1)}
        className="mt-related"
      >
        <Plus aria-hidden="true" size={16} />
      </Command>

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
    <section aria-label="Editing snapshot subscription" className={classes("p-group")}>
      <div className="mb-group flex items-start justify-between gap-related">
        <div>
          <p className={contentPresentation.caption}>useDocumentEditor + useEditingSnapshot</p>
          <h2 className={classes("mb-related mt-related", contentPresentation.itemTitle)}>Editing snapshot</h2>
          <p className={classes("m-0", contentPresentation.caption)}>The component owns one editor and rerenders from published editing snapshots.</p>
        </div>
        <span className={classes("shrink-0", contentPresentation.caption)}>revision {snapshot.revision}</span>
      </div>

      <div className="grid gap-related">
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
            className={classes("resize-none", fieldPresentation.standard)}
          />
        ))}
      </div>
      <div className="mt-related flex gap-related">
        <Command label="Undo"
          disabled={commands.undo.disabled}
          onClick={() => editor.undo()}
        >
          <Undo2 aria-hidden="true" size={16} />
        </Command>
        <Command label="Redo"
          disabled={commands.redo.disabled}
          onClick={() => editor.redo()}
        >
          <Redo2 aria-hidden="true" size={16} />
        </Command>
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
    <section aria-label="Editing selection queries" className={classes("p-group lg:col-span-2")}>
      <div className="mb-group">
        <p className={contentPresentation.caption}>useEditing</p>
        <h2 className={classes("mb-related mt-related", contentPresentation.itemTitle)}>Selection and cursor</h2>
        <p className={classes("m-0", contentPresentation.caption)}>
          getIsSelected is the object range. getIsFocus is the cursor. getTextOffset is the caret on that focus.
        </p>
      </div>

      <div className="grid gap-related">
        {value.blocks.map((block) => {
          const item = editing.getItem(block.id);
          return (
            <SelectableItem
              key={block.id}
              className={classes("grid gap-related p-related text-left")}
              {...editingItemProps(item)}
            >
              <span className={contentPresentation.caption}>{block.id}</span>
              <DocumentTextControl
                aria-label={`${block.id} cursor`}
                text={block.text}
                offset={item.getTextOffset()}
                readOnly
                rows={2}
                onCaretRange={(_from, offset) => editor.dispatch({ type: "selection.set", blockId: block.id, offset })}
                onTextInput={() => undefined}
                className={classes("resize-none", fieldPresentation.standard)}
              />
            </SelectableItem>
          );
        })}
      </div>
    </section>
  );
}

function JSONPanel({ testId, value }: { readonly testId: string; readonly value: JSONValue }) {
  return <Inspector className="mt-group" label="Inspect canonical JSON" items={[
    { label: "Canonical JSON", testId, value },
  ]} />;
}
