# @interactive-os/json-document-contenteditable-collaboration API

**Owner:** Collaboration

collaborative contenteditable lease의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/contenteditable-collaboration/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `ContentEditableAdapter`

```ts
interface ContentEditableAdapter {
  bind(): () => void;
  handle(event: Event): ContentEditableResult;
  cancel(): ContentEditableResult;
  reset(): void;
}
```
## `ContentEditableOptions`

```ts
interface ContentEditableOptions {
  readonly runtime: TextRuntime;
  readonly pointer: Pointer;
  readonly root: HTMLElement;
  readonly dom?: TextDOMAdapter;
  readonly onResult?: (
    result: ContentEditableResult,
  ) => void;
}
```
## `ContentEditableResult`

```ts
type ContentEditableResult =
  | {
      readonly ok: true;
      readonly kind:
        | "no-change"
        | "lease-started"
        | "rendered"
        | "cancelled";
    }
  | {
      readonly ok: true;
      readonly kind: "committed";
      readonly changeId: ChangeId | null;
      readonly didChangeDocument: boolean;
      readonly selection: TextSelection | null;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };
```
## `createContentEditableAdapter`

```ts
createContentEditableAdapter({ dom, onResult, pointer, root, runtime, }: ContentEditableOptions): ContentEditableAdapter
```
## `DOMObservation`

```ts
interface DOMObservation {
  readonly value: string;
  readonly selection: TextSelection | null;
}
```
## `plainTextDOMAdapter`

```ts
const plainTextDOMAdapter: TextDOMAdapter
```
## `TextDOMAdapter`

```ts
interface TextDOMAdapter {
  observe(root: HTMLElement): DOMObservation;
  render(root: HTMLElement, value: string): void;
  restoreSelection(root: HTMLElement, selection: TextSelection): boolean;
}
```
