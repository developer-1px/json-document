# @interactive-os/json-document-a2ui API

**Owner:** Connector

A2UI streaming document connector의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-a2ui/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `A2uiComponent`

```ts
type A2uiComponent = Readonly<{ id?: string | undefined; component: string; [key: string]: unknown }>;
```
## `A2uiMessage`

```ts
type A2uiMessage = ReturnType<typeof A2uiMessageSchema.parse>;
```
## `A2uiStreamingDocument`

```ts
type A2uiStreamingDocument = Readonly<{ surfaces: Readonly<Record<string, A2uiSurfaceDocument>> }>;
```
## `A2uiStreamingDocumentEngine`

```ts
interface A2uiStreamingDocumentEngine {
  readonly message$: Observable<A2uiMessage>;
  readonly document$: Observable<A2uiStreamingDocument>;
  readonly document: JSONDocument;
  dispatch(message: unknown): void;
  write(chunk: string): void;
  complete(): void;
  dispose(): void;
}
```
## `A2uiStreamingDocumentOptions`

```ts
interface A2uiStreamingDocumentOptions {
  readonly initialDataModel?: JSONValue;
  readonly validateComponent?: (component: A2uiComponent, surface: A2uiSurfaceDocument) => void;
}
```
## `A2uiSurfaceDocument`

```ts
type A2uiSurfaceDocument = Readonly<{
  catalogId: string;
  theme?: JSONValue;
  sendDataModel?: boolean;
  components: Readonly<Record<string, A2uiComponent>>;
  dataModel: JSONValue;
}>;
```
## `createA2uiStreamingDocumentEngine`

```ts
createA2uiStreamingDocumentEngine(options?: A2uiStreamingDocumentOptions): A2uiStreamingDocumentEngine
```
## `parseA2uiMessage`

```ts
parseA2uiMessage(candidate: unknown): A2uiMessage
```
