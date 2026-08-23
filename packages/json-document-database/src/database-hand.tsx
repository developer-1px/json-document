import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  createDatabaseEditor,
  type DatabaseDocument,
  type DatabaseEditor,
  type DatabaseFilter,
  type DatabaseProperty,
  type DatabaseRecord,
  type DatabaseSelection,
  type DatabaseSort,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { databaseDocumentFromZod } from "@interactive-os/json-document-zod";
import type { ZodType } from "zod/v4";
import type { JSONValue } from "@interactive-os/json-document";

export interface DatabaseHandChange<Row> {
  readonly records: ReadonlyArray<Row>;
  readonly origin: "cell.commit" | "record.add" | "record.delete" | "undo" | "redo";
  readonly revision: number;
}

export interface DatabaseHandFeatures {
  readonly create?: boolean;
  readonly delete?: boolean;
  readonly history?: boolean;
  readonly filter?: boolean;
  readonly columns?: boolean;
}

export interface DatabaseHandLabels {
  readonly ariaLabel?: string;
  readonly newRecord?: string;
  readonly deleteRecord?: string;
  readonly undo?: string;
  readonly redo?: string;
  readonly columns?: string;
  readonly filter?: string;
  readonly clearFilter?: string;
  readonly empty?: string;
  readonly loading?: string;
}

export interface DatabaseHandCellRenderProps<Row> {
  readonly property: DatabaseProperty;
  readonly record: Row;
  readonly value: string | number | boolean;
  readonly selected: boolean;
  readonly commit: (value: string | number | boolean) => void;
}

export interface DatabaseHandPresentation {
  readonly propertyOrder?: ReadonlyArray<string>;
  readonly propertyVisibility?: Readonly<Record<string, boolean>>;
  readonly propertyWidths?: Readonly<Record<string, number>>;
  readonly propertyPinned?: Readonly<Record<string, "start" | "end">>;
}

export interface DatabaseHandProps<Row extends Record<string, unknown>> {
  readonly schema: ZodType<Row>;
  readonly records: ReadonlyArray<Row>;
  readonly onRecordsChange?: (records: ReadonlyArray<Row>, change: DatabaseHandChange<Row>) => void;
  readonly onSelectionChange?: (recordIds: ReadonlyArray<string>) => void;
  readonly onRecordOpen?: (record: Row) => void;
  readonly createRecord?: () => Row;
  readonly renderCell?: Readonly<Record<string, (props: DatabaseHandCellRenderProps<Row>) => ReactNode>>;
  readonly features?: DatabaseHandFeatures;
  readonly labels?: DatabaseHandLabels;
  readonly toolbar?: ReactNode;
  readonly emptyState?: ReactNode;
  readonly loadingState?: ReactNode;
  readonly errorState?: (message: string) => ReactNode;
  readonly loading?: boolean;
  readonly readOnly?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly density?: "comfortable" | "compact";
  readonly presentation?: DatabaseHandPresentation;
}

type OpenDatabase =
  | { readonly ok: true; readonly editor: DatabaseEditor; readonly fingerprint: string }
  | { readonly ok: false; readonly message: string; readonly fingerprint: string };

const defaultFeatures: Required<DatabaseHandFeatures> = {
  create: true,
  delete: true,
  history: true,
  filter: true,
  columns: true,
};

const defaultLabels: Required<DatabaseHandLabels> = {
  ariaLabel: "Database records",
  newRecord: "New record",
  deleteRecord: "Delete selected",
  undo: "Undo",
  redo: "Redo",
  columns: "Columns",
  filter: "Filter",
  clearFilter: "Clear filter",
  empty: "No records in this view.",
  loading: "Loading records…",
};

