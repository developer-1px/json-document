import {
  useRef,
  useState,
  type DragEvent,
  type FocusEvent,
  type MouseEvent,
} from "react";
import {
  createDatabaseEditor,
  type DatabaseDocument,
  type DatabaseEditor,
  type DatabaseIntent,
  type DatabaseProperty,
  type DatabaseRecord,
  type DatabaseSelection,
  type EditingResult,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem, ToggleButton } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import { initialDatabase } from "./initial-database";

type NativeTextLease = {
  readonly recordId: string;
  readonly propertyId: string;
  readonly composing: boolean;
};

export function DatabaseTableDemo() {
  const [editor] = useState<DatabaseEditor>(() => createDatabaseEditor(initialDatabase));
  const snapshot = useEditingSnapshot(editor);
  const [lease, setLease] = useState<NativeTextLease | null>(null);
  const [dragPreview, setDragPreview] = useState<ReadonlyArray<string> | null>(null);
  const draggedProperty = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState("Database ready");
  const [lastIntent, setLastIntent] = useState<DatabaseIntent | null>(null);
  const [lastResult, setLastResult] = useState<{ readonly ok: true } | { readonly ok: false; readonly code: string } | null>(null);
  const nextRecord = useRef(5);
  const document = snapshot.value as DatabaseDocument;
  const view = document.views[0]!;
  const topology = editor.tableTopology(view.id);
  const visiblePropertyIds = (dragPreview ?? view.propertyOrder)
    .filter((propertyId) => view.propertyVisibility[propertyId] !== false);
  const properties = visiblePropertyIds.map((id) => document.schema.properties.find((property) => property.id === id)!);
  const records = topology.recordIds.map((id) => document.records.find((record) => record.id === id)!);
  const selected = new Set(editor.selectedCellsIn(topology).map((cell) => cellKey(cell.recordId, cell.propertyId)));

  function dispatchIntent(intent: DatabaseIntent) {
    const result: EditingResult<DatabaseSelection> = editor.dispatch(intent);
    setLastIntent(intent);
    setLastResult(result.ok ? { ok: true } : { ok: false, code: result.code });
    return result;
  }

  function run(action: () => { readonly ok: boolean }, message: string) {
    const result = action();
    setAnnouncement(result.ok ? message : "That action is not available");
    return result;
  }

  function selectCell(event: MouseEvent, recordId: string, propertyId: string) {
    const mode = event.shiftKey
      ? "extend"
      : event.metaKey || event.ctrlKey
        ? "toggle"
        : "replace";
    run(() => dispatchIntent({ type: "selection.set", recordId, propertyId, mode }), "Cell selection updated");
  }

  function commit(recordId: string, propertyId: string, value: string | number | boolean) {
    run(() => dispatchIntent({ type: "cell.commit", recordId, propertyId, value }), `${propertyId} committed`);
  }

  function configure(patch: Parameters<DatabaseEditor["dispatch"]>[0] & { readonly type: "view.configure" }) {
    run(() => dispatchIntent(patch), "Table view saved in canonical JSON");
  }

  function addRecord() {
    const recordId = `page-${nextRecord.current}`;
    nextRecord.current += 1;
    run(() => dispatchIntent({ type: "record.add", recordId }), "Record added");
  }

  function deleteSelectedRecord() {
    const recordId = snapshot.selection.focus?.recordId;
    if (!recordId) return;
    run(() => dispatchIntent({ type: "record.delete", recordId }), "Record deleted");
  }

  function startPropertyDrag(event: DragEvent, propertyId: string) {
    draggedProperty.current = propertyId;
    setDragPreview([...view.propertyOrder]);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", propertyId);
  }

  function previewPropertyAt(propertyId: string) {
    const source = draggedProperty.current;
    if (!source || source === propertyId) return;
    setDragPreview((current) => {
      const order = [...(current ?? view.propertyOrder)];
      const sourceIndex = order.indexOf(source);
      const targetIndex = order.indexOf(propertyId);
      if (sourceIndex < 0 || targetIndex < 0) return order;
      order.splice(sourceIndex, 1);
      order.splice(targetIndex, 0, source);
      return order;
    });
  }

  function finishPropertyDrag() {
    const next = dragPreview;
    draggedProperty.current = null;
    setDragPreview(null);
    if (next && next.join("\u0000") !== view.propertyOrder.join("\u0000")) {
      configure({ type: "view.configure", viewId: view.id, propertyOrder: next });
    }
  }

  return (
    <section aria-label="Database editor" className="grid gap-4">
      <div className={classes("flex flex-wrap items-center gap-2 p-3", ui.database.toolbar)} role="toolbar" aria-label="Database and view actions">
        <ActionButton kind="primary" onClick={addRecord}>New record</ActionButton>
        <ActionButton kind="danger" onClick={deleteSelectedRecord}>Delete selected</ActionButton>
        <span className={classes("mx-1 h-6 w-px", ui.surface.separator)} aria-hidden="true" />
        <ToggleButton
          pressed={view.filter !== null}
          onClick={() => configure({
            type: "view.configure",
            viewId: view.id,
            filter: view.filter === null
              ? { propertyId: "status", operator: "equals", value: "backlog" }
              : null,
          })}
        >Backlog only</ToggleButton>
        <ToggleButton
          pressed={view.sort !== null}
          onClick={() => configure({
            type: "view.configure",
            viewId: view.id,
            sort: view.sort === null ? { propertyId: "score", direction: "descending" } : null,
          })}
        >Score descending</ToggleButton>
        <ToggleButton
          pressed={view.propertyVisibility.note === false}
          onClick={() => configure({
            type: "view.configure",
            viewId: view.id,
            propertyVisibility: { ...view.propertyVisibility, note: view.propertyVisibility.note !== false ? false : true },
          })}
        >Hide notes</ToggleButton>
        <ToggleButton
          pressed={view.propertyOrder[0] === "score"}
          onClick={() => configure({
            type: "view.configure",
            viewId: view.id,
            propertyOrder: view.propertyOrder[0] === "score"
              ? ["name", "note", "score", "status", "complete"]
              : ["score", "name", "note", "status", "complete"],
          })}
        >Score first</ToggleButton>
        <span className={classes("mx-1 h-6 w-px", ui.surface.separator)} aria-hidden="true" />
        <ActionButton disabled={!snapshot.canUndo} onClick={() => run(editor.undo, "Undone")}>Undo</ActionButton>
        <ActionButton disabled={!snapshot.canRedo} onClick={() => run(editor.redo, "Redone")}>Redo</ActionButton>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <output aria-live="polite" className={ui.text.meta}>{announcement}</output>
        <div className="flex flex-wrap items-center gap-2">
          {dragPreview ? <output data-testid="property-drag-preview" className={ui.database.lease}>Local drag preview · {dragPreview.join(" → ")}</output> : null}
          {lease ? (
            <output data-testid="native-text-lease" className={ui.database.lease}>
              Native text lease · {lease.recordId}/{lease.propertyId}{lease.composing ? " · composing" : ""}
            </output>
          ) : <output data-testid="native-text-lease" className={ui.text.meta}>Structural navigation</output>}
        </div>
      </div>

      <div className="grid gap-4">
        <div className={classes("overflow-auto", ui.surface.raised)}>
          <table role="grid" aria-label="Notion-style database" aria-multiselectable="true" className={classes("w-full min-w-[52rem]", ui.database.table)}>
            <thead>
              <tr>
                {properties.map((property) => (
                  <th
                    key={property.id}
                    scope="col"
                    draggable
                    aria-grabbed={draggedProperty.current === property.id}
                    onDragStart={(event) => startPropertyDrag(event, property.id)}
                    onDragEnter={() => previewPropertyAt(property.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => event.preventDefault()}
                    onDragEnd={finishPropertyDrag}
                    className={classes("cursor-move px-3 py-2", ui.database.head)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{property.name}</span>
                      <span className={ui.database.type}>{property.type}</span>
                    </span>
                  </th>
                ))}
                <th scope="col" className={classes("w-10 px-2 py-2", ui.database.rowAction)}>Row</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} data-record-id={record.id}>
                  {properties.map((property) => {
                    const isSelected = selected.has(cellKey(record.id, property.id));
                    return (
                      <SelectableItem
                        as="td"
                        key={property.id}
                        selected={isSelected}
                        role="gridcell"
                        aria-selected={isSelected}
                        data-record-id={record.id}
                        data-property-id={property.id}
                        onClick={(event) => selectCell(event, record.id, property.id)}
                        className={classes("min-w-32 p-0", ui.database.cell)}
                      >
                        <PropertyEditor
                          property={property}
                          record={record}
                          onCommit={(value) => commit(record.id, property.id, value)}
                          onLease={(next) => setLease(next ? { recordId: record.id, propertyId: property.id, composing: next.composing } : null)}
                        />
                      </SelectableItem>
                    );
                  })}
                  <td className={classes("px-2 py-2", ui.database.rowAction)}>{record.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 ? <div className={classes("m-3 p-6", ui.surface.empty)}>No records in this view.</div> : null}
        </div>

        <section className={classes("p-3", ui.surface.raised)}>
          <Inspector label="Inspect database state" items={[
            { label: "intent", meta: lastIntent ? lastIntent.type : "dispatch only", value: lastIntent, testId: "database-intent-json" },
            { label: "result", meta: lastResult?.ok === false ? lastResult.code : lastResult?.ok ? "ok" : "none yet", value: lastResult, testId: "database-result-json" },
            { label: "Persistent Table view", value: view, testId: "database-view-json" },
            { label: "Structural selection", value: snapshot.selection, testId: "database-selection-json", size: "compact" },
            { label: "Canonical database", signal: `revision ${snapshot.revision}`, value: document, testId: "database-document-json" },
          ]} />
        </section>
      </div>
    </section>
  );
}

function PropertyEditor(props: {
  readonly property: DatabaseProperty;
  readonly record: DatabaseRecord;
  readonly onCommit: (value: string | number | boolean) => void;
  readonly onLease: (lease: { readonly composing: boolean } | null) => void;
}) {
  const value = props.record.values[props.property.id]!;
  if (props.property.type === "checkbox") {
    return (
      <label className="flex items-center justify-center px-3 py-2">
        <input
          type="checkbox"
          aria-label={`${props.property.name} ${props.record.id}`}
          checked={Boolean(value)}
          onChange={(event) => props.onCommit(event.currentTarget.checked)}
          className={ui.database.checkbox}
        />
      </label>
    );
  }
  if (props.property.type === "select") {
    return (
      <div className="px-2 py-1.5">
        <select
          aria-label={`${props.property.name} ${props.record.id}`}
          value={String(value)}
          onChange={(event) => props.onCommit(event.currentTarget.value)}
          className={classes("w-full", ui.database.select)}
        >
          {props.property.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </div>
    );
  }
  const isText = props.property.type === "title" || props.property.type === "text";
  return (
    <input
      key={String(value)}
      type={props.property.type === "number" ? "number" : "text"}
      aria-label={`${props.property.name} ${props.record.id}`}
      defaultValue={String(value)}
      onFocus={() => isText && props.onLease({ composing: false })}
      onCompositionStart={() => isText && props.onLease({ composing: true })}
      onCompositionEnd={() => isText && props.onLease({ composing: false })}
      onBlur={(event) => {
        commitInput(event, props.property, props.onCommit);
        if (isText) props.onLease(null);
      }}
      className={classes("w-full min-w-0", ui.field.seamless)}
    />
  );
}

function commitInput(
  event: FocusEvent<HTMLInputElement>,
  property: DatabaseProperty,
  commit: (value: string | number) => void,
) {
  commit(property.type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value);
}

function cellKey(recordId: string, propertyId: string): string {
  return `${recordId}\u0000${propertyId}`;
}
