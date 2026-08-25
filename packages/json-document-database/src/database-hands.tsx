import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { databaseDocumentFromZod } from "@interactive-os/json-document-zod";
import { DatabaseHand, type DatabaseHandCellRenderProps } from "./database-hand.js";
import { DatabaseProvider, useDatabase, type DatabaseProviderProps } from "./database-context.js";
import type {
  DatabaseColumnProjection,
  DatabaseFilterGroup,
  DatabaseFilterOperator,
  DatabaseFilterRule,
  DatabaseRow,
  DatabaseViewDocument,
} from "./contracts.js";

export interface DatabaseTableProps<Row extends DatabaseRow> {
  readonly renderCell?: Readonly<Record<string, (props: DatabaseHandCellRenderProps<Row>) => ReactNode>>;
  readonly toolbar?: ReactNode;
  readonly className?: string;
  readonly density?: "comfortable" | "compact";
}

export function DatabaseTable<Row extends DatabaseRow>(props: DatabaseTableProps<Row>) {
  const database = useDatabase<Row>();
  const editablePropertyIds = new Set(resourceProperties(database.resource.schema).map((property) => property.id).filter((id) => id !== "id"));
  const columns = database.view.projection.columns.filter((column) => editablePropertyIds.has(column.propertyId));
  const presentation = {
    propertyOrder: columns.map((column) => column.propertyId),
    propertyVisibility: Object.fromEntries(columns.map((column) => [column.propertyId, column.visible])),
    propertyWidths: Object.fromEntries(columns.flatMap((column) => column.width === undefined ? [] : [[column.propertyId, column.width]])),
    propertyPinned: Object.fromEntries(columns.flatMap((column) => column.pinned === undefined ? [] : [[column.propertyId, column.pinned]])),
  };
  return <div className="jd-database__sheet"><DatabaseHand
    schema={database.resource.schema}
    records={database.rows}
    {...(props.className === undefined ? {} : { className: props.className })}
    {...(props.density === undefined ? {} : { density: props.density })}
    presentation={presentation}
    {...(props.renderCell === undefined ? {} : { renderCell: props.renderCell })}
    {...(props.toolbar === undefined ? {} : { toolbar: props.toolbar })}
    features={{ create: false, delete: false, history: true, filter: false, columns: false }}
    readOnly={!database.capabilities.update}
    onSelectionChange={database.selectRows}
    onRecordOpen={database.openRow}
    onRecordsChange={(next) => {
      const previous = new Map(database.rows.map((row) => [database.resource.getRowId(row), row]));
      for (const row of next) {
        const id = database.resource.getRowId(row);
        const before = previous.get(id);
        if (before && JSON.stringify(before) !== JSON.stringify(row)) {
          const patch = Object.fromEntries(Object.entries(row).filter(([key, value]) => !Object.is(before[key], value)));
          void database.update(id, patch as Partial<Row>);
          return;
        }
      }
    }}
  />
    {database.capabilities.create ? <button className="jd-database__append-row" type="button" aria-label="New record" title="New record" onClick={() => void database.create(database.resource.createDraft())}><span aria-hidden="true">＋</span></button> : null}
  </div>;
}

export function DatabaseStatusBar() {
  const database = useDatabase();
  return (
    <div className="jd-database__status" role={database.status.phase === "error" ? "alert" : "status"} data-phase={database.status.phase}>
      <span>{database.status.message}</span>
      {database.status.phase === "error" ? <button type="button" aria-label="Retry" title="Retry" onClick={() => void database.refresh()}><span aria-hidden="true">↻</span></button> : null}
    </div>
  );
}

