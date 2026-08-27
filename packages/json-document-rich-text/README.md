# @interactive-os/json-document-rich-text

Experimental reference implementation of the Draft JSONDocument Rich Text v1
profile. It owns canonical Rich Text model types, logical topology, editing
transforms, and target-neutral rendering while JSONDocument, Selection, and
Editing remain the state owners.

The package includes the versioned `richTextSchemaV1`, validation and explicit
normalization, stable node identity, text/child points, logical topology,
multi-range selection mapping, all Official v1 intents, structured slices,
history integration, and schema-driven rendering. It does not own toolbar,
slash-menu, or product command policy.

`richTextPlainText(nodes)` is the canonical model-backed plain-text projection
used by clipboard and read-only platform surfaces. It preserves hard breaks
without reading rendered DOM.

```ts
import { createJSONDocument } from "@interactive-os/json-document";
import {
  createRichTextEditor,
  richTextSchemaV1,
  validateRichText,
} from "@interactive-os/json-document-rich-text";

const validation = validateRichText(value, { schema: richTextSchemaV1 });
if (!validation.ok) throw new Error(validation.code);

const editor = createRichTextEditor({ document: createJSONDocument(value) });
editor.dispatch({ type: "text.insert", text: "hello" });
```

Use `tryCreateRichTextEditor` when unavailable profiles must be reported as a
stable failure result rather than thrown at an application boundary.

`normalizeRichText` detaches external input by default. When the caller owns an
immutable canonical value, `{ inputOwnership: "borrowed" }` skips that full
clone and reuses unchanged subtree identity. Mutating borrowed input after the
call is outside the contract; use the default for external payloads.

The public surface is not frozen while RFC #363 remains Draft.
