# @interactive-os/json-document-a2ui API

**탐색 분류:** Connector

A2UI 메시지와 문서·UI projection 연결의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

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
