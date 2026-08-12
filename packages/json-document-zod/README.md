# @interactive-os/json-document-zod

Zod Connector for `@interactive-os/json-document` validation.

```ts
import { createJSONDocument } from "@interactive-os/json-document";
import { createZodValidator } from "@interactive-os/json-document-zod";
import * as z from "zod";

const schema = z.object({
  title: z.string().min(1),
});

const document = createJSONDocument(
  { title: "Draft" },
  { validate: createZodValidator(schema) },
);
```

The Connector translates the first Zod issue message and path into a
`JSONPatchValidationResult` and JSON Pointer. Zod parse output is never adopted
as document state: transforms, coercion, and defaults must be explicit JSON
Patch operations when they should change canonical JSON.

The Connector does not render forms, describe UI fields, or turn Zod into a
framework-neutral schema contract.

## Compatibility

| Package | Supported range |
| --- | --- |
| `@interactive-os/json-document` | `^3.0.0` |
| `zod` | `^4.0.0` |
