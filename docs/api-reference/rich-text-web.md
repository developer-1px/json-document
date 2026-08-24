# @interactive-os/json-document-rich-text-web API

**Owner:** Adapter

Rich Text DOM adapter의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-rich-text-web/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `createRichTextClipboardCodec`

```ts
createRichTextClipboardCodec(schema?: RichTextSchema): WebClipboardCodec<RichTextClipboard>
```
## `createRichTextClipboardRepresentations`

```ts
createRichTextClipboardRepresentations(options?: { readonly createId?: () => string; readonly schema?: RichTextSchema; }): ReadonlyArray<WebClipboardRepresentation<RichTextClipboard>>
```
## `createRichTextContentEditableBinding`

```ts
createRichTextContentEditableBinding(options: { readonly root: HTMLElement; readonly editor: RichTextEditor; readonly createId?: () => string; readonly onAction?: (action: string, result?: ReturnType<RichTextEditor["dispatch"]>) => void; readonly onCompositionChange?: (composing: boolean) => void; }): RichTextContentEditableBinding
```
## `parseRichTextHTML`

```ts
parseRichTextHTML(html: string, createId: () => string, profile?: string): RichTextClipboard | null
```
## `readRichTextDOMSelection`

```ts
readRichTextDOMSelection(root: HTMLElement): RichTextSelection | null
```
## `restoreRichTextDOMSelection`

```ts
restoreRichTextDOMSelection(root: HTMLElement, selection: RichTextSelection): void
```
## `richTextClipboardCodec`

```ts
const richTextClipboardCodec: WebClipboardCodec<RichTextClipboard>
```
## `RichTextContentEditableBinding`

```ts
interface RichTextContentEditableBinding {
  isComposing(): boolean;
  syncSelection(): RichTextSelection | null;
  restoreSelection(): void;
  destroy(): void;
}
```
## `serializeRichTextSlice`

```ts
serializeRichTextSlice(slice: RichTextSlice): string
```
