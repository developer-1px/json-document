# EditingControls

`EditingControls` composes the canonical floating Toolbar, Choice and Command primitives.
It exposes bounded choices, immediate actions, and one open-ended request entry point.

```tsx
import { EditingControls } from "@interactive-os/json-document-ui-primitives-react";

<EditingControls label="편집"
  choices={[{ id: "size", label: "크기", value: size,
    options: [{ id: "small", label: "작게" }, { id: "large", label: "크게" }],
    onValueChange: setSize }]}
  onRequestEdit={requestEdit} />
```

The owner supplies available options, current values, commands and target semantics.
The primitive does not infer document structure, send chat messages or mutate content.
`onRequestEdit` opens a request UI; it must not implicitly submit a request.
Omit it when no request handler exists. `requestLabel` defaults to “AI에게 수정 요청”.
Actions accept `id`, `label`, `disabled`, and `onSelect`. Children permit existing controls
such as an edit-completion action without duplicating the floating surface.

Site Usage: `/demo/ui-primitives` (`UiPrimitivesCatalogRoute`). Source registration:
`packages/json-document-ui-primitives-react/src/editing-controls.tsx`.

Choices may provide `renderValue` and `renderOption` to show their actual visual
values (for example color swatches and typography samples) while retaining the
option labels for keyboard navigation. The request command uses a compact icon
with an accessible label and tooltip. Controls use screen-sized typography.
