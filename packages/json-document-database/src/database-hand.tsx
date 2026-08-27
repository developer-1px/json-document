import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  createDatabaseEditor,
  databaseValueFromText,
  nextDatabasePropertySort,
  gridPointFromKey,
  gridPointKey,
  type DatabaseDocument,
  type DatabaseClipboard,
  type DatabaseEditor,
  type DatabaseFilter,
  type DatabaseProperty,
  type DatabaseRecord,
  type DatabaseSelection,
  type DatabaseSort,
  type DatabaseTableView,
  type EditingResult,
  type EditingSnapshot,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  createWebClipboardSurface,
  createWebKeyboardAdapter,
  databaseClipboardCodec,
  findWebGridCell,
  type WebClipboardRepresentation,
  webGridCellAddressProps,
} from "@interactive-os/json-document-web";
import { databaseDocumentFromZod } from "@interactive-os/json-document-zod";
import type { ZodType } from "zod/v4";
import type { JSONValue } from "@interactive-os/json-document";
import { ArrowDown, ArrowUp, Columns3, Minus, Plus, Redo2, Undo2, X } from "lucide-react";

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

export interface DatabaseHandContext {
  readonly snapshot: EditingSnapshot<DatabaseSelection>;
  readonly document: DatabaseDocument;
  readonly view: DatabaseTableView;
  readonly selectedCells: ReadonlyArray<{ readonly recordId: string; readonly propertyId: string }>;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly announcement: string;
  readonly result: EditingResult<DatabaseSelection> | null;
  readonly nativeTextLease: { readonly recordId: string; readonly propertyId: string; readonly composing: boolean } | null;
}

