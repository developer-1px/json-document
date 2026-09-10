# @interactive-os/json-document-rich-text-suggestion-react API

**탐색 분류:** Hands

Rich Text suggestion React interaction binding의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 사이트에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-rich-text-suggestion-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

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
