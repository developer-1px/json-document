# @interactive-os/json-document-rich-text-suggestion-react

Editable combobox, listbox, keyboard, pointer, dismissal, and active-option scrolling bindings for Rich Text suggestions.

```tsx
const suggestion = useRichTextSuggestion({ id, label, trigger, candidates, onAction });
```

The hook keeps DOM focus on the editable reference and projects virtual option focus through ARIA.
