# @interactive-os/json-document-tanstack-table API

**Owner:** Connector

TanStack Table connector의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-tanstack-table/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `createTableDocumentBinding`

```ts
createTableDocumentBinding(options: { readonly editor: SheetEditor; }): TableDocumentBinding
```
## `createTanStackTableConnector`

```ts
createTanStackTableConnector(document: JSONDocument): TanStackTableConnector
```
## `TableDocumentBinding`

```ts
interface TableDocumentBinding {
  readonly snapshot: EditingSnapshot<SheetSelection>;
  readonly rows: SheetRow[];
  readonly columns: ColumnDef<SheetRow, unknown>[];
  readonly tableOptions: TableDocumentOptions;
  topology(table: Table<SheetRow>): SheetTopology;
  selectedCells(table: Table<SheetRow>): ReadonlyArray<SheetCell>;
  selectCell(
    table: Table<SheetRow>,
    input: { readonly rowId: string; readonly columnId: string; readonly mode?: "replace" | "extend" | "toggle" },
  ): EditingResult<SheetSelection>;
  fillSelected(table: Table<SheetRow>, value: SheetCell["value"]): EditingResult<SheetSelection>;
  commitCell(input: { readonly rowId: string; readonly columnId: string; readonly value: SheetCell["value"] }): EditingResult<SheetSelection>;
  copy(table: Table<SheetRow>): SheetClipboard | null;
  cut(table: Table<SheetRow>): {
    readonly clipboard: SheetClipboard;
    readonly result: EditingResult<SheetSelection>;
  } | null;
  paste(table: Table<SheetRow>, clipboard: SheetClipboard): EditingResult<SheetSelection>;
  undo(): EditingResult<SheetSelection>;
  redo(): EditingResult<SheetSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<SheetSelection>) => void): () => void;
}
```
## `TableDocumentOptions`

```ts
type TableDocumentOptions = Pick<
  TableOptions<SheetRow>,
  "data" | "columns" | "getRowId" | "meta"
>;
```
## `TanStackTableConnector`

```ts
type TanStackTableConnector = TableDocumentBinding;
```