interface DatabaseHandCommonProps<Row extends Record<string, unknown>> {
  readonly onSelectionChange?: (recordIds: ReadonlyArray<string>) => void;
  readonly onRecordOpen?: (record: Row) => void;
  readonly createRecord?: () => Row;
  readonly renderCell?: Readonly<Record<string, (props: DatabaseHandCellRenderProps<Row>) => ReactNode>>;
  readonly features?: DatabaseHandFeatures;
  readonly labels?: DatabaseHandLabels;
  readonly toolbar?: ReactNode;
  readonly renderToolbar?: (context: DatabaseHandContext) => ReactNode;
  readonly renderInspector?: (context: DatabaseHandContext) => ReactNode;
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

export interface DatabaseHandEditorSource {
  readonly editor: DatabaseEditor;
  readonly viewId: string;
  readonly document?: never;
  readonly schema?: never;
  readonly records?: never;
}

export interface DatabaseHandDocumentSource {
  readonly editor?: never;
  readonly document: DatabaseDocument;
  readonly viewId: string;
  readonly onDocumentChange: (document: DatabaseDocument, change: DatabaseHandDocumentChange) => void;
  readonly schema?: never;
  readonly records?: never;
}

export interface DatabaseHandLegacySource<Row extends Record<string, unknown>> {
  readonly editor?: never;
  readonly document?: never;
  readonly viewId?: never;
  readonly schema: ZodType<Row>;
  readonly records: ReadonlyArray<Row>;
  readonly onRecordsChange?: (records: ReadonlyArray<Row>, change: DatabaseHandChange<Row>) => void;
}

export interface DatabaseHandDocumentChange {
  readonly origin: DatabaseHandOrigin;
  readonly revision: number;
}

type DatabaseHandOrigin = DatabaseHandChange<Record<string, unknown>>["origin"] | "view.configure";

export type DatabaseHandProps<Row extends Record<string, unknown>> = DatabaseHandCommonProps<Row> & (
  | DatabaseHandEditorSource
  | DatabaseHandDocumentSource
  | DatabaseHandLegacySource<Row>
);

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

const keyboard = createWebKeyboardAdapter();

export function DatabaseHand<Row extends Record<string, unknown>>(props: DatabaseHandProps<Row>) {
  if ("editor" in props && props.editor !== undefined) return <DatabaseHandEditorProfile {...props} />;
  if ("document" in props && props.document !== undefined) return <DatabaseHandDocumentProfile {...props} />;
  return <DatabaseHandLegacyProfile {...props} />;
}

function DatabaseHandEditorProfile<Row extends Record<string, unknown>>(props: DatabaseHandCommonProps<Row> & DatabaseHandEditorSource) {
  return <DatabaseTableSurface {...props} directEditing editor={props.editor} viewId={props.viewId} features={{ ...defaultFeatures, ...props.features }} labels={{ ...defaultLabels, ...props.labels }} onEmit={() => {}} />;
}

function DatabaseHandDocumentProfile<Row extends Record<string, unknown>>(props: DatabaseHandCommonProps<Row> & DatabaseHandDocumentSource) {
  const fingerprint = recordsFingerprint([props.document]);
  const [open, setOpen] = useState(() => ({ editor: createDatabaseEditor(props.document), fingerprint }));
  const lastEmitted = useRef<string | null>(null);
  useEffect(() => {
    if (lastEmitted.current === fingerprint) { lastEmitted.current = null; return; }
    if (open.fingerprint !== fingerprint) setOpen({ editor: createDatabaseEditor(props.document), fingerprint });
  }, [fingerprint, open.fingerprint, props.document]);
  return <DatabaseTableSurface {...props} directEditing editor={open.editor} viewId={props.viewId} features={{ ...defaultFeatures, ...props.features }} labels={{ ...defaultLabels, ...props.labels }} onEmit={(origin) => {
    const document = open.editor.snapshot.value as DatabaseDocument;
    lastEmitted.current = recordsFingerprint([document]);
    props.onDocumentChange(document, { origin, revision: open.editor.snapshot.revision });
  }} />;
}

function DatabaseHandLegacyProfile<Row extends Record<string, unknown>>(props: DatabaseHandCommonProps<Row> & DatabaseHandLegacySource<Row>) {
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
    <DatabaseTableSurface
      {...props}
      editor={open.editor}
      viewId={(open.editor.snapshot.value as DatabaseDocument).views[0]!.id}
      features={features}
      labels={labels}
      onEmit={(origin) => {
        if (origin === "view.configure") return;
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

function DatabaseTableSurface<Row extends Record<string, unknown>>(props: DatabaseHandCommonProps<Row> & {
  readonly editor: DatabaseEditor;
  readonly viewId: string;
  readonly directEditing?: boolean;
  readonly features: Required<DatabaseHandFeatures>;
  readonly labels: Required<DatabaseHandLabels>;
  readonly onEmit: (origin: DatabaseHandOrigin) => void;
}) {
  const { editor } = props;
  const [announcement, setAnnouncement] = useState("");
  const [lastResult, setLastResult] = useState<EditingResult<DatabaseSelection> | null>(null);
  const [nativeTextLease, setNativeTextLease] = useState<DatabaseHandContext["nativeTextLease"]>(null);
  const [filterPropertyId, setFilterPropertyId] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingInitialValue, setEditingInitialValue] = useState<string>();
  const [headerMenu, setHeaderMenu] = useState<{ readonly propertyId: string; readonly x: number; readonly y: number } | null>(null);
  const [draggedPropertyId, setDraggedPropertyId] = useState<string | null>(null);
  const resize = useRef<{ readonly propertyId: string; readonly startX: number; readonly startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const nextRecord = useRef(1);
  const snapshot = useEditingSnapshot(editor);
  const document = snapshot.value as DatabaseDocument;
  const view = document.views.find((candidate) => candidate.id === props.viewId) ?? document.views[0]!;
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
    selectedKeys: editor.selectedCellsIn(topology).map((cell) => gridPointKey(databaseGridPoint(cell))),
    focusKey: focus ? gridPointKey(databaseGridPoint(focus)) : null,
    onSelect: (key, mode) => {
      setEditingKey(null);
      const gridPoint = gridPointFromKey(key);
      if (gridPoint === null) return;
      const point = databasePoint(gridPoint);
      editor.dispatch({ type: "selection.set", ...point, mode });
    },
    keyboard: {
      resolve: keyboard.resolve,
      focusKey: () => focus ? gridPointKey(databaseGridPoint(focus)) : undefined,
      neighbor: (key, command) => {
        const gridPoint = gridPointFromKey(key);
        if (gridPoint === null) return null;
        const point = databasePoint(gridPoint);
        if (command.type === "boundary") {
          const propertyId = command.edge === "start" ? topology.propertyIds[0] : topology.propertyIds[topology.propertyIds.length - 1];
          return propertyId ? gridPointKey(databaseGridPoint({ recordId: point.recordId, propertyId })) : null;
        }
        const next = neighbor(topology, point, command.direction);
        return next ? gridPointKey(databaseGridPoint(next)) : null;
      },
      onUndo: () => history("undo"),
      onRedo: () => history("redo"),
      afterMove: (key) => {
        const point = gridPointFromKey(key);
        if (point !== null) requestAnimationFrame(() => findWebGridCell<HTMLElement>(tableRef.current, point)?.focus());
      },
    },
  });

  useEffect(() => {
    const selected = [...new Set(editor.selectedCellsIn(topology).map((cell) => cell.recordId))];
    props.onSelectionChange?.(selected);
  }, [editor, props.onSelectionChange, snapshot.selection, topology]);

  function announce(message: string) {
    setAnnouncement(message);
  }

  function observe(result: EditingResult<DatabaseSelection>) {
    setLastResult(result);
    return result;
  }

  function emit(origin: DatabaseHandChange<Row>["origin"], message: string) {
    announce(message);
    props.onEmit(origin);
  }

  function commit(recordId: string, propertyId: string, value: string | number | boolean) {
    const result = observe(editor.dispatch({ type: "cell.commit", recordId, propertyId, value }));
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
    const result = observe(editor.dispatch({
      type: "record.add",
      recordId: id,
      ...(values === undefined ? {} : { values }),
    }));
    if (result.ok) emit("record.add", "Record added");
  }

  function deleteSelected() {
    const recordId = snapshot.selection.focus?.recordId;
    if (!recordId) return announce("Select a record first");
    const result = observe(editor.dispatch({ type: "record.delete", recordId }));
    if (result.ok) emit("record.delete", "Record deleted");
  }

  function history(kind: "undo" | "redo") {
    const result = observe(editor[kind]());
    if (result.ok) emit(kind, kind === "undo" ? "Undone" : "Redone");
  }

  function configure(input: {
    readonly sort?: DatabaseSort | null;
    readonly filter?: DatabaseFilter | null;
    readonly propertyVisibility?: Readonly<Record<string, boolean>>;
    readonly propertyOrder?: ReadonlyArray<string>;
    readonly propertyWidths?: Readonly<Record<string, number>>;
  }) {
    const result = observe(editor.dispatch({ type: "view.configure", viewId: view.id, ...input }));
    if (result.ok) props.onEmit("view.configure");
    announce(result.ok ? "View updated" : result.code);
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    const control = event.target instanceof Element ? event.target.closest<HTMLElement>("input, select") : null;
    if (control && editingKey !== null) {
      if (event.key === "Escape") {
        event.preventDefault();
        setEditingKey(null);
        requestAnimationFrame(() => control.closest<HTMLElement>("[role=gridcell]")?.focus());
      }
      return;
    }
    if ((event.key === "Enter" || event.key === "F2") && snapshot.selection.focus !== null && !props.readOnly) {
      event.preventDefault();
      const key = gridPointKey(databaseGridPoint(snapshot.selection.focus));
      setEditingInitialValue(undefined);
      setEditingKey(key);
      requestAnimationFrame(() => findWebGridCell<HTMLElement>(tableRef.current, databaseGridPoint(snapshot.selection.focus!))?.querySelector<HTMLElement>("input, select")?.focus());
      return;
    }
    if (!props.readOnly && snapshot.selection.focus !== null && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const key = gridPointKey(databaseGridPoint(snapshot.selection.focus));
      setEditingInitialValue(event.key);
      setEditingKey(key);
      requestAnimationFrame(() => findWebGridCell<HTMLElement>(tableRef.current, databaseGridPoint(snapshot.selection.focus!))?.querySelector<HTMLElement>("input, select")?.focus());
      return;
    }
    editing.getKeyDownHandler()(event);
  }

  if (props.loading) {
    return (
      <div className={join("jd-database", props.className)} style={props.style} data-density={props.density ?? "comfortable"} data-state="loading">
        {props.loadingState ?? <div className="jd-database__state">{props.labels.loading}</div>}
      </div>
    );
  }

  const context: DatabaseHandContext = {
    snapshot,
    document,
    view,
    selectedCells: editor.selectedCellsIn(topology),
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    announcement,
    result: lastResult,
    nativeTextLease,
  };
  const clipboardRepresentations: ReadonlyArray<WebClipboardRepresentation<DatabaseClipboard>> = [
    databaseClipboardCodec,
    {
      mimeType: "text/plain",
      encode: (clipboard) => clipboard.text,
      decode: (text) => databaseClipboardFromText(text, document, topology, snapshot.selection.focus),
    },
  ];
  const clipboardSurface = createWebClipboardSurface({
    codec: databaseClipboardCodec,
    representations: clipboardRepresentations,
    read: () => editor.copy(topology),
    paste: (clipboard) => editor.dispatch({ type: "clipboard.paste", clipboard, topology }),
    onResult(result) {
      if (!result.ok) {
        if (result.code === "editing.rejected") announce(result.reason ?? result.code);
        return;
      }
      if (result.operation === "copy") announce("Selection copied");
      if (result.operation === "paste") emit("cell.commit", "Selection pasted");
    },
  });

  return (
    <div
      className={join("jd-database", props.className)}
      style={props.style}
      data-density={props.density ?? "comfortable"}
      data-readonly={props.readOnly ? "true" : "false"}
      data-database-table-surface=""
    >
      <div className="jd-database__toolbar" role="toolbar" aria-label="Database actions">
        {props.features.create && !props.readOnly ? <button type="button" data-kind="primary" aria-label={props.labels.newRecord} title={props.labels.newRecord} onClick={addRecord}><Plus aria-hidden="true" size={16} /></button> : null}
        {props.features.delete && !props.readOnly ? <button type="button" data-kind="danger" aria-label={props.labels.deleteRecord} title={props.labels.deleteRecord} onClick={deleteSelected}><Minus aria-hidden="true" size={16} /></button> : null}
        {props.features.history && !props.readOnly ? (
          <>
            <button type="button" aria-label={props.labels.undo} title={props.labels.undo} disabled={!snapshot.canUndo} onClick={() => history("undo")}><Undo2 aria-hidden="true" size={16} /></button>
            <button type="button" aria-label={props.labels.redo} title={props.labels.redo} disabled={!snapshot.canRedo} onClick={() => history("redo")}><Redo2 aria-hidden="true" size={16} /></button>
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
            <summary aria-label={props.labels.columns} title={props.labels.columns}><Columns3 aria-hidden="true" size={16} />{hiddenProperties.length > 0 ? <small>{hiddenProperties.length}</small> : null}</summary>
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
        {props.renderToolbar?.(context)}
        {announcement ? <output className="jd-database__announcement" aria-live="polite">{announcement}</output> : null}
      </div>

      <div
        className="jd-database__viewport"
        aria-label="Database editor"
        tabIndex={0}
        onKeyDown={keyDown}
        onCopy={clipboardSurface.onCopy}
        onPaste={props.readOnly ? undefined : clipboardSurface.onPaste}
      >
        <table ref={tableRef} role="grid" aria-label={props.labels.ariaLabel} aria-multiselectable="true">
          <thead>
            <tr>
              {properties.map((property) => (
                <th
                  key={property.id}
                  scope="col"
                  aria-label={`${property.name} ${property.type}`}
                  aria-sort={ariaSort(view.sort, property.id)}
                  draggable
                  onDragStart={() => setDraggedPropertyId(property.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggedPropertyId || draggedPropertyId === property.id) return;
                    const order = [...view.propertyOrder];
                    const from = order.indexOf(draggedPropertyId);
                    const to = order.indexOf(property.id);
                    if (from < 0 || to < 0) return;
                    order.splice(from, 1);
                    order.splice(to, 0, draggedPropertyId);
                    configure({ propertyOrder: order });
                    setDraggedPropertyId(null);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setHeaderMenu({ propertyId: property.id, x: event.clientX, y: event.clientY });
                  }}
                  style={{ ...columnStyle(property.id, properties, view.propertyWidths, props.presentation?.propertyPinned), position: "relative" }}
                  data-pinned={props.presentation?.propertyPinned?.[property.id]}
                >
                  <button type="button" onClick={() => configure({ sort: nextDatabasePropertySort(view.sort, property.id) })}>
                    <span>{property.name}</span>
                    <small>{property.type}{sortMark(view.sort, property.id)}</small>
                  </button>
                  <span
                    role="separator"
                    aria-label={`${property.name} column width`}
                    data-resize-edge="e"
                    data-property-id={property.id}
                    style={{ position: "absolute", insetBlock: 0, insetInlineEnd: 0, width: 6, cursor: "col-resize" }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      const startX = event.clientX;
                      const startWidth = view.propertyWidths[property.id] ?? 160;
                      const finish = (up: MouseEvent) => {
                        window.removeEventListener("mouseup", finish);
                        configure({ propertyWidths: { ...view.propertyWidths, [property.id]: Math.max(88, startWidth + up.clientX - startX) } });
                      };
                      window.addEventListener("mouseup", finish);
                    }}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      resize.current = { propertyId: property.id, startX: event.clientX, startWidth: view.propertyWidths[property.id] ?? 160 };
                    }}
                    onPointerMove={(event) => {
                      if (resize.current?.propertyId !== property.id) return;
                      event.currentTarget.style.left = `${event.clientX - resize.current.startX}px`;
                    }}
                    onPointerUp={(event) => {
                      const active = resize.current;
                      resize.current = null;
                      event.currentTarget.style.left = "";
                      if (!active) return;
                      configure({ propertyWidths: { ...view.propertyWidths, [property.id]: Math.max(88, active.startWidth + event.clientX - active.startX) } });
                    }}
                  />
                </th>
              ))}
              {hiddenProperties.map((property) => (
                <th key={property.id} scope="col" aria-label={`Show ${property.name}`} onClick={() => configure({ propertyVisibility: { ...view.propertyVisibility, [property.id]: true } })}>·</th>
              ))}
              <th scope="col">Row</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} data-record-id={record.id}>
                {properties.map((property) => {
                  const point = databaseGridPoint({ recordId: record.id, propertyId: property.id });
                  const key = gridPointKey(point);
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
                      {...webGridCellAddressProps(point)}
                      data-record-id={record.id}
                      data-property-id={property.id}
                      onClick={item.getPressHandler()}
                      data-editing={editingKey === key ? "true" : "false"}
                      onDoubleClick={() => {
                        if (props.readOnly) return props.onRecordOpen?.(hostRecord);
                        setEditingInitialValue(undefined);
                        setEditingKey(key);
                        requestAnimationFrame(() => findWebGridCell<HTMLElement>(tableRef.current, point)?.querySelector<HTMLElement>("input, select")?.focus());
                      }}
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
                          editing={editingKey === key}
                          directEditing={props.directEditing ?? false}
                          {...(editingKey === key && editingInitialValue !== undefined ? { initialValue: editingInitialValue } : {})}
                          commit={(value) => commit(record.id, property.id, value)}
                          onLease={(composing) => setNativeTextLease(composing === null ? null : { recordId: record.id, propertyId: property.id, composing })}
                          finish={() => { setEditingKey(null); setEditingInitialValue(undefined); }}
                          moveAfterCommit={(direction) => {
                            const next = neighbor(topology, { recordId: record.id, propertyId: property.id }, direction);
                            if (!next) return;
                            editor.dispatch({ type: "selection.set", ...next, mode: "replace" });
                            requestAnimationFrame(() => findWebGridCell<HTMLElement>(tableRef.current, databaseGridPoint(next))?.focus());
                          }}
                        />
                      )}
                    </td>
                  );
                })}
                {hiddenProperties.map((property) => <td key={property.id} />)}
                <td>{record.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 ? <div className="jd-database__state">{props.emptyState ?? props.labels.empty}</div> : null}
        {headerMenu ? (() => {
          const property = document.schema.properties.find((candidate) => candidate.id === headerMenu.propertyId);
          if (!property) return null;
          return <div role="menu" aria-label={`${property.name} property`} className="jd-database__column-menu" style={{ position: "fixed", left: headerMenu.x, top: headerMenu.y }}>
            <button type="button" role="menuitem" onClick={() => { configure({ propertyVisibility: { ...view.propertyVisibility, [property.id]: false } }); setHeaderMenu(null); }}>Hide</button>
            {filterItems(property).map((item) => <button key={String(item.value)} type="button" role="menuitem" onClick={() => { configure({ filter: { propertyId: property.id, operator: "equals", value: item.value } }); setHeaderMenu(null); }}>Filter {item.label}</button>)}
            {view.filter?.propertyId === property.id ? <button type="button" role="menuitem" onClick={() => { configure({ filter: null }); setHeaderMenu(null); }}>Clear filter</button> : null}
          </div>;
        })() : null}
      </div>
      {props.renderInspector?.(context)}
    </div>
  );
}

