import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  DatabaseCapabilities,
  DatabaseFailureKind,
  DatabaseOperations,
  DatabaseResource,
  DatabaseRow,
  DatabaseRowId,
  DatabaseViewDocument,
} from "./contracts.js";
import { DatabaseOperationError } from "./contracts.js";

export interface DatabaseStatus {
  readonly phase: "idle" | "loading" | "ready" | "refreshing" | "mutating" | "error";
  readonly message: string;
  readonly failure?: DatabaseFailureKind;
  readonly fieldErrors?: Readonly<Record<string, string>>;
}

export interface DatabaseContextValue<Row extends DatabaseRow = DatabaseRow> {
  readonly resource: DatabaseResource<Row, unknown>;
  readonly rows: ReadonlyArray<Row>;
  readonly total: number;
  readonly nextCursor?: string;
  readonly view: DatabaseViewDocument;
  readonly views: ReadonlyArray<DatabaseViewDocument>;
  readonly status: DatabaseStatus;
  readonly capabilities: Required<DatabaseCapabilities>;
  readonly selectedRowIds: ReadonlyArray<DatabaseRowId>;
  readonly activeRow: Row | null;
  readonly isCreating: boolean;
  setView(view: DatabaseViewDocument): void;
  saveView(view: DatabaseViewDocument): Promise<void>;
  selectRows(ids: ReadonlyArray<DatabaseRowId>): void;
  openRow(row: Row | null): void;
  startCreate(): void;
  closeRecord(): void;
  refresh(): Promise<void>;
  loadMore(): Promise<void>;
  create(input: unknown): Promise<boolean>;
  update(id: DatabaseRowId, patch: Partial<Row>): Promise<boolean>;
  remove(ids: ReadonlyArray<DatabaseRowId>): Promise<boolean>;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

const defaultCapabilities: Required<DatabaseCapabilities> = {
  read: true,
  create: true,
  update: true,
  delete: true,
  bulkDelete: true,
  configureView: true,
  saveView: true,
};

export interface DatabaseProviderProps<Row extends DatabaseRow, Create = Partial<Row>, Update = Partial<Row>> {
  readonly resource: DatabaseResource<Row, Create>;
  readonly operations: DatabaseOperations<Row, Create, Update>;
  readonly defaultView: DatabaseViewDocument;
  readonly view?: DatabaseViewDocument;
  readonly onViewChange?: (view: DatabaseViewDocument) => void;
  readonly views?: ReadonlyArray<DatabaseViewDocument>;
  readonly onSaveView?: (view: DatabaseViewDocument) => Promise<void> | void;
  readonly capabilities?: DatabaseCapabilities;
  readonly pageSize?: number;
  readonly children: ReactNode;
}

export function DatabaseProvider<Row extends DatabaseRow, Create = Partial<Row>, Update = Partial<Row>>(
  props: DatabaseProviderProps<Row, Create, Update>,
) {
  const [internalView, setInternalView] = useState(props.defaultView);
  const activeView = props.view ?? internalView;
  const [rows, setRows] = useState<ReadonlyArray<Row>>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string>();
  const [status, setStatus] = useState<DatabaseStatus>({ phase: "idle", message: "Database ready" });
  const [selectedRowIds, setSelectedRowIds] = useState<ReadonlyArray<string>>([]);
  const [activeRow, setActiveRow] = useState<Row | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const requestSequence = useRef(0);
  const queryController = useRef<AbortController | null>(null);
  const rowVersions = useRef(new Map<string, string>());
  const capabilities = { ...defaultCapabilities, ...props.capabilities };

  const query = useCallback(async (cursor?: string, append = false) => {
    if (!capabilities.read) return;
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    queryController.current?.abort();
    const controller = new AbortController();
    queryController.current = controller;
    setStatus({ phase: rows.length === 0 ? "loading" : "refreshing", message: append ? "Loading more records…" : "Refreshing records…" });
    try {
      const result = await props.operations.query({
        view: activeView,
        ...(cursor === undefined ? {} : { cursor }),
        pageSize: props.pageSize ?? 50,
        signal: controller.signal,
      });
      if (sequence !== requestSequence.current) return;
      setRows((current) => append ? mergeRows(current, result.rows, props.resource.getRowId) : result.rows);
      setTotal(result.total);
      setNextCursor(result.nextCursor);
      setStatus({ phase: "ready", message: `${result.total} records loaded` });
    } catch (error) {
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      setStatus(failureStatus(error, "Records could not be loaded"));
    }
  }, [activeView, capabilities.read, props.operations, props.pageSize, rows.length]);

  useEffect(() => {
    void query();
    return () => queryController.current?.abort();
  }, [activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  function setView(next: DatabaseViewDocument) {
    if (!capabilities.configureView || activeView.ownership === "locked") return;
    if (props.view === undefined) setInternalView(next);
    props.onViewChange?.(next);
  }

  async function saveView(next: DatabaseViewDocument) {
    if (!capabilities.saveView || next.ownership === "locked") return;
    await props.onSaveView?.(next);
    setStatus({ phase: "ready", message: `View ${next.name} saved` });
  }

  async function create(input: unknown): Promise<boolean> {
    if (!capabilities.create) return false;
    const controller = new AbortController();
    setStatus({ phase: "mutating", message: "Creating record…" });
    try {
      const result = await props.operations.create(input as Create, { signal: controller.signal });
      const id = props.resource.getRowId(result.row);
      if (result.version) rowVersions.current.set(id, result.version);
      setRows((current) => [result.row, ...current]);
      setTotal((value) => value + 1);
      setStatus({ phase: "ready", message: "Record created" });
      return true;
    } catch (error) {
      setStatus(failureStatus(error, "Record could not be created"));
      return false;
    }
  }

  async function update(id: string, patch: Partial<Row>): Promise<boolean> {
    if (!capabilities.update) return false;
    const before = rows;
    setRows((current) => current.map((row) => props.resource.getRowId(row) === id ? { ...row, ...patch } : row));
    setStatus({ phase: "mutating", message: "Saving changes…" });
    try {
      const expectedVersion = rowVersions.current.get(id);
      const result = await props.operations.update(id, patch as Update, {
        signal: new AbortController().signal,
        ...(expectedVersion === undefined ? {} : { expectedVersion }),
      });
      if (result.version) rowVersions.current.set(id, result.version);
      setRows((current) => current.map((row) => props.resource.getRowId(row) === id ? result.row : row));
      setStatus({ phase: "ready", message: "Changes saved" });
      return true;
    } catch (error) {
      setRows(before);
      setStatus(failureStatus(error, "Changes were rolled back"));
      return false;
    }
  }

  async function remove(ids: ReadonlyArray<string>): Promise<boolean> {
    if (!capabilities.delete || ids.length === 0) return false;
    const before = rows;
    const selected = new Set(ids);
    setRows((current) => current.filter((row) => !selected.has(props.resource.getRowId(row))));
    setStatus({ phase: "mutating", message: `Deleting ${ids.length} record${ids.length === 1 ? "" : "s"}…` });
    try {
      if (ids.length > 1 && props.operations.deleteMany) {
        const results = await props.operations.deleteMany(ids, { signal: new AbortController().signal });
        const failed = results.filter((result) => !result.ok);
        if (failed.length > 0) {
          setRows(before);
          setStatus({ phase: "error", failure: "partial", message: `${failed.length} of ${ids.length} records could not be deleted` });
          return false;
        }
      } else {
        await Promise.all(ids.map((id) => props.operations.delete(id, { signal: new AbortController().signal })));
      }
      setTotal((value) => Math.max(0, value - ids.length));
      setSelectedRowIds([]);
      setStatus({ phase: "ready", message: `${ids.length} record${ids.length === 1 ? "" : "s"} deleted` });
      return true;
    } catch (error) {
      setRows(before);
      setStatus(failureStatus(error, "Delete was rolled back"));
      return false;
    }
  }

  const value = useMemo<DatabaseContextValue<Row>>(() => ({
    resource: props.resource as DatabaseResource<Row, unknown>,
    rows,
    total,
    ...(nextCursor === undefined ? {} : { nextCursor }),
    view: activeView,
    views: props.views ?? [activeView],
    status,
    capabilities,
    selectedRowIds,
    activeRow,
    isCreating,
    setView,
    saveView,
    selectRows: setSelectedRowIds,
    openRow: (row) => { setIsCreating(false); setActiveRow(row); },
    startCreate: () => { setActiveRow(null); setIsCreating(true); },
    closeRecord: () => { setActiveRow(null); setIsCreating(false); },
    refresh: () => query(),
    loadMore: () => nextCursor === undefined ? Promise.resolve() : query(nextCursor, true),
    create,
    update,
    remove,
  }), [activeRow, activeView, capabilities, isCreating, nextCursor, props.resource, props.views, rows, selectedRowIds, status, total]);

  return <DatabaseContext.Provider value={value as DatabaseContextValue}>{props.children}</DatabaseContext.Provider>;
}

export function useDatabase<Row extends DatabaseRow = DatabaseRow>(): DatabaseContextValue<Row> {
  const value = useContext(DatabaseContext);
  if (value === null) throw new Error("Database Hands must be rendered inside Database.Provider.");
  return value as DatabaseContextValue<Row>;
}

function failureStatus(error: unknown, fallback: string): DatabaseStatus {
  if (error instanceof DatabaseOperationError) {
    return {
      phase: "error",
      failure: error.kind,
      message: error.message,
      ...(Object.keys(error.fieldErrors).length === 0 ? {} : { fieldErrors: error.fieldErrors }),
    };
  }
  return { phase: "error", failure: "unknown", message: error instanceof Error ? error.message : fallback };
}

function mergeRows<Row>(
  current: ReadonlyArray<Row>,
  incoming: ReadonlyArray<Row>,
  getRowId: (row: Row) => string,
): ReadonlyArray<Row> {
  const next = [...current];
  const positions = new Map(next.map((row, index) => [getRowId(row), index]));
  for (const row of incoming) {
    const id = getRowId(row);
    const position = positions.get(id);
    if (position === undefined) {
      positions.set(id, next.length);
      next.push(row);
    } else {
      next[position] = row;
    }
  }
  return next;
}
