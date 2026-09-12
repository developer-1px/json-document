# @interactive-os/json-document-rich-text-mention-react API

**탐색 분류:** Connector

Mention 관찰·수명을 React에 연결의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-rich-text-mention-react/src/index.tsx`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `RichTextMentionAtom`

```ts
RichTextMentionAtom({ node, editor, renderIcon, style, ...props }: RichTextMentionAtomProps): ReactNode
```
## `RichTextMentionAtomProps`

```ts
interface RichTextMentionAtomProps extends HTMLAttributes<HTMLSpanElement> {
  readonly node: RichTextNode;
  readonly editor?: RichTextEditor;
  readonly renderIcon?: (entityId: string, label: string) => ReactNode;
}
```
## `RichTextMentionSuggestions`

```ts
RichTextMentionSuggestions<Suggestion extends RichTextMentionSuggestion>({ binding, groupLabel, style, ...props }: RichTextMentionSuggestionsProps<Suggestion>): ReactNode
```
## `RichTextMentionSuggestionsProps`

```ts
interface RichTextMentionSuggestionsProps<Suggestion extends RichTextMentionSuggestion> extends HTMLAttributes<HTMLDivElement> {
  readonly binding: RichTextSuggestionBinding<Suggestion>;
  readonly groupLabel?: string;
}
```
## `useRichTextMentionSuggestions`

```ts
useRichTextMentionSuggestions<Suggestion extends RichTextMentionSuggestion>(options: UseRichTextMentionSuggestionsOptions<Suggestion>): RichTextSuggestionBinding<Suggestion>
```
## `UseRichTextMentionSuggestionsOptions`

```ts
interface UseRichTextMentionSuggestionsOptions<Suggestion extends RichTextMentionSuggestion> {
  readonly id: string;
  readonly label: string;
  readonly editor: RichTextEditor;
  readonly trigger: RichTextSuggestionTrigger | null;
  readonly suggestions: ReadonlyArray<Suggestion>;
  readonly createId: () => string;
}
```
