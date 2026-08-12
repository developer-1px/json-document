# @interactive-os/json-document-react

React Connector for `@interactive-os/json-document` and
`@interactive-os/json-document-editing`.

```tsx
import {
  useDocumentEditor,
  useEditingSnapshot,
} from "@interactive-os/json-document-react";

function DocumentView() {
  const editor = useDocumentEditor({
    blocks: [{ id: "welcome", text: "Hello" }],
  });
  const snapshot = useEditingSnapshot(editor);

  return <pre>{JSON.stringify(snapshot.value, null, 2)}</pre>;
}
```

`useJSONDocumentValue` connects the six-member `JSONDocument` directly to
React. `useEditingSnapshot` accepts the structural snapshot/subscription surface
shared by `EditingSession` and `DocumentEditor`.

The Connector owns React subscription and component lifecycle only. It does not
render UI, interpret selection, or add document semantics.

## Compatibility

| Package | Supported range |
| --- | --- |
| `@interactive-os/json-document` | `^3.0.0` |
| `@interactive-os/json-document-editing` | `>=0.1.0-rc.0 <1` |
| `react` | `^18.0.0 || ^19.0.0` |