export function DatabaseHand<Row extends Record<string, unknown>>(props: DatabaseHandProps<Row>) {
  const features = { ...defaultFeatures, ...props.features };
  const labels = { ...defaultLabels, ...props.labels };
  const externalFingerprint = recordsFingerprint([props.records, props.presentation]);
  const [open, setOpen] = useState<OpenDatabase>(() => openDatabase(props.schema, props.records, props.presentation));
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    if (lastEmitted.current === externalFingerprint) {
      lastEmitted.current = null;
      return;
    }
    if (open.fingerprint !== externalFingerprint) setOpen(openDatabase(props.schema, props.records, props.presentation));
  }, [externalFingerprint, open.fingerprint, props.presentation, props.records, props.schema]);

  if (!open.ok) {
    return (
      <div className={join("jd-database", props.className)} style={props.style} data-state="error" role="alert">
        {props.errorState?.(open.message) ?? <div className="jd-database__state">{open.message}</div>}
      </div>
    );
  }

  return (
    <DatabaseSurface
      {...props}
      editor={open.editor}
      features={features}
      labels={labels}
      onEmit={(origin) => {
        const records = hostRecords<Row>(open.editor.snapshot.value as DatabaseDocument);
        const fingerprint = recordsFingerprint([records, props.presentation]);
        lastEmitted.current = fingerprint;
        props.onRecordsChange?.(records, {
          records,
          origin,
          revision: open.editor.snapshot.revision,
        });
      }}
    />
  );
}