export function DatabaseViewToolbar() {
  const database = useDatabase();
  const view = database.view;
  const properties = resourceProperties(database.resource.schema);
  const canConfigure = database.capabilities.configureView && view.ownership !== "locked";

  function projection(next: Partial<DatabaseViewDocument["projection"]>) {
    database.setView({ ...view, projection: { ...view.projection, ...next } });
  }

  return (
    <div className="jd-database__toolbar-group" aria-label="Database view">
      <label>
        <span className="jd-database__sr-only">Active view</span>
        <select
          aria-label="Active view"
          value={view.id}
          onChange={(event) => {
            const next = database.views.find((candidate) => candidate.id === event.currentTarget.value);
            if (next) database.setView(next);
          }}
        >
          {database.views.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select>
      </label>
      <input
        type="search"
        aria-label="Search records"
        placeholder="Search records…"
        value={view.projection.search}
        disabled={!canConfigure}
        onChange={(event) => projection({ search: event.currentTarget.value })}
      />
      <FilterBuilder
        value={view.projection.filter}
        propertyIds={properties.map((property) => property.id)}
        disabled={!canConfigure}
        onChange={(filter) => projection({ filter })}
      />
      <SortBuilder
        value={view.projection.sorts}
        propertyIds={properties.map((property) => property.id)}
        disabled={!canConfigure}
        onChange={(sorts) => projection({ sorts })}
      />
      <GroupBuilder
        propertyId={view.projection.groups[0]?.propertyId ?? ""}
        propertyIds={properties.map((property) => property.id)}
        disabled={!canConfigure}
        onChange={(propertyId) => projection({ groups: propertyId ? [{ propertyId, direction: "ascending" }] : [] })}
      />
      <ColumnBuilder
        columns={view.projection.columns}
        disabled={!canConfigure}
        onChange={(columns) => projection({ columns })}
      />
      {database.capabilities.saveView && view.ownership !== "locked" ? (
        <button type="button" aria-label="Save view" title="Save view" onClick={() => void database.saveView(view)}><span aria-hidden="true">✓</span></button>
      ) : <span aria-label="Locked view">Locked</span>}
    </div>
  );
}

export function DatabaseRecordActions() {
  const database = useDatabase();
  return (
    <div className="jd-database__toolbar-group" aria-label="Record actions">
      <button
        type="button"
        disabled={!database.capabilities.delete || database.selectedRowIds.length === 0 || (database.selectedRowIds.length > 1 && !database.capabilities.bulkDelete)}
        onClick={() => {
          if (window.confirm(`Delete ${database.selectedRowIds.length} selected record${database.selectedRowIds.length === 1 ? "" : "s"}?`)) {
            void database.remove(database.selectedRowIds);
          }
        }}
        aria-label="Delete selected" title="Delete selected"
      ><span aria-hidden="true">−</span>{database.selectedRowIds.length > 0 ? <small>{database.selectedRowIds.length}</small> : null}</button>
      <button type="button" aria-label="Refresh" title="Refresh" disabled={database.status.phase === "loading"} onClick={() => void database.refresh()}><span aria-hidden="true">↻</span></button>
      <span>{database.total} records</span>
    </div>
  );
}

export function DatabaseRecordPanel() {
  const database = useDatabase();
  const row = database.activeRow;
  const properties = resourceProperties(database.resource.schema).filter((property) => property.id !== "id");
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const restoreFocus = useRef<HTMLElement | null>(null);
  const identity = row === null ? null : database.resource.getRowId(row);
  useEffect(() => {
    if (row !== null || database.isCreating) {
      restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setDraft(database.isCreating ? database.resource.createDraft() as Record<string, unknown> : {});
    } else {
      restoreFocus.current?.focus();
      restoreFocus.current = null;
    }
  }, [database.isCreating, database.resource, row]);
  if (row === null && !database.isCreating) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void (identity === null ? database.create(draft) : database.update(identity, draft)).then((ok) => {
      if (ok) database.closeRecord();
    });
  }

  return (
      <section className="jd-database__record" role="dialog" aria-labelledby="jd-database-record-title" onKeyDown={(event) => {
        if (event.key === "Escape") database.closeRecord();
      }}>
        <header>
          <div><small>{identity === null ? "Create" : "Record detail"}</small><h2 id="jd-database-record-title">{identity ?? "New record"}</h2></div>
          <button type="button" autoFocus aria-label="Close record" onClick={database.closeRecord}>×</button>
        </header>
        <form onSubmit={submit}>
          {properties.map((property) => (
            <label key={property.id}>
              <span>{property.name}</span>
              {property.type === "checkbox" ? (
                <input type="checkbox" checked={Boolean(draft[property.id] ?? row?.[property.id])} onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setDraft((value) => ({ ...value, [property.id]: checked }));
                }} />
              ) : property.type === "select" ? (
                <select value={String(draft[property.id] ?? row?.[property.id] ?? "")} onChange={(event) => {
                  const next = event.currentTarget.value;
                  setDraft((value) => ({ ...value, [property.id]: next }));
                }}>
                  <option value="">Select…</option>{property.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              ) : (
                <input type={property.type === "number" ? "number" : "text"} value={String(draft[property.id] ?? row?.[property.id] ?? "")} onChange={(event) => {
                  const next = property.type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value;
                  setDraft((value) => ({ ...value, [property.id]: next }));
                }} />
              )}
              {database.status.fieldErrors?.[property.id] ? <small role="alert">{database.status.fieldErrors[property.id]}</small> : null}
            </label>
          ))}
          <footer><button type="button" onClick={database.closeRecord}>Cancel</button><button type="submit" data-kind="primary">Save record</button></footer>
        </form>
      </section>
  );
}

