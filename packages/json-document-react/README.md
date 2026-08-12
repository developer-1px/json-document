# @interactive-os/json-document-react

React Connector for `@interactive-os/json-document` and
`@interactive-os/json-document-editing`.

```tsx
import { createJSONDocument } from "@interactive-os/json-document";
import {
  useReactConnector,
} from "@interactive-os/json-document-react";

const document = createJSONDocument({ title: "Hello" });

function DocumentView() {
  const value = useReactConnector(document);

  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}
```

`useReactConnector(document)` is the official stateful Connector entry point
and connects the six-member `JSONDocument` directly to React.
`useJSONDocumentValue` remains the lower-level document-value hook.
`useEditingSnapshot` accepts the structural snapshot/subscription surface
shared by `EditingSession` and `DocumentEditor`.

The Connector owns React subscription and component lifecycle only. It does not
render UI, interpret selection, or add document semantics.

## Compatibility

| Package | Supported range |
| --- | --- |
| `@interactive-os/json-document` | `^3.0.0` |
| `@interactive-os/json-document-editing` | `>=0.1.0-rc.0 <1` |
| `react` | `^18.0.0 || ^19.0.0` |
