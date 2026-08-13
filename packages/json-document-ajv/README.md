# @interactive-os/json-document-ajv

Official Ajv v8 Connector for `@interactive-os/json-document` validation.

Compile the schema with the Ajv instance that owns your JSON Schema draft,
formats, custom keywords, and options, then translate that native validator into
the synchronous JSON Document validation contract.

```ts
import Ajv from "ajv";
import { createJSONDocument } from "@interactive-os/json-document";
import { createAjvValidator } from "@interactive-os/json-document-ajv";

const ajv = new Ajv();
const validateSchema = ajv.compile({
  type: "object",
  properties: { title: { type: "string", minLength: 3 } },
  required: ["title"],
});

const document = createJSONDocument(
  { title: "Draft" },
  { validate: createAjvValidator(validateSchema) },
);
```

The Connector reports the first Ajv error message and `instancePath` as a JSON
Document validation failure. It always validates a mutable clone. Ajv options
such as `removeAdditional`, `useDefaults`, and `coerceTypes` may affect whether
that clone passes, but their transformed output is never adopted as canonical
JSON or reported as applied JSON Patch operations.

Async validators are rejected because JSON Document patch validation and commit
are synchronous. The Connector does not create or configure an Ajv instance,
select a JSON Schema draft, install formats, define custom keywords, project a
Database document, or generate UI.

Supported peers:

- `@interactive-os/json-document ^3.0.0`
- `ajv ^8.0.0`
