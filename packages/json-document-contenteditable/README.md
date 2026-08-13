# @interactive-os/json-document-contenteditable

React contenteditable root bound to one local `JSONDocument` string pointer.

The component owns the editable root and a native-input DOM lease. Collaboration
ingestion is not required. Commits use the six-member `document` port. Schema,
marks, atoms, toolbar, and product chrome stay outside this package.

```tsx
import { createJSONDocument } from "@interactive-os/json-document";
import { ContentEditable } from "@interactive-os/json-document-contenteditable";

const document = createJSONDocument({ title: "Shared title" });

<ContentEditable document={document} pointer="/title" />;
```

While the browser owns native input or IME composition, only rendering back
into that root is delayed. A change to another pointer updates the model
immediately and cannot replace the leased root. Release renders the latest
string at the bound pointer.

Removing this package does not change canonical JSON or Editing semantics.
