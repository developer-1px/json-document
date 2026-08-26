# @interactive-os/json-document API

**Owner:** JSON Document

Core document 값·주소·patch 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document/src/application/document/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `appendSegment`

```ts
appendSegment(pointer: Pointer, segment: string | number): Pointer
```
## `applyPatch`

```ts
applyPatch(value: unknown, operations: ReadonlyArray<JSONPatchOperation>): JSONPatchResult
```
## `buildPointer`

```ts
buildPointer(segments: ReadonlyArray<string | number>, options?: { readonly uriFragment?: boolean; }): Pointer
```
## `createJSONDocument`

```ts
createJSONDocument(initial: unknown, options?: JSONDocumentOptions): JSONDocument
```
## `JSONAppliedChange`

```ts
interface JSONAppliedChange {
  readonly applied: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: JSONChangeMetadata;
}
```
## `JSONChangeMetadata`

```ts
type JSONChangeMetadata = Readonly<Record<string, JSONValue>>;
```
## `JSONDocument`

```ts
interface JSONDocument {
  readonly value: JSONValue;
  at(pointer: Pointer): ReadResult;
  query(jsonPath: string): QueryResult;
  validatePatch(
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONPatchValidationResult;
  commit(
    operations: ReadonlyArray<JSONPatchOperation>,
    options?: JSONDocumentCommitOptions,
  ): JSONDocumentCommitResult;
  subscribe(listener: (change: JSONAppliedChange) => void): () => void;
}
```
## `JSONDocumentCommitOptions`

```ts
interface JSONDocumentCommitOptions {
  readonly metadata?: JSONChangeMetadata;
}
```
## `JSONDocumentCommitResult`

```ts
type JSONDocumentCommitResult =
  | { readonly ok: true; readonly change: JSONAppliedChange }
  | Extract<JSONPatchResult, { readonly ok: false }>;
```
## `JSONDocumentOptions`

```ts
interface JSONDocumentOptions {
  readonly validate?: (candidate: JSONValue) => JSONPatchValidationResult;
}
```
## `jsonEqual`

```ts
jsonEqual(left: unknown, right: unknown): boolean
```
## `JSONPatchOperation`

```ts
type JSONPatchOperation =
  | { readonly op: "add"; readonly path: Pointer; readonly value: JSONValue }
  | { readonly op: "remove"; readonly path: Pointer }
  | { readonly op: "replace"; readonly path: Pointer; readonly value: JSONValue }
  | { readonly op: "move"; readonly from: Pointer; readonly path: Pointer }
  | { readonly op: "copy"; readonly from: Pointer; readonly path: Pointer }
  | { readonly op: "test"; readonly path: Pointer; readonly value: JSONValue };
```
## `JSONPatchResult`

```ts
type JSONPatchResult =
  | {
      readonly ok: true;
      readonly value: JSONValue;
      readonly change: JSONAppliedChange;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
      readonly pointer?: Pointer;
    };
```
## `JSONPatchValidationResult`

```ts
type JSONPatchValidationResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
      readonly pointer?: Pointer;
    };
```
## `JSONValue`

```ts
type JSONValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JSONValue>
  | { readonly [key: string]: JSONValue };
```
## `parentPointer`

```ts
parentPointer(pointer: Pointer): Pointer | null
```
## `parseArrayIndex`

```ts
parseArrayIndex(segment: string): number | null
```
## `parsePointer`

```ts
parsePointer(pointer: Pointer): string[]
```
## `Pointer`

```ts
type Pointer = string;
```
## `QueryResult`

```ts
type QueryResult =
  | {
      readonly ok: true;
      readonly query: string;
      readonly pointers: ReadonlyArray<Pointer>;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
    };
```
## `ReadResult`

```ts
type ReadResult =
  | { readonly ok: true; readonly path: Pointer; readonly value: JSONValue }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
      readonly pointer?: Pointer;
    };
```
## `trackPointer`

```ts
trackPointer(pointer: Pointer, applied: ReadonlyArray<JSONPatchOperation>): Pointer | null
```
## `tryParsePointer`

```ts
tryParsePointer(pointer: Pointer): string[] | null
```
