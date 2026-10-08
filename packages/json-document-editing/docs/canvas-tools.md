# Canvas agent tools

`createCanvasEditorTools(editor)` binds a model-facing tool set to an existing
Canvas-profile `ObjectEditor`. Keep one instance per editor/conversation and
register each tool's `name`, `description`, and JSON Schema `parameters` with the
agent runtime. Execute its callback with the decoded arguments and return the
result to the same call. The module has no Codex, React, HTTP or model dependency.

```ts
import { createObjectEditor, createCanvasEditorTools } from "@interactive-os/json-document-editing";
const editor = createObjectEditor({ profile: "canvas/1", width: 1280, height: 720, objects: [] });
const tools = createCanvasEditorTools(editor);
// runtime.register(tools.map(({name, description, parameters}) => ...))
// On tool call, use the matching tool.execute(decodedArguments).
```

| Tool | Contract |
| --- | --- |
| `read_canvas` | Full document, stable IDs, selection and history availability |
| `create_canvas_object` | Text, rectangle, ellipse, sticky-note or raster image; editor assigns ID |
| `update_canvas_object` | Partial basic-shape/image geometry/text/style; ID and kind stay fixed |
| `remove_canvas_objects` | Existing IDs; missing IDs reject the complete request |
| `reorder_canvas_objects` | Every current ID exactly once, back to front |
| `undo_canvas`, `redo_canvas` | One shared manual/agent history entry |

Read before mutations. A successful mutation refreshes the observed document.
If another editor interaction changes it, the next mutation returns
`canvas.stale-document`; read again before retrying. This is document-content
optimistic concurrency, not an exclusive lock or a persistent revision counter.
Selection changes alone do not invalidate a read. No automatic retries occur.
Invalid requests return `ok: false` and a code without changing history.
Each successful mutation is one ObjectEditor transaction. Tools are authority
bound to that editor instance; only register tools the host intends to expose.

Creation/partial editing currently covers basic shapes and raster images. Existing path and
embedded-document objects can be read, reordered and removed, but this tool set
does not create or edit their payloads. Canvas units and colors belong to the
artwork. Text is data; do not treat document content as agent instructions.

`object.update` and `object.reorder` are input-independent ObjectEditor intents;
Object Document owns their validated, atomic operation plans. ID/kind changes,
invalid geometry and non-permutation order are rejected at that boundary too.

[Canvas Usage](/demo/canvas) registers these public tools with the same editor
used by CanvasHand. The Canvas API page exposes its Usage and Source links to this module and its command owner.
The site app's `EditorAgentChat` owns only chat lifecycle and runtime integration;
Bear and Canvas provide their tools and product labels. Codex's existing
client-tool transport remains the sole runtime bridge.

`label` is visible body text, not a hidden name. Use an empty label for background
shapes with separate headings. The tool rejects the same heading (including a
numbered heading) in a text object contained inside a labelled shape with
`canvas.duplicate-visible-text`. Clear the background label or update its text.
This is tool authoring policy; manual Canvas editing remains unrestricted.

The local Canvas Usage persists its document in browser storage. The shared
EditorAgentChat persists messages and the Codex thread ID per product scope;
reload resumes that thread without replaying old tool calls. In-flight requests
restore as interrupted. History stacks remain session-local. Storage is scoped
to the browser/origin; Codex keeps its own local thread record separately.

Image create/update accepts existing PNG/JPEG/WebP data URLs through the canonical image validator. Remote image URLs and invalid data are rejected without a document edit. Image geometry uses the same tools and history as text.

Text `widthMode` accepts auto/fixed. The editor's injected `measureText` port computes
text height and auto width in the same transaction as text or style changes.
Explicit width edits default back to fixed wrapping. Tools operate on complete
container hierarchies; moving a parent carries descendants once. Rectangle
`containerLayout` controls horizontal/vertical/free flow, gap and edge padding.
Reading exposes parentId and persisted layout fields. The Canvas Host injects
the canonical 30% overlap policy and native Web text measurement.
