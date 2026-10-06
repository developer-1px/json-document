# @interactive-os/json-document-sheet-document API

**탐색 분류:** Document Types

표 정본 스키마·타입·검증·생성의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-sheet-document/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `assertSheetDocument`

```ts
assertSheetDocument(value: unknown): asserts value is SheetDocument
```
## `createSheetColumn`

```ts
createSheetColumn(document: SheetDocument): SheetColumn
```
## `createSheetDocument`

```ts
createSheetDocument(options?: CreateSheetDocumentOptions): SheetDocument
```
## `CreateSheetDocumentOptions`

```ts
interface CreateSheetDocumentOptions {
  readonly rows?:number;
  readonly columns?:number;
  readonly name?:string;
  readonly columnWidth?:number;
  readonly rowHeight?:number;
}
```
## `createSheetRow`

```ts
createSheetRow(document: SheetDocument): SheetRow
```
## `SheetColumn`

```ts
type SheetColumn = z.infer<typeof sheetColumnSchema>;
```
## `sheetColumnLabel`

```ts
sheetColumnLabel(index: number): string
```
## `sheetColumnSchema`

```ts
const sheetColumnSchema: z.ZodReadonly<z.ZodObject<{ id: z.ZodString; label: z.ZodString; }, z.core.$catchall<z.ZodCustom<JSONValue, JSONValue>>>>
```
## `SheetDocument`

```ts
type SheetDocument = z.infer<typeof sheetDocumentSchema>;
```
## `sheetDocumentSchema`

```ts
const sheetDocumentSchema: z.ZodReadonly<z.ZodObject<{ columns: z.ZodReadonly<z.ZodArray<z.ZodReadonly<z.ZodObject<{ id: z.ZodString; label: z.ZodString; }, z.core.$catchall<z.ZodCustom<JSONValue, JSONValue>>>>>>; rows: z.ZodReadonly<...>; }, z.core.$catchall<...>>>
```
## `SheetRow`

```ts
type SheetRow = z.infer<typeof sheetRowSchema>;
```
## `sheetRowSchema`

```ts
const sheetRowSchema: z.ZodReadonly<z.ZodObject<{ id: z.ZodString; cells: z.ZodReadonly<z.ZodRecord<z.ZodString, z.ZodCustom<JSONValue, JSONValue>>>; }, z.core.$catchall<z.ZodCustom<JSONValue, JSONValue>>>>
```
