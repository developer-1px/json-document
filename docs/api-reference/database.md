# @interactive-os/json-document-database API

**Owner:** Hands

Database Hand domain 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-database/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `createDatabaseResource`

```ts
createDatabaseResource<Row extends DatabaseRow, Create = Partial<Row>>(resource: DatabaseResource<Row, Create>): DatabaseResource<Row, Create>
```
## `createDatabaseView`

```ts
createDatabaseView(id: string, name: string, propertyIds: ReadonlyArray<string>, ownership?: DatabaseTableView["ownership"]): DatabaseTableView
```
## `Database`

```ts
const Database: { readonly Provider: <Row extends DatabaseRow, Create = Partial<Row>, Update = Partial<Row>>(props: DatabaseProviderProps<Row, Create, Update>) => JSX.Element; readonly Workspace: <Row extends DatabaseRow, Create = Partial<...>, Update = Partial<...>>(props: Omit<DatabaseProviderProps<Row, Create, Update>, "children...
```
## `DatabaseCapabilities`

```ts
interface DatabaseCapabilities {
  readonly read?: boolean;
  readonly create?: boolean;
  readonly update?: boolean;
  readonly delete?: boolean;
  readonly bulkDelete?: boolean;
  readonly configureView?: boolean;
  readonly saveView?: boolean;
}
```
## `DatabaseColumnProjection`

```ts
interface DatabaseColumnProjection extends Record<string, JSONValue> { readonly propertyId: string; readonly visible: boolean; readonly width: number | null; readonly pinned: "start" | "end" | null; }
```
## `DatabaseContextValue`

```ts
interface DatabaseContextValue<Row extends DatabaseRow = DatabaseRow> {
  readonly resource: DatabaseResource<Row, unknown>;
  readonly rows: ReadonlyArray<Row>;
  readonly total: number;
  readonly nextCursor?: string;
  readonly view: DatabaseTableView;
  readonly views: ReadonlyArray<DatabaseTableView>;
  readonly status: DatabaseStatus;
  readonly capabilities: Required<DatabaseCapabilities>;
  readonly selectedRowIds: ReadonlyArray<DatabaseRowId>;
  readonly activeRow: Row | null;
  readonly isCreating: boolean;
  setView(view: DatabaseTableView): void;
  saveView(view: DatabaseTableView): Promise<void>;
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
```
## `DatabaseDeleteResult`

```ts
interface DatabaseDeleteResult {
  readonly id: DatabaseRowId;
  readonly ok: boolean;
  readonly message?: string;
}
```
## `DatabaseFailureKind`

```ts
type DatabaseFailureKind = "network" | "validation" | "conflict" | "partial" | "unknown";
```
## `DatabaseFilter`

```ts
interface DatabaseFilter extends Record<string, JSONValue> { readonly id: string; readonly propertyId: string; readonly operator: DatabaseFilterOperator; readonly value: JSONValue; }
```
## `DatabaseFilterGroup`

```ts
interface DatabaseFilterGroup extends Record<string, JSONValue> { readonly id: string; readonly conjunction: "and" | "or"; readonly items: ReadonlyArray<DatabaseFilter | DatabaseFilterGroup>; }
```
## `DatabaseFilterOperator`

```ts
type DatabaseFilterOperator = "equals" | "not-equals" | "contains" | "greater-than" | "greater-than-or-equal" | "less-than" | "less-than-or-equal" | "is-empty";
```
## `DatabaseGroup`

```ts
interface DatabaseGroup extends Record<string, JSONValue> { readonly propertyId: string; readonly direction: "ascending" | "descending"; }
```
## `DatabaseHand`

