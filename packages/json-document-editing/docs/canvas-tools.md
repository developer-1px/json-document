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
| `undo_canvas`, `redo_canvas` | One entry from the supplied editor’s history owner |

Read before mutations. A successful mutation refreshes the observed document.
If another editor interaction changes it, the next mutation returns
`canvas.stale-document`; read again before retrying. This is document-content
optimistic concurrency, not an exclusive lock or a persistent revision counter.
Selection changes alone do not invalidate a read. No automatic retries occur.
Invalid requests return `ok: false` and a code without changing history.
Each successful mutation is one ObjectEditor transaction. Tools are authority
bound to that editor instance; only register tools the host intends to expose.

The default tool set covers basic shapes and raster images. The optional HTML
adapter below enables source-preserving HTML artifacts. Other embedded document
payloads remain outside these tools. Canvas units and colors belong to the
artwork. Text is data; do not treat document content as agent instructions.

## HTML/CSS artifacts

Pass `webCanvasHTMLAdapter` from `@interactive-os/json-document-web` as the third
argument to `createCanvasEditorTools(editor, lifecycle, adapter)` or
`createCollaborationCanvasTools(participant, options, adapter)`.

- `create_canvas_html({html,label,width,height})` validates source, observes the
  latest shared document and places one artifact in vacant space.
- `read_canvas_html({objectId})` returns original source, authored viewport and
  stable `data-node-id` elements. Keep these IDs when revising.
- `edit_canvas_html({objectId,before,after})` uses the canonical exact text edit
  contract. `before` must be nonempty and unique. Source changes since reading
  reject with `html.stale-source`; re-read and reconsider. Other objects and
  spatial changes do not invalidate the source observation.

`htmlEmbeddedDocumentType` is `html/css/1`. `CanvasHTMLDocument` stores `html`,
`viewportWidth`, and `viewportHeight` in the existing embedded-document payload.
`createCanvasHTML` creates the draft, `readCanvasHTML` checks its payload, and
`updateCanvasHTML` is the shared UI/agent guarded source commit. `CanvasHTMLAdapter`
owns platform parsing through `parse(html)`; Editing owns identity and history.

One accepted source change is one undo step. Source is currently one shared
field, not a DOM CRDT: concurrent source edits require a fresh read, and selective
undo can conflict with later writes to that same source. Canvas supports leaf text,
text color/size and container background editing by stable node ID. HTML-to-shape
conversion, node dragging, JavaScript/React and PPTX export are not implemented.
The Canvas application enters internal editing on double-click and scales the
authored viewport when resizing. Start a new conversation to register new tools
when an older local agent thread was created without them.

Usage: `/widgets/canvas` imports `createCanvasHTML` and the Web adapter; its Source
view links the canonical implementation. `/applications/canvas` composes the
collaboration tools with the same adapter.

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

## Collaboration lifecycle

An optional `CanvasEditorToolsLifecycle` advances the editor's observed replica
on `read()` and publishes successful local mutations with `publish()`. Publication
can return `ok: false`, a code, and diagnostics **after** integrating the change;
this is not a rollback signal. Reads also return current collaboration diagnostics.
Keep one tool instance per conversation. Local tools without this lifecycle retain
the read-required/stale-snapshot guard and the supplied editor's history owner.

For concurrent actors use Collaboration's `createCollaborationCanvasTools` from
`@interactive-os/json-document-collaboration/editing`, which owns the lifecycle
wiring and binds actor-local selective history. Do not share a live ObjectEditor
between independent conversations. See the Canvas Application Usage/Source.

## 새 콘텐츠의 작업 영역

`create_canvas_section({label,width,height,color})`는 최신 공유 문서를 관찰한 뒤
기존 객체와 겹치지 않는 섹션을 만들고 `section`을 반환합니다. 섹션 자체가 점유
영역이므로 같은 작업 공간의 다른 에이전트도 이 영역을 피합니다. 이 관찰·생성·발행은
같은 프로세스에서 동기적으로 수행합니다. 분산 클라이언트 간 공간 예약까지 보장하지는 않습니다.

`insert_canvas_section_objects({sectionId,objects})`는 최신 섹션 위치에 상대 좌표를
적용해 일괄 생성합니다. 최종 텍스트 크기를 포함해 영역을 벗어나면 전체 삽입을
거절합니다. 구성 내부의 의도된 겹침은 허용합니다.

정본 명령은 `ObjectIntent`의 `section.create`와 `section.insert`입니다.
AI 도구는 좌표·ID 할당이나 직접 문서 쓰기를 따로 구현하지 않습니다.