export function DatabaseWorkspace<Row extends DatabaseRow, Create = Partial<Row>, Update = Partial<Row>>(
  props: Omit<DatabaseProviderProps<Row, Create, Update>, "children"> & DatabaseTableProps<Row>,
) {
  const { renderCell, toolbar, className, density, ...provider } = props;
  return (
    <DatabaseProvider {...provider}>
      <div className="jd-database-workspace">
        <DatabaseTable<Row>
          toolbar={<><DatabaseRecordActions /><DatabaseViewToolbar /><DatabaseStatusBar />{toolbar}</>}
          {...(renderCell === undefined ? {} : { renderCell })}
          {...(className === undefined ? {} : { className })}
          {...(density === undefined ? {} : { density })}
        />
        <DatabasePagination />
      </div>
    </DatabaseProvider>
  );
}

export function DatabasePagination() {
  const database = useDatabase();
  if (!database.nextCursor) return null;
  return <button className="jd-database__more" type="button" onClick={() => void database.loadMore()}>Load more</button>;
}

function FilterBuilder(props: { readonly value: DatabaseFilterGroup; readonly propertyIds: ReadonlyArray<string>; readonly disabled: boolean; readonly onChange: (value: DatabaseFilterGroup) => void }) {
  const rules = props.value.items.filter((item): item is DatabaseFilterRule => "propertyId" in item);
  return <details><summary aria-label="Filter" title="Filter"><span aria-hidden="true">⌕</span>{rules.length ? <small>{rules.length}</small> : null}</summary><div className="jd-database__column-menu">
    <label>Match <select disabled={props.disabled} value={props.value.conjunction} onChange={(event) => props.onChange({ ...props.value, conjunction: event.currentTarget.value as "and" | "or" })}><option value="and">all</option><option value="or">any</option></select></label>
    {rules.map((rule) => <div key={rule.id} className="jd-database__control-row">
      <select aria-label="Filter property" disabled={props.disabled} value={rule.propertyId} onChange={(event) => props.onChange(replaceRule(props.value, { ...rule, propertyId: event.currentTarget.value }))}>{props.propertyIds.map((id) => <option key={id}>{id}</option>)}</select>
      <select aria-label="Filter operator" disabled={props.disabled} value={rule.operator} onChange={(event) => props.onChange(replaceRule(props.value, { ...rule, operator: event.currentTarget.value as DatabaseFilterOperator }))}>{["equals", "not-equals", "contains", "greater-than", "less-than", "is-empty"].map((operator) => <option key={operator}>{operator}</option>)}</select>
      {rule.operator !== "is-empty" ? <input aria-label="Filter value" disabled={props.disabled} value={String(rule.value ?? "")} onChange={(event) => props.onChange(replaceRule(props.value, { ...rule, value: event.currentTarget.value }))} /> : null}
      <button type="button" aria-label="Remove filter" onClick={() => props.onChange({ ...props.value, items: props.value.items.filter((item) => item.id !== rule.id) })}>×</button>
    </div>)}
    <button type="button" disabled={props.disabled || props.propertyIds.length === 0} onClick={() => props.onChange({ ...props.value, items: [...props.value.items, { id: crypto.randomUUID(), propertyId: props.propertyIds[0]!, operator: "equals", value: "" }] })}>Add filter</button>
  </div></details>;
}

