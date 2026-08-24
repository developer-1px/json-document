# @interactive-os/json-document-zod API

**Owner:** Connector

Zod schema connector의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-zod/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `createZodValidator`

```ts
createZodValidator(schema: ZodType, options?: ZodValidatorOptions): (candidate: JSONValue) => JSONPatchValidationResult
```
## `databaseDocumentFromZod`

```ts
databaseDocumentFromZod(schema: ZodType, records: ReadonlyArray<unknown>): DatabaseDocumentFromZodResult
```
## `DatabaseDocumentFromZod`

```ts
interface DatabaseDocumentFromZod extends Record<string, JSONValue> {
  readonly schema: {
    readonly properties: ReadonlyArray<DatabasePropertyFromZod>;
  };
  readonly records: ReadonlyArray<DatabaseRecordFromZod>;
  readonly views: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly type: "table";
    readonly propertyOrder: ReadonlyArray<string>;
    readonly propertyVisibility: Readonly<Record<string, boolean>>;
    readonly propertyWidths: Readonly<Record<string, number>>;
    readonly sort: null;
    readonly filter: null;
  }>;
}
```
## `DatabaseDocumentFromZodResult`

```ts
type DatabaseDocumentFromZodResult =
  | { readonly ok: true; readonly value: DatabaseDocumentFromZod }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
      readonly pointer?: string;
    };
```
## `ZodValidatorOptions`

```ts
interface ZodValidatorOptions {
  readonly code?: string;
}
```
