# @interactive-os/json-document-object-document API

**탐색 분류:** Document Types

Object 문서와 Canvas 프로파일의 모델·검증·연산·projection의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 사이트에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

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
## `assertObjectStyle`

```ts
assertObjectStyle(value: unknown): asserts value is Partial<ObjectStyle>
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
  | (CanvasTextFormat & { readonly kind: "text"; readonly fontSize: number })
  | (CanvasTextFormat & { readonly kind: "rectangle" | "ellipse" | "sticky-note"; readonly textColor?: string; readonly strokeColor?: string; readonly strokeWidth?: number })
  | { readonly kind: "path"; readonly points: ReadonlyArray<ObjectPoint>; readonly strokeWidth: number }
  | { readonly kind: "image"; readonly source: string }
);
```
## `CanvasObjectKind`

```ts
type CanvasObjectKind = "text" | "rectangle" | "ellipse" | "sticky-note" | "path" | "image";
```
## `CanvasTextFormat`

```ts
interface CanvasTextFormat {
  readonly fontSize?: number;
  readonly fontWeight?: 400 | 700;
  readonly textAlign?: "left" | "center" | "right";
}
```
## `createCanvasImage`

```ts
createCanvasImage(image: { readonly source: string; readonly width: number; readonly height: number; readonly label: string; }, bounds: ObjectBounds): Extract<CanvasObjectDraft, { readonly kind: "image"; }>
```
## `createCanvasObject`

```ts
createCanvasObject(kind: Exclude<CanvasObjectKind, "path" | "image">, bounds: ObjectBounds, style: { readonly color: string; readonly label: string; readonly fontSize?: number; readonly textColor?: string; }): CanvasObjectDraft
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
## `getObjectStyle`

```ts
getObjectStyle(object: DocumentObject): Partial<ObjectStyle>
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
  | { readonly type: "style"; readonly objectIds: ReadonlyArray<string>; readonly style: Partial<ObjectStyle> }
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
## `ObjectStyle`

```ts
interface ObjectStyle {
  readonly color: string;
  /** Body text paint for filled objects; standalone text keeps its existing color field. */
  readonly textColor: string;
  readonly fontSize: number;
  readonly fontWeight: 400 | 700;
  readonly textAlign: "left" | "center" | "right";
  readonly strokeColor: string;
  readonly strokeWidth: number;
}
```
## `ObjectStyleSelection`

```ts
type ObjectStyleSelection = { readonly [Key in keyof ObjectStyle]?: ObjectStyle[Key] | null };
```
## `ObjectTextProjection`

```ts
interface ObjectTextProjection extends ObjectBounds, Pick<ObjectStyle, "fontSize" | "fontWeight" | "textAlign" | "color"> {
  readonly text: string;
  readonly verticalAlign: "top" | "center";
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
## `projectObjectText`

```ts
projectObjectText(object: DocumentObject): ObjectTextProjection | null
```
## `readObjectStyle`

```ts
readObjectStyle(objects: ReadonlyArray<DocumentObject>): ObjectStyleSelection
```
## `serializeCanvasDocument`

```ts
serializeCanvasDocument(document: CanvasDocument): string
```
## `transformObject`

```ts
transformObject<Object extends DocumentObject>(object: Object, transform: ObjectTransform): Object
```
