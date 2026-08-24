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
`useEditing` adds the shared selection loop. `getIsSelected` is the object
interval, `getIsFocus` is the object/text focus, and `getTextOffset` is the
text cursor on that focus. `source` is optional when the host already owns
the keys. Hosts still own markup, class names, and genre Intent
translation. `useRestoreTextCursor` writes a text offset onto an input or
textarea.

`useDocumentTextControl` composes cursor restoration, Web text input, and
caret/click affordances into reusable textarea props. `DocumentTextControl`
renders that same lifecycle while the host keeps layout and Document Intent.

`useGridEditing` is the grid-specific React entry point. It accepts canonical
`GridPoint` values through `selectedPoints`, `focusPoint`, `onSelect`, and
keyboard `neighbor`, and exposes `getCell(point)` without leaking the internal
string key codec into Hosts.

`useTreeEditing` owns the React lifetime of expanded IDs and connects the
canonical Tree visibility projection to selection and fold-aware keyboard
movement. Hosts inject initial expanded IDs and keep node rendering, clipboard
execution, and announcement wording.

`useEditingObservation(initialAnnouncement)` records the last Intent and
result while leaving announcement wording in the Host. Its `dispatch`, `run`,
`observe`, and `observeResult` doors let demos and inspectors expose the same
editing lifecycle without reimplementing local React state.

The Connector does not render product chrome or force DOM attributes. Selection
marking and keyboard policy stay in the host; the hook only answers selection
and turns press/key events into the host's `onSelect` and command doors.

## Compatibility

| Package | Supported range |
| --- | --- |
| `@interactive-os/json-document` | `^3.0.0` |
| `@interactive-os/json-document-editing` | `>=0.1.0-rc.0 <1` |
| `react` | `^18.0.0 || ^19.0.0` |