```ts
DatabaseHand<Row extends Record<string, unknown>>(props: DatabaseHandProps<Row>): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `DatabaseHandCellRenderProps`

```ts
interface DatabaseHandCellRenderProps<Row> {
  readonly property: DatabaseProperty;
  readonly record: Row;
  readonly value: string | number | boolean;
  readonly selected: boolean;
  readonly commit: (value: string | number | boolean) => void;
}
```
## `DatabaseHandChange`

```ts
interface DatabaseHandChange<Row> {
  readonly records: ReadonlyArray<Row>;
  readonly origin: "cell.commit" | "record.add" | "record.delete" | "undo" | "redo";
  readonly revision: number;
  readonly updates?: ReadonlyArray<{ readonly recordId: string; readonly patch: Partial<Row> }>;
}
```
## `DatabaseHandContext`

```ts
interface DatabaseHandContext {
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
```
## `DatabaseHandDocumentChange`

```ts
interface DatabaseHandDocumentChange {
  readonly origin: DatabaseHandOrigin;
  readonly revision: number;
}
```
## `DatabaseHandDocumentSource`

```ts
interface DatabaseHandDocumentSource {
  readonly editor?: never;
  readonly document: DatabaseDocument;
  readonly viewId: string;
  readonly onDocumentChange: (document: DatabaseDocument, change: DatabaseHandDocumentChange) => void;
  readonly schema?: never;
  readonly records?: never;
}
```
## `DatabaseHandEditorSource`

```ts
interface DatabaseHandEditorSource {
  readonly editor: DatabaseEditor;
  readonly viewId: string;
  readonly document?: never;
  readonly schema?: never;
  readonly records?: never;
}
```
## `DatabaseHandFeatures`

```ts
interface DatabaseHandFeatures {
  readonly create?: boolean;
  readonly delete?: boolean;
  readonly history?: boolean;
  readonly filter?: boolean;
  readonly columns?: boolean;
}
```
## `DatabaseHandLabels`

```ts
interface DatabaseHandLabels {
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
```
## `DatabaseHandLegacySource`

```ts
interface DatabaseHandLegacySource<Row extends Record<string, unknown>> {
  readonly editor?: never;
  readonly document?: never;
  readonly viewId?: never;
  readonly schema: ZodType<Row>;
  readonly records: ReadonlyArray<Row>;
  readonly onRecordsChange?: (records: ReadonlyArray<Row>, change: DatabaseHandChange<Row>) => void;
}
```
## `DatabaseHandPresentation`

```ts
interface DatabaseHandPresentation {
  readonly propertyOrder?: ReadonlyArray<string>;
  readonly propertyVisibility?: Readonly<Record<string, boolean>>;
  readonly propertyWidths?: Readonly<Record<string, number>>;
  readonly propertyPinned?: Readonly<Record<string, "start" | "end">>;
}
```
## `DatabaseHandProps`

```ts
type DatabaseHandProps<Row extends Record<string, unknown>> = DatabaseHandCommonProps<Row> & (
  | DatabaseHandEditorSource
  | DatabaseHandDocumentSource
  | DatabaseHandLegacySource<Row>
);
```
## `DatabaseMutationContext`

```ts
interface DatabaseMutationContext {
  readonly signal: AbortSignal;
  readonly expectedVersion?: string;
}
```
## `DatabaseMutationResult`

```ts
interface DatabaseMutationResult<Row> {
  readonly row: Row;
  readonly version?: string;
}
```
## `DatabaseOperationError`

```ts
class DatabaseOperationError extends Error {
  readonly kind: DatabaseFailureKind;
  readonly fieldErrors: Readonly<Record<string, string>>;

