import { useRef, useState, type FocusEvent } from "react";
import {
  createDatabaseEditor,
  type DatabaseDocument,
  type DatabaseEditor,
  type DatabaseProperty,
  type DatabaseRecord,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { databaseDocumentFromZod } from "@interactive-os/json-document-zod";
import * as z from "zod/v4";
import { Inspector } from "../../../shared/ui/inspector";
import { ActionButton, SelectableItem, ToggleButton } from "../../../shared/ui/interactive";
import { classes, ui } from "../../../shared/ui/styles";
import { gridCellProps, historyCommands } from "../../../shared/widget-binding";

export const adminTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  owner: z.string(),
  points: z.number(),
  status: z.enum(["backlog", "progress", "done"]),
  shipped: z.boolean(),
});

const initialTasks = [
  { id: "t1", title: "Triage inbox", owner: "Ada", points: 1, status: "backlog" as const, shipped: false },
  { id: "t2", title: "Replace settings form", owner: "Ada", points: 5, status: "progress" as const, shipped: false },
  { id: "t3", title: "Publish changelog", owner: "Lin", points: 2, status: "done" as const, shipped: true },
];

const initialAdmin = openAdminDocument(adminTaskSchema, initialTasks);

export function ZodAdminLab() {
  const [editor] = useState<DatabaseEditor>(() => createDatabaseEditor(initialAdmin));
  const nextRecord = useRef(4);
  const document = editor.snapshot.value as DatabaseDocument;
  const view = document.views[0]!;
  const topology = editor.tableTopology(view.id);
  const properties = topology.propertyIds.map((id) => document.schema.properties.find((property) => property.id === id)!);
  const records = topology.recordIds.map((id) => document.records.find((record) => record.id === id)!);

  function run(action: () => { readonly ok: boolean }) {
    action();
  }

  const focus = editor.snapshot.selection.focus;
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedCellsIn(topology).map((cell) => `${cell.recordId}\u0000${cell.propertyId}`),
    focusKey: focus ? `${focus.recordId}\u0000${focus.propertyId}` : null,
    onSelect: (key, mode) => {
      const split = key.indexOf("\u0000");
      const recordId = key.slice(0, split);
      const propertyId = key.slice(split + 1);
      run(() => editor.dispatch({ type: "selection.set", recordId, propertyId, mode }));
    },
  });
  const snapshot = editing.snapshot;
  const commands = historyCommands(snapshot);

  function addRecord() {
    const recordId = `t${nextRecord.current}`;
    nextRecord.current += 1;
    run(() => editor.dispatch({ type: "record.add", recordId }));
  }

  function deleteSelected() {
    const recordId = snapshot.selection.focus?.recordId;
    if (!recordId) return;
    run(() => editor.dispatch({ type: "record.delete", recordId }));
  }

  function configure(patch: Parameters<DatabaseEditor["dispatch"]>[0] & { readonly type: "view.configure" }) {
    run(() => editor.dispatch(patch));
  }

  return (
    <section aria-label="Zod admin" className="grid gap-4">
      <div className="grid gap-1">
        <p className={ui.text.label}>databaseDocumentFromZod</p>
        <h2 className={classes("mb-1 mt-1", ui.text.heading)}>The table is the admin</h2>
        <p className={classes("m-0", ui.text.meta)}>
          A Zod object schema and record array become a Database document. There is no create or edit form — only this table.
        </p>
      </div>

      <div className={classes("flex flex-wrap items-center gap-2 p-3", ui.database.toolbar)} role="toolbar" aria-label="Admin table actions">
        <ActionButton kind="primary" onClick={addRecord}>New record</ActionButton>
        <ActionButton kind="danger" onClick={deleteSelected}>Delete selected</ActionButton>
        <ToggleButton
          pressed={view.filter !== null}
          onClick={() => configure({
            type: "view.configure",
            viewId: view.id,
            filter: view.filter === null
              ? { propertyId: "status", operator: "equals", value: "backlog" }
              : null,
          })}
        >
          Backlog only
        </ToggleButton>
        <ToggleButton
          pressed={view.sort !== null}
          onClick={() => configure({
            type: "view.configure",
            viewId: view.id,
            sort: view.sort === null ? { propertyId: "points", direction: "descending" } : null,
          })}
        >
          Points descending
        </ToggleButton>
        <ActionButton disabled={commands.undo.disabled} onClick={() => run(editor.undo)}>Undo</ActionButton>
        <ActionButton disabled={commands.redo.disabled} onClick={() => run(editor.redo)}>Redo</ActionButton>
      </div>

      <div className={classes("overflow-auto", ui.surface.raised)}>
        <table role="grid" aria-label="Admin records" aria-multiselectable="true" className={classes("w-full min-w-[48rem]", ui.database.table)}>
          <thead>
            <tr>
              {properties.map((property) => (
                <th key={property.id} scope="col" className={classes("px-3 py-2", ui.database.head)}>
                  <span className="flex items-center justify-between gap-2">
                    <span>{property.name}</span>
                    <span className={ui.database.type}>{property.type}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} data-record-id={record.id}>
                {properties.map((property) => {
                  const item = editing.getItem(`${record.id}\u0000${property.id}`);
                  return (
                    <SelectableItem
                      as="td"
                      key={property.id}
                      className={classes("min-w-32 p-0", ui.database.cell)}
                      {...gridCellProps(item)}
                    >
                        <AdminPropertyEditor
                          property={property}
                          record={record}
                          onCommit={(value) => run(() => editor.dispatch({
                            type: "cell.commit",
                            recordId: record.id,
                            propertyId: property.id,
                            value,
                          }))}
                        />
                    </SelectableItem>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 ? <div className={classes("m-3 p-6", ui.surface.empty)}>No records in this view.</div> : null}
      </div>

      <Inspector label="Inspect Zod admin state" items={[
        { label: "Zod schema fields", testId: "zod-admin-schema", value: document.schema },
        {
          label: "Canonical admin document",
          testId: "zod-admin-document",
          signal: `revision ${snapshot.revision}`,
          value: document,
        },
      ]} />
    </section>
  );
}

function AdminPropertyEditor(props: {
  readonly property: DatabaseProperty;
  readonly record: DatabaseRecord;
  readonly onCommit: (value: string | number | boolean) => void;
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
          {props.property.options.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <input
      key={String(value)}
      type={props.property.type === "number" ? "number" : "text"}
      aria-label={`${props.property.name} ${props.record.id}`}
      defaultValue={String(value)}
      onBlur={(event) => commitInput(event, props.property, props.onCommit)}
      className={classes("w-full min-w-0", ui.field.seamless)}
    />
  );
}

function openAdminDocument(
  schema: typeof adminTaskSchema,
  records: typeof initialTasks,
) {
  const translated = databaseDocumentFromZod(schema, records);
  if (translated.ok) return translated.value;
  throw new Error(translated.reason ?? translated.code);
}

function commitInput(
  event: FocusEvent<HTMLInputElement>,
  property: DatabaseProperty,
  commit: (value: string | number) => void,
) {
  commit(property.type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value);
}
