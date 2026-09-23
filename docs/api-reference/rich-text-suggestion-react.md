# @interactive-os/json-document-rich-text-suggestion-react API

**Owner:** Hands

Rich Text suggestion React interaction binding의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-rich-text-suggestion-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

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
## `RichTextSuggestionBinding`

```ts
interface RichTextSuggestionBinding<Candidate extends RichTextSuggestionCandidate> {
  readonly items: ReadonlyArray<Candidate>;
  readonly activeItem: Candidate | null;
  readonly open: boolean;
  readonly referenceProps: {
    readonly role: "combobox";
    readonly "aria-autocomplete": "list";
    readonly "aria-haspopup": "listbox";
    readonly "aria-controls": string;
    readonly "aria-expanded": boolean;
    readonly "aria-activedescendant"?: string;
    readonly onKeyDown: KeyboardEventHandler<HTMLElement>;
    readonly onFocus: FocusEventHandler<HTMLElement>;
    readonly onBlur: FocusEventHandler<HTMLElement>;
  };
  readonly listboxProps: HTMLAttributes<HTMLElement>;
  optionProps(item: Candidate): ButtonHTMLAttributes<HTMLButtonElement>;
  dismiss(): void;
  reopen(): void;
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
## `useRichTextSuggestion`

```ts
useRichTextSuggestion<Candidate extends RichTextSuggestionCandidate>(options: UseRichTextSuggestionOptions<Candidate>): RichTextSuggestionBinding<Candidate>
```
## `UseRichTextSuggestionOptions`

```ts
interface UseRichTextSuggestionOptions<Candidate extends RichTextSuggestionCandidate> {
  readonly id: string;
  readonly label: string;
  readonly trigger: RichTextSuggestionTrigger | null;
  readonly candidates: ReadonlyArray<Candidate>;
  readonly onAction: (candidate: Candidate, trigger: RichTextSuggestionTrigger) => void;
}
```
