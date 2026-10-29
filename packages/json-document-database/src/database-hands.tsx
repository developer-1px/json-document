import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { databaseDocumentFromZod } from "@interactive-os/json-document-zod";
import { ArrowLeft, ArrowRight, ArrowUpDown, Check, Columns3, ListFilter, Minus, Plus, RefreshCw, X } from "lucide-react";
import { databaseValueFromText } from "@interactive-os/json-document-editing";
import { Check as CheckControl, Command, ToolbarGroup, Search, ProductInspector, fieldPresentation, contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { DatabaseHand, type DatabaseHandCellRenderProps } from "./database-hand.js";
import { DatabaseProvider, useDatabase, type DatabaseProviderProps } from "./database-context.js";
import { DatabasePropertyControl } from "./database-property-control.js";
import { DatabaseViewControls } from "./database-view-controls.js";
import type { DatabaseRow } from "./contracts.js";

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
    propertyWidths: Object.fromEntries(columns.flatMap((column) => column.width === null ? [] : [[column.propertyId, column.width]])),
    propertyPinned: Object.fromEntries(columns.flatMap((column) => column.pinned === null ? [] : [[column.propertyId, column.pinned]])),
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
    onRecordsChange={(_next, change) => change.updates?.forEach(({ recordId, patch }) => { void database.update(recordId, patch); })}
  />
    {database.capabilities.create ? <Command className="jd-database__append-row" type="button" label="New record" onClick={() => void database.create(database.resource.createDraft())}><Plus aria-hidden="true" size={16} /></Command> : null}
  </div>;
}

export function DatabaseStatusBar() {
  const database = useDatabase();
  return (
    <div className="jd-database__status" role={database.status.phase === "error" ? "alert" : "status"} data-phase={database.status.phase}>
      <span>{database.status.message}</span>
      {database.status.phase === "error" ? <Command type="button" label="Retry" onClick={() => void database.refresh()}><RefreshCw aria-hidden="true" size={16} /></Command> : null}
    </div>
  );
}

export function DatabaseViewToolbar() {
  const database = useDatabase();
  const view = database.view;
  const properties = resourceProperties(database.resource.schema);
  const canConfigure = database.capabilities.configureView && view.ownership !== "locked";

  return (
    <ToolbarGroup className="jd-database__toolbar-group" label="Database view">
      <label>
        <span className="jd-database__sr-only">Active view</span>
        <select className={fieldPresentation.standard}
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
      <Search label="Search records" placeholder="Search records…" query={view.projection.search}
        onQueryChange={(search) => database.setView({...view, projection: {...view.projection, search}})}
        inputProps={{disabled: !canConfigure}}
      />
      <DatabaseViewControls projection={view.projection} properties={properties} disabled={!canConfigure} onChange={(next) => database.setView({ ...view, projection: next })} />
      {database.capabilities.saveView && view.ownership !== "locked" ? (
        <Command type="button" label="Save view" onClick={() => void database.saveView(view)}><Check aria-hidden="true" size={16} /></Command>
      ) : <span aria-label="Locked view">Locked</span>}
    </ToolbarGroup>
  );
}

export function DatabaseRecordActions() {
  const database = useDatabase();
  return (
    <ToolbarGroup className="jd-database__toolbar-group" label="Record actions">
      <Command
        type="button"
        disabled={!database.capabilities.delete || database.selectedRowIds.length === 0 || (database.selectedRowIds.length > 1 && !database.capabilities.bulkDelete)}
        onClick={() => {
          if (window.confirm(`Delete ${database.selectedRowIds.length} selected record${database.selectedRowIds.length === 1 ? "" : "s"}?`)) {
            void database.remove(database.selectedRowIds);
          }
        }}
        label="Delete selected"
      ><Minus aria-hidden="true" size={16} />{database.selectedRowIds.length > 0 ? <small>{database.selectedRowIds.length}</small> : null}</Command>
      <Command type="button" label="Refresh" disabled={database.status.phase === "loading"} onClick={() => void database.refresh()}><RefreshCw aria-hidden="true" size={16} /></Command>
      <span>{database.total} records</span>
    </ToolbarGroup>
  );
}

export function DatabaseRecordPanel() {
  const database = useDatabase();
  const row = database.activeRow;
  const properties = resourceProperties(database.resource.schema).filter((property) => property.id !== "id");
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const identity = row === null ? null : database.resource.getRowId(row);
  useEffect(() => {
    if (row !== null || database.isCreating) {
      setDraft(database.isCreating ? database.resource.createDraft() as Record<string, unknown> : {});
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
      <ProductInspector className="jd-database__record" role="dialog" aria-label={identity ?? "New record"} heading={identity ?? "New record"} onClose={database.closeRecord} closeLabel="Close record">
        <form onSubmit={submit}>
          {properties.map((property) => (
            <label key={property.id}>
              <span>{property.name}</span>
              <DatabasePropertyControl property={property} value={(draft[property.id] ?? row?.[property.id] ?? "") as string | number | boolean} mode="form" onChange={(next) => setDraft((value) => ({ ...value, [property.id]: next }))} />
              {database.status.fieldErrors?.[property.id] ? <small role="alert">{database.status.fieldErrors[property.id]}</small> : null}
            </label>
          ))}
          <footer><Command type="button" onClick={database.closeRecord}>Cancel</Command><Command type="submit" kind="primary">Save record</Command></footer>
        </form>
      </ProductInspector>
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
  return <div className="jd-database__pagination"><Command className="jd-database__more" type="button" onClick={() => void database.loadMore()}>Load more</Command></div>;
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
