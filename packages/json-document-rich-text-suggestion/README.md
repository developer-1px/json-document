# @interactive-os/json-document-rich-text-suggestion

Headless trigger, candidate resolution, dismissal, and active-item state for Rich Text suggestion Hands.

```ts
const trigger = findRichTextSuggestionTrigger(document, selection, ["@"]);
const items = resolveRichTextSuggestions(trigger, candidates);
```

Rendering, platform events, candidate data sources, and product policy remain outside this package.
