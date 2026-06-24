# json-document-contenteditable-react

Thin React hook for `@interactive-os/json-document-contenteditable-web`.

The hook owns React timing concerns:

- creating and disposing the web adapter
- rendering document value into the contenteditable root
- restoring selection after document-driven rerenders
- preserving command-start selection for toolbar interactions

```tsx
import { useContentEditable } from "@interactive-os/json-document-contenteditable-react";

const editor = useContentEditable({
  document: doc,
  rootRef,
  surface,
  renderContent,
});
```

It does not define editor block semantics or rendering policy.

It does not call `doc.use(...)`; hosts compose the hook around a
json-document instance.
