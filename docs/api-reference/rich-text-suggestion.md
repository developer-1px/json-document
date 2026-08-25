# @interactive-os/json-document-rich-text-suggestion API

**Owner:** Hands

Rich Text suggestion trigger와 상태 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-rich-text-suggestion/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `activateRichTextSuggestion`

```ts
activateRichTextSuggestion(state: RichTextSuggestionState, trigger: RichTextSuggestionTrigger | null, activeId: string | null): RichTextSuggestionState
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
