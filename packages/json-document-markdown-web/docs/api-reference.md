# @interactive-os/json-document-markdown-web API

**탐색 분류:** Adapter

Markdown 원문과 편집 DOM·입력 binding의 대응의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-markdown-web/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `createMarkdownDOMAdapter`

```ts
createMarkdownDOMAdapter(options?: MarkdownDOMOptions): TextDOMAdapter
```
## `createMarkdownEditingBinding`

```ts
createMarkdownEditingBinding({ editor, root }: MarkdownEditingBindingOptions): ContentEditableBinding
```
## `MarkdownDOMOptions`

```ts
interface MarkdownDOMOptions {
  /** Enables task controls using the existing source editor and its history. */
  readonly editor?: TextEditor;
}
```
## `MarkdownEditingBindingOptions`

```ts
interface MarkdownEditingBindingOptions {
  readonly editor: TextEditor;
  readonly root: HTMLElement;
}
```
