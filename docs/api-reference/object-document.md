# @interactive-os/json-document-object-document API

**Owner:** Document Types

Object 문서와 Canvas 프로파일의 모델·검증·연산·projection의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-object-document/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `assertCanvasDocument`

```ts
assertCanvasDocument(value: unknown): asserts value is CanvasDocument
```
## `assertCanvasImageSource`

```ts
assertCanvasImageSource(source: unknown): asserts source is string
```
## `assertObjectDocument`

```ts
assertObjectDocument(value: unknown): void
```
## `CanvasDocument`

```ts
interface CanvasDocument extends ObjectDocument {
  readonly profile: "canvas/1";
  readonly width: number;
  readonly height: number;
  readonly objects: ReadonlyArray<CanvasObject>;
}
```
## `CanvasObject`

```ts
type CanvasObject = CanvasObjectDraft & { readonly id: string };
```
## `CanvasObjectDraft`

```ts
type CanvasObjectDraft = ObjectDraft & (
  | { readonly kind: "text"; readonly fontSize: number }
  | { readonly kind: "rectangle" | "ellipse" }
  | { readonly kind: "path"; readonly points: ReadonlyArray<ObjectPoint>; readonly strokeWidth: number }
  | { readonly kind: "image"; readonly source: string }
);
```
## `CanvasObjectKind`

```ts
type CanvasObjectKind = "text" | "rectangle" | "ellipse" | "path" | "image";
```
## `createCanvasImage`

```ts
createCanvasImage(image: { readonly source: string; readonly width: number; readonly height: number; readonly label: string; }, bounds: ObjectBounds): Extract<CanvasObjectDraft, { readonly kind: "image"; }>
```
## `createCanvasObject`

```ts
createCanvasObject(kind: Exclude<CanvasObjectKind, "path" | "image">, bounds: ObjectBounds, style: { readonly color: string; readonly label: string; readonly fontSize?: number; }): CanvasObjectDraft
```
## `createCanvasPath`

```ts
createCanvasPath(points: ReadonlyArray<ObjectPoint>, style: { readonly color: string; readonly label: string; readonly strokeWidth: number; }): Extract<CanvasObjectDraft, { readonly kind: "path"; }>
```
## `DocumentObject`

```ts
interface DocumentObject extends ObjectDraft {
  readonly id: string;
}
```
## `ObjectBounds`

```ts
interface ObjectBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
```
## `ObjectDocument`

```ts
interface ObjectDocument extends Record<string, JSONValue> {
  readonly objects: ReadonlyArray<DocumentObject>;
}
```
## `ObjectDraft`

```ts
interface ObjectDraft extends ObjectBounds, Record<string, JSONValue> {
  readonly label: string;
  readonly color: string;
}
```
## `ObjectOperation`

```ts
type ObjectOperation =
  | { readonly type: "insert"; readonly objects: ReadonlyArray<DocumentObject> }
  | { readonly type: "transform"; readonly objectIds: ReadonlyArray<string>; readonly transform: ObjectTransform }
  | { readonly type: "fill"; readonly objectIds: ReadonlyArray<string>; readonly color: string }
  | { readonly type: "remove"; readonly objectIds: ReadonlyArray<string> }
  | { readonly type: "text"; readonly objectId: string; readonly text: string }
  | { readonly type: "replace"; readonly document: ObjectDocument };
```
## `ObjectOperationPlan`

```ts
type ObjectOperationPlan =
  | { readonly ok: true; readonly operations: ReadonlyArray<JSONPatchOperation> }
  | { readonly ok: false; readonly code: string; readonly reason?: string };
```
## `ObjectPoint`

```ts
interface ObjectPoint extends Record<string, JSONValue> {
  readonly x: number;
  readonly y: number;
}
```
## `ObjectTransform`

```ts
interface ObjectTransform {
  readonly dx: number;
  readonly dy: number;
  readonly dw?: number;
  readonly dh?: number;
}
```
## `parseCanvasDocument`

```ts
parseCanvasDocument(json: string): CanvasDocument
```
## `planObjectOperation`

```ts
planObjectOperation(document: ObjectDocument, operation: ObjectOperation): ObjectOperationPlan
```
## `projectObject`

```ts
projectObject(object: DocumentObject): CanvasObject
```
## `serializeCanvasDocument`

```ts
serializeCanvasDocument(document: CanvasDocument): string
```
## `transformObject`

```ts
transformObject<Object extends DocumentObject>(object: Object, transform: ObjectTransform): Object
```
