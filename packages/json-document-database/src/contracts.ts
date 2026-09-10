import type { ZodType } from "zod/v4";
import type { DatabaseTableView } from "@interactive-os/json-document-editing";

export type DatabaseRow = Record<string, unknown>;
export type DatabaseRowId = string;

export interface DatabaseResource<Row extends DatabaseRow, Create = Partial<Row>> {
  readonly id: string;
  readonly schema: ZodType<Row>;
  readonly getRowId: (row: Row) => DatabaseRowId;
  readonly createDraft: () => Create;
}

export interface DatabaseQueryRequest {
  readonly view: DatabaseTableView;
  readonly cursor?: string;
  readonly pageSize: number;
  readonly signal: AbortSignal;
}

export interface DatabaseQueryResult<Row> {
  readonly rows: ReadonlyArray<Row>;
  readonly total: number;
  readonly nextCursor?: string;
}

export interface DatabaseMutationContext {
  readonly signal: AbortSignal;
  readonly expectedVersion?: string;
}

export interface DatabaseMutationResult<Row> {
  readonly row: Row;
  readonly version?: string;
}

export interface DatabaseDeleteResult {
  readonly id: DatabaseRowId;
  readonly ok: boolean;
  readonly message?: string;
}

export interface DatabaseOperations<Row extends DatabaseRow, Create = Partial<Row>, Update = Partial<Row>> {
  query(request: DatabaseQueryRequest): Promise<DatabaseQueryResult<Row>>;
  create(input: Create, context: DatabaseMutationContext): Promise<DatabaseMutationResult<Row>>;
  update(id: DatabaseRowId, patch: Update, context: DatabaseMutationContext): Promise<DatabaseMutationResult<Row>>;
  delete(id: DatabaseRowId, context: DatabaseMutationContext): Promise<void>;
  deleteMany?: (
    ids: ReadonlyArray<DatabaseRowId>,
    context: DatabaseMutationContext,
  ) => Promise<ReadonlyArray<DatabaseDeleteResult>>;
}

export interface DatabaseCapabilities {
  readonly read?: boolean;
  readonly create?: boolean;
  readonly update?: boolean;
  readonly delete?: boolean;
  readonly bulkDelete?: boolean;
  readonly configureView?: boolean;
  readonly saveView?: boolean;
}

export type DatabaseFailureKind = "network" | "validation" | "conflict" | "partial" | "unknown";

export class DatabaseOperationError extends Error {
  readonly kind: DatabaseFailureKind;
  readonly fieldErrors: Readonly<Record<string, string>>;

  constructor(kind: DatabaseFailureKind, message: string, fieldErrors: Readonly<Record<string, string>> = {}) {
    super(message);
    this.name = "DatabaseOperationError";
    this.kind = kind;
    this.fieldErrors = fieldErrors;
  }
}

export function createDatabaseResource<Row extends DatabaseRow, Create = Partial<Row>>(
  resource: DatabaseResource<Row, Create>,
): DatabaseResource<Row, Create> {
  return resource;
}

export function createDatabaseView(
  id: string,
  name: string,
  propertyIds: ReadonlyArray<string>,
  ownership: DatabaseTableView["ownership"] = "personal",
): DatabaseTableView {
  return {
    id,
    name,
    ownership,
    layout: "table",
    projection: {
      search: "",
      filter: { id: `${id}:root`, conjunction: "and", items: [] },
      sorts: [],
      groups: [],
      columns: propertyIds.map((propertyId) => ({ propertyId, visible: propertyId !== "id", width: null, pinned: null })),
    },
  };
}
