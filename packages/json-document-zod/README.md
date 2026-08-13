# @interactive-os/json-document-zod

Zod Connector for `@interactive-os/json-document` validation and Database
document translation.

```ts
import { createJSONDocument } from "@interactive-os/json-document";
import { createDatabaseEditor } from "@interactive-os/json-document-editing";
import {
  createZodValidator,
  databaseDocumentFromZod,
} from "@interactive-os/json-document-zod";
import * as z from "zod";

const row = z.object({
  id: z.string(),
  title: z.string(),
  points: z.number(),
  status: z.enum(["backlog", "done"]),
  shipped: z.boolean(),
});

const translated = databaseDocumentFromZod(row, [
  { id: "t1", title: "Inbox", points: 1, status: "backlog", shipped: false },
]);

if (translated.ok) {
  const editor = createDatabaseEditor(translated.value);
  editor.snapshot.value;
}

const document = createJSONDocument(
  { title: "Draft" },
  { validate: createZodValidator(z.object({ title: z.string().min(1) })) },
);
```

`databaseDocumentFromZod` translates a Zod object schema and record array into
the public Database document shape. It does not render a table or describe form
fields. `id` string fields become record identity and are not a column. The
first remaining string field is the title property.

`createZodValidator` translates the first Zod issue message and path into a
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