function DefaultCell(props: {
  readonly property: DatabaseProperty;
  readonly record: DatabaseRecord;
  readonly readOnly: boolean;
  readonly editing: boolean;
  readonly directEditing: boolean;
  readonly initialValue?: string;
  readonly commit: (value: string | number | boolean) => void;
  readonly onLease: (composing: boolean | null) => void;
  readonly finish: () => void;
  readonly moveAfterCommit: (direction: "up" | "down" | "left" | "right") => void;
}) {
  const value = props.record.values[props.property.id] as string | number | boolean;
  const label = `${props.property.name} ${props.record.id}`;
  function cancel(event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    const cell = event.currentTarget.closest<HTMLElement>("[role=gridcell]");
    props.finish();
    requestAnimationFrame(() => cell?.focus());
  }
  function finish(next: string | number | boolean, control: HTMLInputElement | HTMLSelectElement) {
    const cell = control.closest<HTMLElement>("[role=gridcell]");
    props.commit(next);
    props.finish();
    requestAnimationFrame(() => cell?.focus());
  }
  if (props.readOnly || (!props.editing && !props.directEditing)) return <span className="jd-database__readonly">{String(value)}</span>;
  if (props.property.type === "checkbox") {
    return <input key={String(value)} type="checkbox" aria-label={label} defaultChecked={Boolean(value)} onKeyDown={cancel} onChange={(event) => finish(event.currentTarget.checked, event.currentTarget)} onBlur={props.finish} />;
  }
  if (props.property.type === "select") {
    return (
      <select key={String(value)} aria-label={label} defaultValue={String(value)} onKeyDown={cancel} onChange={(event) => finish(event.currentTarget.value, event.currentTarget)} onBlur={props.finish}>
        {props.property.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    );
  }
  return (
    <input
      key={String(value)}
      type={props.property.type === "number" ? "number" : "text"}
      aria-label={label}
      defaultValue={props.initialValue ?? String(value)}
      autoFocus={props.editing}
      onFocus={() => (props.property.type === "title" || props.property.type === "text") && props.onLease(false)}
      onCompositionStart={() => props.onLease(true)}
      onCompositionEnd={() => props.onLease(false)}
      onBlur={(event) => {
        if (props.directEditing) props.commit(databaseValueFromText(props.property, event.currentTarget.value));
        props.onLease(null);
        props.finish();
      }}
      onKeyDown={(event) => {
        cancel(event);
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          finish(databaseValueFromText(props.property, event.currentTarget.value), event.currentTarget);
          props.moveAfterCommit(event.key === "Tab" ? (event.shiftKey ? "left" : "right") : (event.shiftKey ? "up" : "down"));
        }
      }}
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
      {props.filter ? <button type="button" aria-label={props.labels.clearFilter} title={props.labels.clearFilter} onClick={() => props.onFilter(null)}><X aria-hidden="true" size={16} /></button> : null}
    </div>
  );
}

