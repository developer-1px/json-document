# @interactive-os/json-document-database API

**탐색 분류:** Hands

Database record와 view를 편집 UI로 조합의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-database/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `createDatabaseResource`

```ts
createDatabaseResource<Row extends DatabaseRow, Create = Partial<Row>>(resource: DatabaseResource<Row, Create>): DatabaseResource<Row, Create>
```
## `createDatabaseView`

```ts
createDatabaseView(id: string, name: string, propertyIds: ReadonlyArray<string>, ownership?: DatabaseTableView["ownership"], options?: { readonly hiddenPropertyIds?: readonly string[]; }): DatabaseTableView
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
  readonly showRecordIds?: boolean;
  readonly showPropertyTypes?: boolean;
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

세 source profile 모두 다음 행 선택 계약을 지원한다.

```ts
readonly selectedRecordId?: string | null;
readonly onSelectionChange?: (recordIds: ReadonlyArray<string>) => void;
```

`selectedRecordId`에 표시 중인 행 ID를 전달하면 첫 표시 필드로 행 포커스를 복원한다.
문서 갱신으로 내부 editor가 재생성되거나 페이지가 다시 마운트되어도 같은 행을
복원한다. `null`·미지정·현재 투영에 없는 ID는 다른 행을 강제로 선택하지 않는다.
초기 선택과 외부 선택 복원은 `onSelectionChange`를 발생시키지 않는다. 사용자의
행 선택 변경만 콜백으로 전달하므로 Host는 그 값을 공유 선택 상태에 저장할 수 있다.

`features.columns: false`는 숨긴 열의 복원 표시도 생략한다. 읽기 전용 `select`
셀은 저장된 option ID를 유지하면서 해당 option의 `name`을 표시한다.

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

## 간격과 스타일 진입점

`@interactive-os/json-document-database/styles.css`는 UI Primitives 정본 `design-system.css`를 가져옵니다. 독립 Host에서도 Record detail의 역할 레이블·제목은 `contentPresentation.group`의 8px gap을 사용합니다. 레이아웃 margin으로 보정하지 않습니다.


DatabaseViewControls는 기존 projection 계약을 유지하면서 Popover, Command, Check와
fieldPresentation을 조합합니다. 각 builder는 filter/sort/group/column의 도메인 결정을
소유하고 focus·outside dismiss·Escape와 표면은 UI Primitives가 소유합니다.
DatabasePropertyControl의 form은 standard, native text lease를 쓰는 cell은 seamless
presentation을 소비합니다. 셀 높이와 구조적 선택은 DatabaseHand가 유지합니다.

Database.RecordPanel은 ProductInspector를 비모달 dialog로 조합한다. draft·validation·submit은 Database가, Escape·초기 focus·복귀는 공용 Inspector가 소유한다. [공개 API 실제 Usage](/demo/database?profile=resource)는 인메모리 transport fixture의 업무 선택·저장·취소를 시연한다.
