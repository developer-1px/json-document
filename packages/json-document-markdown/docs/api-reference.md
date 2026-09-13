# @interactive-os/json-document-markdown API

**탐색 분류:** Document Types

Markdown 원문 구문·좌표·체크·문단·목록 연산의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-markdown/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `createMarkdownParser`

```ts
createMarkdownParser(source: string): MarkdownParser
```
## `indentMarkdownList`

```ts
indentMarkdownList(source: string, selection: Selection, direction: "indent" | "outdent"): MarkdownSourceEdit | null
```
## `insertMarkdownParagraph`

```ts
insertMarkdownParagraph(source: string, selection: { readonly anchor: number; readonly focus: number; }): { readonly value: string; readonly selection: { readonly anchor: number; readonly focus: number; }; }
```
## `MarkdownChangedRange`

```ts
interface MarkdownChangedRange {
  readonly from: number;
  readonly to: number;
  readonly newTo: number;
}
```
## `MarkdownMarker`

```ts
interface MarkdownMarker {
  readonly kind: MarkdownMarkerKind;
  readonly from: number;
  readonly to: number;
  /** Decoded character reference; other marker kinds have no replacement value. */
  readonly value?: string;
}
```
## `MarkdownMarkerKind`

```ts
type MarkdownMarkerKind = "heading" | "setext" | "list" | "blockquote" | "task" | "fence" | "code" | "emphasis" | "strong" | "delete" | "link" | "image" | "definition" | "table" | "thematicBreak" | "escape" | "break" | "footnote" | "entity";
```
## `MarkdownNode`

```ts
interface MarkdownNode {
  readonly kind: MarkdownNodeKind;
  readonly from: number;
  readonly to: number;
  readonly children?: ReadonlyArray<MarkdownNode>;
  readonly value?: string;
  readonly depth?: number;
  readonly ordered?: boolean;
  readonly start?: number | null;
  readonly checked?: boolean | null;
  readonly align?: ReadonlyArray<"left" | "right" | "center" | null>;
  readonly url?: string;
  readonly title?: string | null;
  readonly alt?: string | null;
  readonly identifier?: string;
  readonly lang?: string | null;
}
```
## `MarkdownNodeKind`

```ts
type MarkdownNodeKind = "paragraph" | "heading" | "thematicBreak" | "blockquote" | "list" | "listItem" | "code" | "html" | "definition" | "text" | "emphasis" | "strong" | "delete" | "inlineCode" | "break" | "link" | "image" | "linkReference" | "imageReference" | "table" | "tableRow" | "tableCell" | "footnoteDefinition" | "footnoteReference";
```
## `MarkdownParser`

```ts
interface MarkdownParser {
  readonly projection: MarkdownProjection;
  /** Apply one replacement in the current source's half-open UTF-16 coordinates. */
  update(from: number, to: number, insert: string): MarkdownUpdate;
}
```
## `MarkdownProjection`

```ts
interface MarkdownProjection {
  readonly source: string;
  readonly nodes: ReadonlyArray<MarkdownNode>;
  readonly strong: ReadonlyArray<MarkdownStrongSpan>;
  readonly markers: ReadonlyArray<MarkdownMarker>;
}
```
## `MarkdownSourceEdit`

```ts
interface MarkdownSourceEdit {
  readonly value: string;
  readonly selection: { readonly anchor: number; readonly focus: number };
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
## `MarkdownUpdate`

```ts
interface MarkdownUpdate {
  readonly projection: MarkdownProjection;
  readonly changed: MarkdownChangedRange | null;
}
```
## `projectMarkdown`

```ts
projectMarkdown(source: string): MarkdownProjection
```
## `setMarkdownTaskChecked`

```ts
setMarkdownTaskChecked(source: string, from: number, checked: boolean): string
```
