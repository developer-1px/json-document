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

All bound pointers use Core JSON Pointer parsing, including escaped subtree
names. Structural intents validate parent cardinality, descendant schema and ID
uniqueness before committing; removing the last required root block is rejected.
`node.move` retains member identity using JSON Patch `move`. Public `apply`
validates the resulting bound Rich Text document while still allowing adjacent
JSON fields, such as Composer attachments, in the same local history.

`appliedOperationsFor(value)` exposes recorded operation paths, including the
source `from` for a move, so consumers such as the React render store can track
structural changes on both sides. It returns `null` when no record is available;
consumers must then read the current document instead of assuming no change.

External changes reconcile selection against the current topology (clamping
surviving points and dropping missing points) before snapshot delivery. This
requires Editing's `reconcileSelection` option from the same draft revision;
it is not semantic position mapping or selective collaborative undo. Local
undo/redo is cleared on external changes. No permanent document subscription is
created: the last observer's unsubscribe releases the connection, and unobserved
reads catch up lazily. The React render store follows the same lifetime.

`normalizeRichText` detaches external input by default. When the caller owns an
immutable canonical value, `{ inputOwnership: "borrowed" }` skips that full
clone and reuses unchanged subtree identity. Mutating borrowed input after the
call is outside the contract; use the default for external payloads.

The public surface is not frozen while RFC #363 remains Draft.
