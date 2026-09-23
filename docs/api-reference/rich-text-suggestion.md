# @interactive-os/json-document-rich-text-suggestion API

**Owner:** Hands

Rich Text suggestion trigger와 상태 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-rich-text-suggestion/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `activateRichTextSuggestion`

```ts
activateRichTextSuggestion(state: RichTextSuggestionState, trigger: RichTextSuggestionTrigger | null, activeId: string | null): RichTextSuggestionState
```
## `createRichTextMentionNode`

```ts
createRichTextMentionNode(mention: RichTextMention, nodeId: string): RichTextNode
```
## `dismissRichTextSuggestions`

```ts
dismissRichTextSuggestions(state: RichTextSuggestionState, trigger: RichTextSuggestionTrigger | null): RichTextSuggestionState
```
## `findRichTextSuggestionTrigger`

```ts
findRichTextSuggestionTrigger(document: RichTextDocument, selection: RichTextSelection, triggers: ReadonlyArray<string>): RichTextSuggestionTrigger | null
```
## `INITIAL_RICH_TEXT_SUGGESTION_STATE`

```ts
const INITIAL_RICH_TEXT_SUGGESTION_STATE: RichTextSuggestionState
```
## `insertRichTextMention`

```ts
insertRichTextMention(editor: RichTextEditor, range: RichTextMentionRange, mention: RichTextMention, options: { readonly createId: () => string; }): ReturnType<RichTextEditor["dispatch"]>
```
## `isRichTextMentionNode`

```ts
isRichTextMentionNode(node: RichTextNode): boolean
```
## `reconcileRichTextSuggestionState`

```ts
reconcileRichTextSuggestionState<Candidate extends RichTextSuggestionCandidate>(state: RichTextSuggestionState, trigger: RichTextSuggestionTrigger | null, items: ReadonlyArray<Candidate>): RichTextSuggestionSnapshot<Candidate>
```
## `reopenRichTextSuggestions`

```ts
reopenRichTextSuggestions(state: RichTextSuggestionState, trigger: RichTextSuggestionTrigger | null): RichTextSuggestionState
```
## `resolveRichTextSuggestions`

```ts
resolveRichTextSuggestions<Candidate extends RichTextSuggestionCandidate>(trigger: RichTextSuggestionTrigger | null, candidates: ReadonlyArray<Candidate>): ReadonlyArray<Candidate>
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
## `RichTextSuggestionCandidate`

```ts
interface RichTextSuggestionCandidate {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}
```
## `RichTextSuggestionRange`

```ts
interface RichTextSuggestionRange {
  readonly nodeId: string;
  readonly from: number;
  readonly to: number;
}
```
## `RichTextSuggestionSnapshot`

```ts
interface RichTextSuggestionSnapshot<Candidate extends RichTextSuggestionCandidate> extends RichTextSuggestionState {
  readonly open: boolean;
  readonly activeItem: Candidate | null;
}
```
## `RichTextSuggestionState`

```ts
interface RichTextSuggestionState {
  readonly contextKey: string | null;
  readonly dismissedContextKey: string | null;
  readonly activeId: string | null;
}
```
## `RichTextSuggestionTrigger`

```ts
interface RichTextSuggestionTrigger {
  readonly trigger: string;
  readonly query: string;
  readonly range: RichTextSuggestionRange;
}
```
