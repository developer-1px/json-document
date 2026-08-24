# @interactive-os/json-document-contenteditable API

**Owner:** Adapter

contenteditable platform adapter의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-contenteditable/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `ContentEditable`

```ts
ContentEditable({ "aria-label": ariaLabel, className, document, pointer, }: ContentEditableProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `ContentEditableBinding`

```ts
interface ContentEditableBinding {
  bind(): () => void;
  handle(event: Event): ContentEditableBindingResult;
  cancel(): ContentEditableBindingResult;
  reset(): void;
}
```
## `ContentEditableBindingOptions`

```ts
interface ContentEditableBindingOptions {
  readonly document: JSONDocument;
  readonly pointer: Pointer;
  readonly root: HTMLElement;
  readonly dom?: TextDOMAdapter;
}
```
## `ContentEditableBindingResult`

```ts
type ContentEditableBindingResult =
  | { readonly ok: true; readonly kind: "no-change" | "lease-started" | "rendered" | "cancelled" | "committed" }
  | { readonly ok: false; readonly code: string; readonly reason: string };
```
## `ContentEditableProps`

```ts
interface ContentEditableProps {
  readonly document: JSONDocument;
  readonly pointer: Pointer;
  readonly className?: string;
  readonly "aria-label"?: string;
}
```
## `createContentEditableBinding`

```ts
createContentEditableBinding({ document, dom, pointer, root, }: ContentEditableBindingOptions): ContentEditableBinding
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
## `TextSelection`

```ts
interface TextSelection {
  readonly anchor: number;
  readonly focus: number;
}
```
