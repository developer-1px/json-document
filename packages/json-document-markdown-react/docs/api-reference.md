# @interactive-os/json-document-markdown-react API

**탐색 분류:** Connector

Markdown 렌더링·편집 표면과 React 수명 연결의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-markdown-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `MarkdownComponents`

```ts
type Components = import("./lib/index.js").Components;
```
## `MarkdownEditingSurface`

```ts
MarkdownEditingSurface({ editor, style, ...props }: MarkdownEditingSurfaceProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `MarkdownEditingSurfaceProps`

```ts
interface MarkdownEditingSurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "contentEditable"> {
  readonly editor: TextEditor;
}
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