function FilterValue(props: { readonly property: DatabaseProperty; readonly value: unknown; readonly onChange: (value: string | number | boolean) => void }) {
  if (props.property.type === "checkbox") {
    return (
      <select aria-label="Filter value" value={String(props.value)} onChange={(event) => props.onChange(databaseValueFromText(props.property, event.currentTarget.value))}>
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
      onChange={(event) => props.onChange(databaseValueFromText(props.property, event.currentTarget.value))}
    />
  );
}

function filterItems(property: DatabaseProperty): ReadonlyArray<{ readonly label: string; readonly value: string | boolean }> {
  if (property.type === "select") return property.options.map((option) => ({ label: option.name, value: option.id }));
  if (property.type === "checkbox") return [{ label: "checked", value: true }, { label: "unchecked", value: false }];
  return [];
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

function databaseGridPoint(point: { readonly recordId: string; readonly propertyId: string }) {
  return { rowId: point.recordId, columnId: point.propertyId };
}

function databasePoint(point: { readonly rowId: string; readonly columnId: string }) {
  return { recordId: point.rowId, propertyId: point.columnId };
}

function databaseClipboardFromText(
  text: string,
  document: DatabaseDocument,
  topology: { readonly propertyIds: ReadonlyArray<string> },
  focus: { readonly propertyId: string } | null,
) {
  if (!text || focus === null) return null;
  const start = topology.propertyIds.indexOf(focus.propertyId);
  if (start < 0) return null;
  const rows = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").map((line) => line.split("\t"));
  const cells = rows.map((row) => row.map((value, offset) => {
    const propertyId = topology.propertyIds[start + offset];
    const property = document.schema.properties.find((candidate) => candidate.id === propertyId);
    if (!property) return value;
    return databaseValueFromText(property, value);
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

function neighbor(topology: { readonly recordIds: ReadonlyArray<string>; readonly propertyIds: ReadonlyArray<string> }, point: { readonly recordId: string; readonly propertyId: string }, direction: "up" | "down" | "left" | "right" | "previous" | "next") {
  const row = topology.recordIds.indexOf(point.recordId);
  const column = topology.propertyIds.indexOf(point.propertyId);
  if (row < 0 || column < 0) return null;
  const vertical = direction === "up" ? -1 : direction === "down" ? 1 : 0;
  const horizontal = direction === "left" || direction === "previous" ? -1 : direction === "right" || direction === "next" ? 1 : 0;
  const nextRow = Math.max(0, Math.min(topology.recordIds.length - 1, row + vertical));
  const nextColumn = Math.max(0, Math.min(topology.propertyIds.length - 1, column + horizontal));
  const recordId = topology.recordIds[nextRow];
  const propertyId = topology.propertyIds[nextColumn];
  return recordId && propertyId ? { recordId, propertyId } : null;
}

function ariaSort(sort: DatabaseSort | null, propertyId: string): "none" | "ascending" | "descending" {
  return sort?.propertyId === propertyId ? sort.direction : "none";
}

function sortMark(sort: DatabaseSort | null, propertyId: string): ReactNode {
  if (sort?.propertyId !== propertyId) return null;
  return sort.direction === "ascending" ? <ArrowUp aria-hidden="true" size={10} /> : <ArrowDown aria-hidden="true" size={10} />;
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
