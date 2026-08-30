# @interactive-os/json-document-markdown-react API

**Owner:** Artifact

스트리밍 Markdown 투영과 렌더링의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-markdown-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `MarkdownComponents`

```ts
type Components = import("./lib/index.js").Components;
```
## `MarkdownRenderer`

```ts
MarkdownRenderer({ className, components, content, rehypePlugins, streaming }: MarkdownRendererProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `MarkdownRendererProps`

```ts
type MarkdownRendererProps = Readonly<{
  className?: string;
  components?: Components;
  content?: string | null;
  rehypePlugins?: Options["rehypePlugins"];
  streaming?: boolean;
}>;
```
## `projectStreamingMarkdown`

```ts
projectStreamingMarkdown(source: string, streaming?: boolean): StreamingMarkdownProjection
```
## `StreamingMarkdownProjection`

```ts
type StreamingMarkdownProjection = Readonly<{ markdown: string; repair: string; source: string }>;
```
