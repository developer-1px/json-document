# Observed collaboration participants

`createCollaborationWorkspace` (`/history`) owns a shared HistoryRuntime and
cached actor replicas. `participant(actorId).observe()` advances that actor's
frontier explicitly; remote edits do not change its document while a model is
thinking. Author edits against `participant.runtime.document`, then `publish()`.
Publication uses the existing semantic identity, causal merge, validation and
selective-history engine. It does not rebase JSON Pointer strings onto a new
snapshot or invent a second merge policy.

`createCollaborationCanvasTools` (`/editing`) assembles the participant's
ObjectEditor, actor-local history and Editing tools. `read_canvas` observes;
each successful local mutation publishes, then returns the merged document.
Each conversation must retain its own tools. Human editing uses the shared
runtime and `createCollaborationEditingHistory(runtime)`.

```ts
import { createHistoryRuntime, createCollaborationWorkspace } from
  "@interactive-os/json-document-collaboration/history";
import { createCollaborationCanvasTools } from
  "@interactive-os/json-document-collaboration/editing";

const options = {
  actorId: "human", epochId: "canvas/v1",
  ruleset: { id: "canvas", digest: "canvas/v1" },
};
const runtime = createHistoryRuntime({
  profile: "canvas/1", width: 1280, height: 720, objects: [],
}, options);
const workspace = createCollaborationWorkspace(runtime, options);
const tools = createCollaborationCanvasTools(workspace.participant("chat-a"));
tools.find(tool => tool.name === "read_canvas")!.execute({});
```

See the [Canvas Usage and Source](/docs/api/canvas) and
[Canvas Application](/applications/canvas) for the running public-API composition.
The canonical implementation is `src/workspace.ts`; Canvas binding is in
`src/editing-index.ts`. API signatures are in [API reference](api-reference.md).

## Publication outcomes

`ok: false` after publication does **not** mean rollback. The authored change
may be retained and one deterministic result may be visible. Always inspect the
returned document and `collaboration` status before choosing a new edit.

- `collaboration.conflict`: the published change participates in a live conflict.
  Alternatives remain in history; read and make an intentional follow-up edit.
- `collaboration.change-suppressed`: domain validation or semantic application
  excluded the change from materialization.
- `collaboration.change-pending`: dependencies are missing.
- `collaboration.target-hidden`: a write target is no longer reachable, such as
  a field below a concurrently deleted object. It has not been resurrected.

`replica.locate(memberId)` returns its current escaped JSON Pointer, including
moves, or null when unreachable. It is a current projection, not a durable
address or an indication that a write won. Conflict status reports competing
writes. A successful publication is a statement about the current merged state;
future concurrent changes may introduce a conflict or hide its target.

## Storage and scope

`workspace.snapshot.value` is a checkpoint, including actor counters, conflicts
and selective history. `subscribe` includes history-only changes even when the
visible JSON is unchanged. This source can be passed to Web's
`createWebStoredDocument`; restore with `restoreHistoryRuntime` and the same
ruleset/validation before constructing the workspace. Restoring just the plain
JSON loses causal history and starts a new epoch.

The supplied `options.actorId` must identify the shared runtime's actor.
Workspace reserves that actor and caches one participant runtime per other ID.
Do not instantiate multiple simultaneous authors with one actor ID or multiple
tool instances that share one participant's observation. This in-process
coordinator provides no cross-tab/network transport, actor leasing, authentication,
or storage compaction. Checkpoints currently retain the complete change history.
Canvas labels use atomic string writes; independent fields merge, but competing
rewrites of one label require an intentional choice. Layout-derived fields are
part of the same atomic change and can also conflict.

### 편집 UI의 이력 상태 읽기

협업 history 엔진은 동일한 causal revision의 undo/redo 준비 결과를
재사용하고 `createCollaborationEditingHistory`는 이를 편집 UI에 전달합니다. 화면 이동이나 선택 조회가 이력 검증을 반복하지 않습니다.
실제 undo/redo 실행은 동일 revision이면 준비된 전이를 사용하며, 원격 변경과 이력 전용
변경도 revision을 바꾸므로 다음 상태 조회에 반영됩니다.

## Forking a live history runtime

`forkHistoryRuntime(source, actorId)` from `/history` creates an independent
runtime from an already validated live history runtime. It inherits the epoch,
membership and acceptance callback, preserves existing actor counters, and shares
immutable causal state until either runtime edits. It does not serialize a
checkpoint or replay historical validation. The source must have been created
by this library instance, and the actor must differ from the source actor and be
admitted by its membership. Callers must ensure exclusive authorship of that actor.

Workspace participants use this path when the configured ruleset and acceptance
callback match and no checkpoint verifier is supplied. Otherwise checkpoint
restore remains the validation boundary. Forking is not a way to trust external
checkpoint data; use `restoreHistoryRuntime` for that.

The site [History Usage](/docs/collaboration/history) demonstrates this API;
its canonical implementation is `src/create.ts`.
