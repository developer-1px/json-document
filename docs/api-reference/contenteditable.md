# @interactive-os/json-document-contenteditable API

**탐색 분류:** Adapter

contenteditable platform adapter의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 사이트에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

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
  /** Optional canonical source editor; replaces direct commits with selection-restoring Editing transactions. */
  readonly editor?: TextEditor;
  /** Syntax-owned Enter command; paste and native composition text keep their original content. */
  readonly insertBreak?: (editor: TextEditor) => EditingResult<TextSelection>;
  /** Syntax-owned Tab action; null leaves native focus navigation available. */
  readonly indent?: (editor: TextEditor, direction: "indent" | "outdent") => EditingResult<TextSelection> | null;
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
createContentEditableBinding({ document, dom, pointer, root, editor, insertBreak, indent, }: ContentEditableBindingOptions): ContentEditableBinding
```
## `createTextNavigationDOMAdapter`

```ts
createTextNavigationDOMAdapter(base: TextDOMAdapter): TextDOMAdapter
```
## `createTextProjectionDOMAdapter`

```ts
createTextProjectionDOMAdapter(base: TextDOMAdapter, projections: (root: HTMLElement) => ReadonlyArray<TextProjection>): TextDOMAdapter
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
## `renderTextCaretBoundary`

```ts
renderTextCaretBoundary(root: HTMLElement, value: string): void
```
## `restoreTextDOMSelection`

```ts
restoreTextDOMSelection(root: HTMLElement, selection: TextSelection, options?: TextDOMSelectionOptions): boolean
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
## `TextDOMSelectionOptions`

```ts
interface TextDOMSelectionOptions {
  /** Undefined preserves an equivalent live DOM endpoint; explicit affinity chooses a side. */
  readonly affinity?: (offset: number) => "backward" | "forward" | undefined;
}
```
## `TextProjection`

```ts
interface TextProjection {
  readonly from: number;
  readonly to: number;
  readonly element: HTMLElement;
  /** Optional next visible source position, after a concealed separator. */
  readonly following?: number;
  /** Delete this displayed unit and its separator in one editing transaction. */
  readonly atomic?: boolean;
}
```
## `TextSelection`

```ts
type TextSelection = { readonly anchor: number; readonly focus: number };
```
