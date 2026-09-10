# @interactive-os/json-document-markdown API

**탐색 분류:** Document Types

원문 문자열이 정본인 Markdown 문법과 source 위치 projection의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 사이트에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-markdown/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `MarkdownProjection`

```ts
interface MarkdownProjection {
  readonly source: string;
  readonly strong: ReadonlyArray<MarkdownStrongSpan>;
}
```
## `MarkdownStrongSpan`

```ts
interface MarkdownStrongSpan {
  readonly from: number;
  readonly to: number;
  readonly contentFrom: number;
  readonly contentTo: number;
}
```
## `projectMarkdown`

```ts
projectMarkdown(source: string): MarkdownProjection
```
