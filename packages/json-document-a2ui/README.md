# @interactive-os/json-document-a2ui

Optional A2UI v0.9-family Connector for JSON Document. The A2UI SDK and RxJS are peers; Core remains framework- and protocol-independent.

Supported peers: JSON Document `^3.0.0`, `@a2ui/web_core ^0.10.6` and `rxjs ^7.8.2`. Node consumers need the SDK's web-platform type declarations (for example TypeScript `lib: ["ES2022", "DOM"]`); the headless contract tests run without a browser.

```sh
npm i @interactive-os/json-document @interactive-os/json-document-a2ui @a2ui/web_core rxjs
```

```ts
import { createA2uiStreamingDocumentEngine } from "@interactive-os/json-document-a2ui";

const engine = createA2uiStreamingDocumentEngine();
const subscription = engine.document$.subscribe((snapshot) => console.log(snapshot));
engine.write('{"version":"v0.9","createSurface":{"surfaceId":"main","catalogId":"my-catalog"}}\n');
engine.complete();
subscription.unsubscribe();
engine.dispose();
```

The engine owns envelope validation, JSONL buffering, message-to-patch translation and document observation. Host options supply an isolated `initialDataModel` (default `{}`) and optional `validateComponent(component, surface)` catalog policy. Component batches validate before mutation.

`dispatch(unknown)` validates through the SDK schema. `parseA2uiMessage(unknown)` exposes the same parser for non-engine consumers. Types reflect the schema output, including its optional fields. Catalog-specific component rules are not part of the envelope parser.

`document$` emits the current snapshot immediately and all subsequent document changes, including direct commits, before `message$` publishes the accepted message. No-op messages only emit on `message$`. Direct commits must preserve the streaming document shape.

`complete()` flushes a final line without closing the engine. `dispose()` is idempotent, detaches document observation, discards pending input and completes both streams. Later engine inputs throw `a2ui.disposed`; the exposed JSONDocument remains usable.

JSON, schema, catalog and commit errors throw synchronously. Each message is atomic, not each chunk. Earlier successful lines remain; later complete lines in a failed chunk are discarded while its incomplete tail remains buffered. A failed complete tail is discarded. Correct the input and send a new message; errors do not terminate the Observables.

Surface/component IDs use Core JSON Pointer escaping. A2UI data-model paths use JSON Pointer; `""` and `"/"` address the model root. Explicit `null` is stored, omitted values delete (or replace the model root with null).

- [Usage](https://developer-1px.github.io/json-document/docs/connector-a2ui)
- [API reference](https://developer-1px.github.io/json-document/docs/api/a2ui)
- [Canonical source](src/index.ts)
