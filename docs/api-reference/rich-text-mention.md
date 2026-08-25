# @interactive-os/json-document-rich-text-mention API

**Owner:** Hands

Rich Text entity mention schema와 삽입 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-rich-text-mention/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `createRichTextMentionNode`

```ts
createRichTextMentionNode(mention: RichTextMention, nodeId: string): RichTextNode
```
## `findRichTextMentionTrigger`

```ts
findRichTextMentionTrigger(document: import("@interactive-os/json-document-rich-text").RichTextDocument, selection: RichTextSelection): RichTextSuggestionTrigger | null
```
## `insertRichTextMention`

```ts
insertRichTextMention(editor: RichTextEditor, range: RichTextMentionRange, mention: RichTextMention, options: { readonly createId: () => string; }): ReturnType<RichTextEditor["dispatch"]>
```
## `insertRichTextMentionSuggestion`

```ts
insertRichTextMentionSuggestion(editor: RichTextEditor, trigger: RichTextSuggestionTrigger, suggestion: RichTextMentionSuggestion, options: { readonly createId: () => string; }): ReturnType<RichTextEditor["dispatch"]>
```
## `isRichTextMentionNode`

```ts
isRichTextMentionNode(node: RichTextNode): boolean
```
## `resolveRichTextMentionSuggestions`

```ts
resolveRichTextMentionSuggestions<Suggestion extends RichTextMentionSuggestion>(trigger: RichTextSuggestionTrigger | null, suggestions: ReadonlyArray<Suggestion>): ReadonlyArray<Suggestion>
```
## `RICH_TEXT_MENTION_NODE`

```ts
const RICH_TEXT_MENTION_NODE: "os.interactive/mention"
```
## `RichTextMention`

```ts
interface RichTextMention {
  readonly id: string;
  readonly label: string;
}
```
## `richTextMentionNodeSpec`

```ts
const richTextMentionNodeSpec: RichTextNodeSpec
```
## `RichTextMentionRange`

```ts
interface RichTextMentionRange {
  readonly nodeId: string;
  readonly from: number;
  readonly to: number;
}
```
## `RichTextMentionSuggestion`

```ts
interface RichTextMentionSuggestion extends RichTextMention, RichTextSuggestionCandidate {
  readonly description?: string;
  readonly iconUrl?: string;
  readonly iconText?: string;
}
```
