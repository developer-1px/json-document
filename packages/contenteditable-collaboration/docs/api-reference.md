# @interactive-os/json-document-contenteditable-collaboration API

**탐색 분류:** Adapter

협업 문자열과 native DOM 입력 lease 연결의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

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
  render(root: HTMLElement, value: string, selection?: TextSelection | null): void;
  restoreSelection(root: HTMLElement, selection: TextSelection, options?: TextDOMSelectionOptions): boolean;
  /** Resolve one visual line while retaining the horizontal goal; null keeps native navigation. */
  resolveVerticalSelection?(root: HTMLElement, selection: TextSelection, direction: "backward" | "forward", extend: boolean): TextSelection | null;
  /** Reset the horizontal goal after another input, pointer placement, or blur. */
  resetNavigation?(root: HTMLElement): void;
  /** Resolve a source deletion range where native DOM deletion cannot preserve the projection. */
  resolveDeletionSelection?(root: HTMLElement, selection: TextSelection, direction: "backward" | "forward"): TextSelection | null;
  /** Resolve a source-coordinate step across projected DOM boundaries; null keeps native navigation. */
  resolveHorizontalSelection?(root: HTMLElement, selection: TextSelection, direction: "backward" | "forward", extend: boolean): TextSelection | null;
}
```