function SortBuilder(props: { readonly value: DatabaseViewDocument["projection"]["sorts"]; readonly propertyIds: ReadonlyArray<string>; readonly disabled: boolean; readonly onChange: (value: DatabaseViewDocument["projection"]["sorts"]) => void }) {
  return <details><summary aria-label="Sort" title="Sort"><span aria-hidden="true">↕</span>{props.value.length ? <small>{props.value.length}</small> : null}</summary><div className="jd-database__column-menu">
    {props.value.map((sort, index) => <div key={`${sort.propertyId}:${index}`} className="jd-database__control-row"><select aria-label={`Sort property ${index + 1}`} value={sort.propertyId} onChange={(event) => props.onChange(props.value.map((item, position) => position === index ? { ...item, propertyId: event.currentTarget.value } : item))}>{props.propertyIds.map((id) => <option key={id}>{id}</option>)}</select><select aria-label={`Sort direction ${index + 1}`} value={sort.direction} onChange={(event) => props.onChange(props.value.map((item, position) => position === index ? { ...item, direction: event.currentTarget.value as "ascending" | "descending" } : item))}><option value="ascending">ascending</option><option value="descending">descending</option></select><button type="button" aria-label={`Remove sort ${index + 1}`} onClick={() => props.onChange(props.value.filter((_, position) => position !== index))}>×</button></div>)}
    <button type="button" disabled={props.disabled || props.propertyIds.length === 0} onClick={() => props.onChange([...props.value, { propertyId: props.propertyIds[0]!, direction: "ascending" }])}>Add sort</button>
  </div></details>;
}

function GroupBuilder(props: { readonly propertyId: string; readonly propertyIds: ReadonlyArray<string>; readonly disabled: boolean; readonly onChange: (value: string) => void }) {
  return <label><span className="jd-database__sr-only">Group</span><select aria-label="Group property" disabled={props.disabled} value={props.propertyId} onChange={(event) => props.onChange(event.currentTarget.value)}><option value="">Group</option>{props.propertyIds.map((id) => <option key={id}>{id}</option>)}</select></label>;
}

function ColumnBuilder(props: { readonly columns: ReadonlyArray<DatabaseColumnProjection>; readonly disabled: boolean; readonly onChange: (value: ReadonlyArray<DatabaseColumnProjection>) => void }) {
  return <details><summary aria-label="Columns" title="Columns"><span aria-hidden="true">▥</span></summary><div className="jd-database__column-menu">{props.columns.map((column, index) => <div key={column.propertyId} className="jd-database__control-row"><label><input type="checkbox" checked={column.visible} disabled={props.disabled} onChange={(event) => props.onChange(props.columns.map((item) => item.propertyId === column.propertyId ? { ...item, visible: event.currentTarget.checked } : item))} />{column.propertyId}</label><input aria-label={`Width ${column.propertyId}`} type="number" min="80" max="600" value={column.width ?? 160} onChange={(event) => props.onChange(props.columns.map((item) => item.propertyId === column.propertyId ? { ...item, width: Number(event.currentTarget.value) } : item))} /><button type="button" disabled={index === 0} aria-label={`Move ${column.propertyId} left`} onClick={() => props.onChange(move(props.columns, index, index - 1))}>←</button><button type="button" disabled={index === props.columns.length - 1} aria-label={`Move ${column.propertyId} right`} onClick={() => props.onChange(move(props.columns, index, index + 1))}>→</button><button type="button" aria-label={`Pin ${column.propertyId}`} onClick={() => props.onChange(props.columns.map((item) => item.propertyId === column.propertyId ? togglePin(item) : item))}>{column.pinned ? "Unpin" : "Pin"}</button></div>)}</div></details>;
}

function togglePin(column: DatabaseColumnProjection): DatabaseColumnProjection {
  if (column.pinned) {
    const { pinned: _pinned, ...rest } = column;
    return rest;
  }
  return { ...column, pinned: "start" };
}

function replaceRule(group: DatabaseFilterGroup, rule: DatabaseFilterRule): DatabaseFilterGroup {
  return { ...group, items: group.items.map((item) => item.id === rule.id ? rule : item) };
}

function move<Value>(values: ReadonlyArray<Value>, from: number, to: number): ReadonlyArray<Value> {
  const next = [...values];
  const [value] = next.splice(from, 1);
  if (value !== undefined) next.splice(to, 0, value);
  return next;
}

function resourceProperties(schema: Parameters<typeof databaseDocumentFromZod>[0]) {
  const translated = databaseDocumentFromZod(schema, []);
  return translated.ok ? translated.value.schema.properties : [];
}

export const Database = {
  Provider: DatabaseProvider,
  Workspace: DatabaseWorkspace,
  Table: DatabaseTable,
  ViewToolbar: DatabaseViewToolbar,
  RecordActions: DatabaseRecordActions,
  RecordPanel: DatabaseRecordPanel,
  StatusBar: DatabaseStatusBar,
  Pagination: DatabasePagination,
} as const;