  constructor(kind: DatabaseFailureKind, message: string, fieldErrors: Readonly<Record<string, string>> = {}) {
    super(message);
    this.name = "DatabaseOperationError";
    this.kind = kind;
    this.fieldErrors = fieldErrors;
  }
}
```
## `DatabaseOperations`

```ts
interface DatabaseOperations<Row extends DatabaseRow, Create = Partial<Row>, Update = Partial<Row>> {
  query(request: DatabaseQueryRequest): Promise<DatabaseQueryResult<Row>>;
  create(input: Create, context: DatabaseMutationContext): Promise<DatabaseMutationResult<Row>>;
  update(id: DatabaseRowId, patch: Update, context: DatabaseMutationContext): Promise<DatabaseMutationResult<Row>>;
  delete(id: DatabaseRowId, context: DatabaseMutationContext): Promise<void>;
  deleteMany?: (
    ids: ReadonlyArray<DatabaseRowId>,
    context: DatabaseMutationContext,
  ) => Promise<ReadonlyArray<DatabaseDeleteResult>>;
}
```
## `DatabaseProjection`

```ts
interface DatabaseProjection extends Record<string, JSONValue> { readonly search: string; readonly filter: DatabaseFilterGroup; readonly sorts: ReadonlyArray<DatabaseSort>; readonly groups: ReadonlyArray<DatabaseGroup>; readonly columns: ReadonlyArray<DatabaseColumnProjection>; }
```
## `DatabaseProvider`

```ts
DatabaseProvider<Row extends DatabaseRow, Create = Partial<Row>, Update = Partial<Row>>(props: DatabaseProviderProps<Row, Create, Update>): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `DatabaseProviderProps`

```ts
interface DatabaseProviderProps<Row extends DatabaseRow, Create = Partial<Row>, Update = Partial<Row>> {
  readonly resource: DatabaseResource<Row, Create>;
  readonly operations: DatabaseOperations<Row, Create, Update>;
  readonly defaultView: DatabaseTableView;
  readonly view?: DatabaseTableView;
  readonly onViewChange?: (view: DatabaseTableView) => void;
  readonly views?: ReadonlyArray<DatabaseTableView>;
  readonly onSaveView?: (view: DatabaseTableView) => Promise<void> | void;
  readonly capabilities?: DatabaseCapabilities;
  readonly pageSize?: number;
  readonly children: ReactNode;
}
```
## `DatabaseQueryRequest`

```ts
interface DatabaseQueryRequest {
  readonly view: DatabaseTableView;
  readonly cursor?: string;
  readonly pageSize: number;
  readonly signal: AbortSignal;
}
```
## `DatabaseQueryResult`

```ts
interface DatabaseQueryResult<Row> {
  readonly rows: ReadonlyArray<Row>;
  readonly total: number;
  readonly nextCursor?: string;
}
```
## `DatabaseResource`

```ts
interface DatabaseResource<Row extends DatabaseRow, Create = Partial<Row>> {
  readonly id: string;
  readonly schema: ZodType<Row>;
  readonly getRowId: (row: Row) => DatabaseRowId;
  readonly createDraft: () => Create;
}
```
## `DatabaseRow`

```ts
type DatabaseRow = Record<string, unknown>;
```
## `DatabaseRowId`

```ts
type DatabaseRowId = string;
```
## `DatabaseSort`

```ts
interface DatabaseSort extends Record<string, JSONValue> {
  readonly propertyId: string;
  readonly direction: "ascending" | "descending";
}
```
## `DatabaseStatus`

```ts
interface DatabaseStatus {
  readonly phase: "idle" | "loading" | "ready" | "refreshing" | "mutating" | "error";
  readonly message: string;
  readonly failure?: DatabaseFailureKind;
  readonly fieldErrors?: Readonly<Record<string, string>>;
}
```
## `DatabaseTableProps`

```ts
interface DatabaseTableProps<Row extends DatabaseRow> {
  readonly renderCell?: Readonly<Record<string, (props: DatabaseHandCellRenderProps<Row>) => ReactNode>>;
  readonly toolbar?: ReactNode;
  readonly className?: string;
  readonly density?: "comfortable" | "compact";
}
```
## `DatabaseTableView`

```ts
interface DatabaseTableView extends Record<string, JSONValue> { readonly id: string; readonly name: string; readonly ownership: "personal" | "shared" | "locked"; readonly layout: "table"; readonly projection: DatabaseProjection; }
```
## `useDatabase`

```ts
useDatabase<Row extends DatabaseRow = DatabaseRow>(): DatabaseContextValue<Row>
```