function DatabaseSurface<Row extends Record<string, unknown>>(props: DatabaseHandProps<Row> & {
  readonly editor: DatabaseEditor;
  readonly features: Required<DatabaseHandFeatures>;
  readonly labels: Required<DatabaseHandLabels>;
  readonly onEmit: (origin: DatabaseHandChange<Row>["origin"]) => void;
}) {
  const { editor } = props;
  const [announcement, setAnnouncement] = useState("Database ready");
  const [filterPropertyId, setFilterPropertyId] = useState("");
  const tableRef = useRef<HTMLTableElement>(null);
  const nextRecord = useRef(1);
  const snapshot = useEditingSnapshot(editor);
  const document = snapshot.value as DatabaseDocument;
  const view = document.views[0]!;
  const topology = editor.tableTopology(view.id);
  const properties = view.propertyOrder
    .filter((id) => view.propertyVisibility[id] !== false)
    .map((id) => document.schema.properties.find((property) => property.id === id)!)
    .filter(Boolean);
  const hiddenProperties = document.schema.properties.filter((property) => view.propertyVisibility[property.id] === false);
  const records = topology.recordIds.map((id) => document.records.find((record) => record.id === id)!).filter(Boolean);
  const focus = snapshot.selection.focus;
  const editing = useEditing<DatabaseSelection>({
    source: editor,
    selectedKeys: editor.selectedCellsIn(topology).map((cell) => cellKey(cell.recordId, cell.propertyId)),
    focusKey: focus ? cellKey(focus.recordId, focus.propertyId) : null,
    onSelect: (key, mode) => {
      const point = parseCellKey(key);
      editor.dispatch({ type: "selection.set", ...point, mode });
    },
  });

  useEffect(() => {
    const selected = [...new Set(editor.selectedCellsIn(topology).map((cell) => cell.recordId))];
    props.onSelectionChange?.(selected);
  }, [editor, props.onSelectionChange, snapshot.selection, topology]);

  function announce(message: string) {
    setAnnouncement(message);
  }

  function emit(origin: DatabaseHandChange<Row>["origin"], message: string) {
    announce(message);
    props.onEmit(origin);
  }

  function commit(recordId: string, propertyId: string, value: string | number | boolean) {
    const result = editor.dispatch({ type: "cell.commit", recordId, propertyId, value });
    if (result.ok) emit("cell.commit", `${propertyId} saved`);
    else announce(result.code);
  }

  function addRecord() {
    const created = props.createRecord?.();
    let id = typeof created?.id === "string" ? created.id : `record-${nextRecord.current}`;
    const ids = new Set(document.records.map((record) => record.id));
    while (ids.has(id)) {
      nextRecord.current += 1;
      id = `record-${nextRecord.current}`;
    }
    nextRecord.current += 1;
    const values = created === undefined
      ? undefined
      : Object.fromEntries(Object.entries(created).filter(([key]) => key !== "id")) as Record<string, JSONValue>;
    const result = editor.dispatch({
      type: "record.add",
      recordId: id,
      ...(values === undefined ? {} : { values }),
    });
    if (result.ok) emit("record.add", "Record added");
  }

  function deleteSelected() {
    const recordId = snapshot.selection.focus?.recordId;
    if (!recordId) return announce("Select a record first");
    const result = editor.dispatch({ type: "record.delete", recordId });
    if (result.ok) emit("record.delete", "Record deleted");
  }

  function history(kind: "undo" | "redo") {
    const result = editor[kind]();
    if (result.ok) emit(kind, kind === "undo" ? "Undone" : "Redone");
  }

  function configure(input: {
    readonly sort?: DatabaseSort | null;
    readonly filter?: DatabaseFilter | null;
    readonly propertyVisibility?: Readonly<Record<string, boolean>>;
  }) {
    const result = editor.dispatch({ type: "view.configure", viewId: view.id, ...input });
    announce(result.ok ? "View updated" : result.code);
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      history(event.shiftKey ? "redo" : "undo");
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      history("redo");
      return;
    }
    if (event.target instanceof Element && event.target.closest("input, select, button") !== null) return;
    const direction = arrowDirection(event.key);
    if (direction === null || snapshot.selection.focus === null) return;
    const next = neighbor(topology, snapshot.selection.focus, direction);
    if (next === null) return;
    event.preventDefault();
    editor.dispatch({ type: "selection.set", ...next, mode: event.shiftKey ? "extend" : "replace" });
    requestAnimationFrame(() => tableRef.current
      ?.querySelector<HTMLElement>(cellSelector(next.recordId, next.propertyId))?.focus());
  }

  if (props.loading) {
    return (
      <div className={join("jd-database", props.className)} style={props.style} data-density={props.density ?? "comfortable"} data-state="loading">
        {props.loadingState ?? <div className="jd-database__state">{props.labels.loading}</div>}
      </div>
    );
  }

  return (
    <div
      className={join("jd-database", props.className)}
      style={props.style}
      data-density={props.density ?? "comfortable"}
      data-readonly={props.readOnly ? "true" : "false"}
    >
      <div className="jd-database__toolbar" role="toolbar" aria-label="Database actions">
        {props.features.create && !props.readOnly ? <button type="button" data-kind="primary" onClick={addRecord}>{props.labels.newRecord}</button> : null}
        {props.features.delete && !props.readOnly ? <button type="button" data-kind="danger" onClick={deleteSelected}>{props.labels.deleteRecord}</button> : null}
        {props.features.history && !props.readOnly ? (
          <>
            <button type="button" disabled={!snapshot.canUndo} onClick={() => history("undo")}>{props.labels.undo}</button>
            <button type="button" disabled={!snapshot.canRedo} onClick={() => history("redo")}>{props.labels.redo}</button>
          </>
        ) : null}
        {props.features.filter ? (
          <FilterControl
            properties={document.schema.properties}
            propertyId={filterPropertyId}
            filter={view.filter}
            labels={props.labels}
            onProperty={setFilterPropertyId}
            onFilter={(filter) => configure({ filter })}
          />
        ) : null}
        {props.features.columns ? (
          <details className="jd-database__columns">
            <summary>{props.labels.columns}{hiddenProperties.length > 0 ? ` (${hiddenProperties.length} hidden)` : ""}</summary>
            <div className="jd-database__column-menu">
              {document.schema.properties.map((property) => (
                <label key={property.id}>
                  <input
                    type="checkbox"
                    checked={view.propertyVisibility[property.id] !== false}
                    onChange={(event) => configure({
                      propertyVisibility: { ...view.propertyVisibility, [property.id]: event.currentTarget.checked },
                    })}
                  />
                  {property.name}
                </label>
              ))}
            </div>
          </details>
        ) : null}
        {props.toolbar}
        <output className="jd-database__announcement" aria-live="polite">{announcement}</output>
      </div>

      <div
        className="jd-database__viewport"
        onKeyDown={keyDown}
        onCopy={(event) => {
          const clipboard = editor.copy(topology);
          if (clipboard === null) return;
          event.preventDefault();
          event.clipboardData.setData(clipboard.type, JSON.stringify(clipboard));
          event.clipboardData.setData("text/plain", clipboard.text);
          announce("Selection copied");
        }}
        onPaste={(event) => {
          if (props.readOnly) return;
          const clipboard = clipboardFromData(event.clipboardData, document, topology, snapshot.selection.focus);
          if (clipboard === null) return;
          event.preventDefault();
          const result = editor.dispatch({ type: "clipboard.paste", clipboard, topology });
          if (result.ok) emit("cell.commit", "Selection pasted");
          else announce(result.code);
        }}
      >
        <table ref={tableRef} role="grid" aria-label={props.labels.ariaLabel} aria-multiselectable="true">
          <thead>
            <tr>
              {properties.map((property) => (
                <th
                  key={property.id}
                  scope="col"
                  aria-sort={ariaSort(view.sort, property.id)}
                  style={columnStyle(property.id, properties, view.propertyWidths, props.presentation?.propertyPinned)}
                  data-pinned={props.presentation?.propertyPinned?.[property.id]}
                >
                  <button type="button" onClick={() => configure({ sort: nextSort(view.sort, property.id) })}>
                    <span>{property.name}</span>
                    <small>{property.type}{sortMark(view.sort, property.id)}</small>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} data-record-id={record.id}>
                {properties.map((property) => {
                  const key = cellKey(record.id, property.id);
                  const item = editing.getItem(key);
                  const selected = item.getIsSelected();
                  const hostRecord = hostRecordFor<Row>(record);
                  const custom = props.renderCell?.[property.id];
                  return (
                    <td
                      key={property.id}
                      role="gridcell"
                      tabIndex={item.getIsFocus() ? 0 : -1}
                      aria-selected={selected}
                      data-selected={selected ? "true" : "false"}
                      data-record-id={record.id}
                      data-property-id={property.id}
                      onClick={item.getPressHandler()}
                      onDoubleClick={() => props.onRecordOpen?.(hostRecord)}
                      style={columnStyle(property.id, properties, view.propertyWidths, props.presentation?.propertyPinned)}
                      data-pinned={props.presentation?.propertyPinned?.[property.id]}
                    >
                      {custom ? custom({
                        property,
                        record: hostRecord,
                        value: record.values[property.id] as string | number | boolean,
                        selected,
                        commit: (value) => commit(record.id, property.id, value),
                      }) : (
                        <DefaultCell
                          property={property}
                          record={record}
                          readOnly={props.readOnly ?? false}
                          commit={(value) => commit(record.id, property.id, value)}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 ? <div className="jd-database__state">{props.emptyState ?? props.labels.empty}</div> : null}
      </div>
    </div>
  );
}

function DefaultCell(props: {
  readonly property: DatabaseProperty;
  readonly record: DatabaseRecord;
  readonly readOnly: boolean;
  readonly commit: (value: string | number | boolean) => void;
}) {
  const value = props.record.values[props.property.id] as string | number | boolean;
  const label = `${props.property.name} ${props.record.id}`;
  if (props.readOnly) return <span className="jd-database__readonly">{String(value)}</span>;
  if (props.property.type === "checkbox") {
    return <input type="checkbox" aria-label={label} checked={Boolean(value)} onChange={(event) => props.commit(event.currentTarget.checked)} />;
  }
  if (props.property.type === "select") {
    return (
      <select aria-label={label} value={String(value)} onChange={(event) => props.commit(event.currentTarget.value)}>
        {props.property.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    );
  }
  return (
    <input
      key={String(value)}
      type={props.property.type === "number" ? "number" : "text"}
      aria-label={label}
      defaultValue={String(value)}
      onBlur={(event) => commitInput(event, props.property, props.commit)}
      onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
    />
  );
}

function FilterControl(props: {
  readonly properties: ReadonlyArray<DatabaseProperty>;
  readonly propertyId: string;
  readonly filter: DatabaseFilter | null;
  readonly labels: Required<DatabaseHandLabels>;
  readonly onProperty: (id: string) => void;
  readonly onFilter: (filter: DatabaseFilter | null) => void;
}) {
  const propertyId = props.propertyId || props.filter?.propertyId || props.properties[0]?.id || "";
  const property = props.properties.find((candidate) => candidate.id === propertyId);
  const value = props.filter?.propertyId === propertyId ? props.filter.value : "";
  return (
    <div className="jd-database__filter">
      <label>
        <span className="jd-database__sr-only">{props.labels.filter}</span>
        <select aria-label="Filter property" value={propertyId} onChange={(event) => props.onProperty(event.currentTarget.value)}>
          {props.properties.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select>
      </label>
      {property ? <FilterValue property={property} value={value} onChange={(next) => props.onFilter({ propertyId, operator: "equals", value: next })} /> : null}
      <button type="button" disabled={props.filter === null} onClick={() => props.onFilter(null)}>{props.labels.clearFilter}</button>
    </div>
  );
}

function FilterValue(props: { readonly property: DatabaseProperty; readonly value: unknown; readonly onChange: (value: string | number | boolean) => void }) {
  if (props.property.type === "checkbox") {
    return (
      <select aria-label="Filter value" value={String(props.value)} onChange={(event) => props.onChange(event.currentTarget.value === "true")}>
        <option value="">Any value</option><option value="true">Checked</option><option value="false">Unchecked</option>
      </select>
    );
  }
  if (props.property.type === "select") {
    return (
      <select aria-label="Filter value" value={String(props.value)} onChange={(event) => props.onChange(event.currentTarget.value)}>
        <option value="">Any value</option>
        {props.property.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    );
  }
  return (
    <input
      aria-label="Filter value"
      type={props.property.type === "number" ? "number" : "text"}
      value={String(props.value ?? "")}
      placeholder="Equals…"
      onChange={(event) => props.onChange(props.property.type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value)}
    />
  );
}

function useEditingSnapshot(editor: DatabaseEditor) {
  const [, render] = useState(0);
  useEffect(() => editor.subscribe(() => render((value) => value + 1)), [editor]);
  return editor.snapshot;
}

function openDatabase<Row extends Record<string, unknown>>(
  schema: ZodType<Row>,
  records: ReadonlyArray<Row>,
  presentation?: DatabaseHandPresentation,
): OpenDatabase {
  const fingerprint = recordsFingerprint([records, presentation]);
  const translated = databaseDocumentFromZod(schema, records);
  if (!translated.ok) return { ok: false, message: translated.reason ?? translated.code, fingerprint };
  if (!translated.value.schema.properties.some((property) => property.id !== "id")) {
    return { ok: false, message: "Database schema needs at least one editable property.", fingerprint };
  }
  const firstView = translated.value.views[0]!;
  const available = translated.value.schema.properties.map((property) => property.id);
  const order = presentation?.propertyOrder
    ? [...presentation.propertyOrder.filter((id) => available.includes(id)), ...available.filter((id) => !presentation.propertyOrder!.includes(id))]
    : firstView.propertyOrder;
  const value: DatabaseDocument = {
    ...translated.value,
    views: [{
      ...firstView,
      propertyOrder: order,
      propertyVisibility: presentation?.propertyVisibility ?? firstView.propertyVisibility,
      propertyWidths: presentation?.propertyWidths ?? firstView.propertyWidths,
    }],
  };
  return { ok: true, editor: createDatabaseEditor(value), fingerprint };
}

function hostRecords<Row>(document: DatabaseDocument): ReadonlyArray<Row> {
  return document.records.map((record) => hostRecordFor<Row>(record));
}

function hostRecordFor<Row>(record: DatabaseRecord): Row {
  return { id: record.id, ...record.values } as Row;
}

function recordsFingerprint(records: ReadonlyArray<unknown>): string {
  return JSON.stringify(records);
}

function commitInput(event: FocusEvent<HTMLInputElement>, property: DatabaseProperty, commit: (value: string | number) => void) {
  commit(property.type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value);
}

function cellKey(recordId: string, propertyId: string): string {
  return `${recordId}\u0000${propertyId}`;
}

function parseCellKey(key: string) {
  const split = key.indexOf("\u0000");
  return { recordId: key.slice(0, split), propertyId: key.slice(split + 1) };
}

function cellSelector(recordId: string, propertyId: string): string {
  return `[data-record-id="${CSS.escape(recordId)}"][data-property-id="${CSS.escape(propertyId)}"]`;
}

function clipboardFromData(
  data: DataTransfer,
  document: DatabaseDocument,
  topology: { readonly propertyIds: ReadonlyArray<string> },
  focus: { readonly propertyId: string } | null,
) {
  const structured = data.getData("application/vnd.interactive-os.database+json");
  if (structured) {
    try {
      const value = JSON.parse(structured);
      if (value?.type === "application/vnd.interactive-os.database+json" && Array.isArray(value.cells)) return value;
    } catch {}
  }
  const text = data.getData("text/plain");
  if (!text || focus === null) return null;
  const start = topology.propertyIds.indexOf(focus.propertyId);
  if (start < 0) return null;
  const rows = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").map((line) => line.split("\t"));
  const cells = rows.map((row) => row.map((value, offset) => {
    const propertyId = topology.propertyIds[start + offset];
    const property = document.schema.properties.find((candidate) => candidate.id === propertyId);
    if (!property) return value;
    if (property.type === "number") return Number(value);
    if (property.type === "checkbox") return value === "true";
    return value;
  }));
  return { type: "application/vnd.interactive-os.database+json" as const, cells, text };
}

function arrowDirection(key: string): "up" | "down" | "left" | "right" | null {
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  return null;
}

function neighbor(topology: { readonly recordIds: ReadonlyArray<string>; readonly propertyIds: ReadonlyArray<string> }, point: { readonly recordId: string; readonly propertyId: string }, direction: "up" | "down" | "left" | "right") {
  const row = topology.recordIds.indexOf(point.recordId);
  const column = topology.propertyIds.indexOf(point.propertyId);
  if (row < 0 || column < 0) return null;
  const nextRow = Math.max(0, Math.min(topology.recordIds.length - 1, row + (direction === "up" ? -1 : direction === "down" ? 1 : 0)));
  const nextColumn = Math.max(0, Math.min(topology.propertyIds.length - 1, column + (direction === "left" ? -1 : direction === "right" ? 1 : 0)));
  const recordId = topology.recordIds[nextRow];
  const propertyId = topology.propertyIds[nextColumn];
  return recordId && propertyId ? { recordId, propertyId } : null;
}

function nextSort(sort: DatabaseSort | null, propertyId: string): DatabaseSort | null {
  if (sort?.propertyId !== propertyId) return { propertyId, direction: "ascending" };
  if (sort.direction === "ascending") return { propertyId, direction: "descending" };
  return null;
}

function ariaSort(sort: DatabaseSort | null, propertyId: string): "none" | "ascending" | "descending" {
  return sort?.propertyId === propertyId ? sort.direction : "none";
}

function sortMark(sort: DatabaseSort | null, propertyId: string): string {
  if (sort?.propertyId !== propertyId) return "";
  return sort.direction === "ascending" ? " ↑" : " ↓";
}

function join(...values: ReadonlyArray<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function columnStyle(
  propertyId: string,
  properties: ReadonlyArray<DatabaseProperty>,
  widths: Readonly<Record<string, number>>,
  pinned?: Readonly<Record<string, "start" | "end">>,
): CSSProperties {
  const width = widths[propertyId];
  const pin = pinned?.[propertyId];
  const base = width === undefined ? {} : { width, minWidth: width, maxWidth: width };
  if (pin !== "start") return base;
  const index = properties.findIndex((property) => property.id === propertyId);
  const left = properties.slice(0, index).reduce((sum, property) => sum + (widths[property.id] ?? 150), 0);
  return { ...base, position: "sticky", left, zIndex: 2 };
}
