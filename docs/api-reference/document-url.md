# @interactive-os/json-document-url API

**탐색 분류:** JSON Document

DOM 독립 문서 URL 허용 정책의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 사이트에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-url/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `DocumentURLPolicy`

```ts
interface DocumentURLPolicy {
  readonly schemes: readonly string[];
  readonly relative: "any" | "explicit";
  readonly controlCharacters: "reject" | "ignore-for-scheme";
}
```
## `resolveDocumentURL`

```ts
resolveDocumentURL(value: string | null | undefined, policy: DocumentURLPolicy): string | undefined
```
