# @interactive-os/json-document-causal-patch-inbox

Lab module for admitting dependency-declared JSON Patch or authored edit
envelopes, holding out-of-order work, and committing each envelope when it
becomes causally ready on one `JSONDocument`.

```ts
const inbox = createCausalPatchInbox(doc);

inbox.ingest({
  id: "change-2",
  dependsOn: ["change-1"],
  operations: [
    { op: "test", path: "/title", value: "Ready" },
    { op: "replace", path: "/title", value: "Reviewed" },
  ],
});
// queued: change-2 is waiting for change-1

const result = inbox.ingest({
  id: "change-1",
  dependsOn: [],
  operations: [
    { op: "test", path: "/status", value: "draft" },
    { op: "replace", path: "/status", value: "ready" },
  ],
});

if (result.ok) {
  result.applied; // ["change-1", "change-2"]
  result.pending; // ids from this input that remain queued
}
```

Direct `operations` envelopes remain supported with the same runtime result
shape. A closed alternative envelope carries one `intent` instead:

```ts
const positional = createCausalPatchInbox(doc, {
  positionalSchema: DocumentSchema,
});

positional.ingest({
  id: "local-title",
  dependsOn: ["observed-parent"],
  intent: {
    kind: "positional",
    base: authoredDocument,
    operations: [
      { op: "replace", path: "/items/1/title", value: "Reviewed" },
    ],
    selectionAfter: "/items/1/title",
  },
});

const stable = createCausalPatchInbox(doc, {
  stableIdScopes: cardScopes,
});

stable.ingest({
  id: "stable-title",
  dependsOn: ["observed-parent"],
  intent: {
    kind: "stable-id-replace",
    target: { scope: "card", id: "b" },
    relativePath: "/title",
    expected: "Draft",
    value: "Reviewed",
    relativeSelectionAfter: "/title",
  },
});
```

The positional `base` must represent the authored projection containing the
transitive causal past declared by `dependsOn`. Once that envelope is ready,
the inbox replays successful applied batches outside that causal past in their
actual local commit order. Stable-id replacement instead resolves its target
against the current projection with the host scopes supplied once at factory
creation. Neither policy is run while its envelope is waiting.

An `ingest` batch is preflighted and defensively copied before any new envelope
is admitted. An exact duplicate compares the authored direct operations or
intent, never a later materialized patch. The same id with a different authored
payload is `duplicate_mismatch`. A missing policy configuration rejects the
whole batch as `policy_not_configured` before admission. Dependency order has
set semantics, while operation and array order remain significant. A known
graph cycle rejects the closing batch.

Ready envelopes currently known to one drain are applied by locale-independent
id order. A direct envelope uses its operations unchanged. A delayed intent is
materialized at that point, then the resulting operations and optional
selection are passed to exactly one atomic `doc.commit`. The concrete
`doc.lastPatch` is recorded only after success, and causal frontier state moves
only after that commit. A batch is not one transaction: earlier envelopes
remain applied when a later envelope fails. Patch or materialization failure
globally blocks the inbox, preserving the failed envelope and descendants for
inspection without an implicit retry.

`current().frontier` is the maximal set in the declared dependency DAG. It is
not an actor clock or version vector. `queued[].missing` contains dependencies
that have not been applied by this inbox. Snapshot status `active` describes a
usable inbox, including one that has pending dependencies; it does not mean
that a ready envelope currently exists. `blocked` preserves a structured patch
or policy-specific materialization failure. `faulted` preserves an unexpected
thrown execution failure; a planner throw also records
`phase: "materialization"`. Full queue snapshots are produced only by
`current()`. Successful `ingest` results report this call's `applied`,
`pending`, and `duplicates` ids. A non-empty materialization diagnostic list is
added as `diagnostics`; direct-only results remain unchanged.

## Scope

- Defensively validate and copy one closed direct-operation or authored-intent
  envelope union before admission.
- Queue envelopes whose declared dependencies have not been applied.
- Distinguish exact duplicate delivery from an id/payload mismatch.
- Reject empty ids, invalid dependency ids, self/duplicate dependencies,
  accessor/non-enumerable data, non-JSON payloads, and cycles closed by new
  dependency edges.
- Choose the smallest currently ready id with a private min-heap.
- Wake dependents through a reverse dependency index rather than rescanning the
  whole queue after every successful patch.
- Materialize positional edits from their authored base plus applied
  non-ancestor batches when they become ready.
- Resolve stable-id replacements against the current projection using
  host-supplied resolver scopes when they become ready.
- Commit one ready envelope through exactly one public `doc.commit`, including
  its materialized `selectionAfter`, and advance causal state only after
  success.
- Permit an empty projection patch to advance causal state.
- Stop with structured `patch_failed` state for non-strict documents; preserve
  the core `JSONDocumentError` throw policy for strict documents.
- Move to terminal `faulted` state when materialization or commit execution
  throws without changing the projection and without supplying a structured
  `JSONDocumentError`.
- Reject reentrant ingestion as `busy` while admission, materialization, or a
  document commit is running.
- Detect direct document mutation and move the inbox to `diverged` rather than
  inferring a causal envelope from an observed patch.
- Dispose the document subscription explicitly.

## Performance

- Envelope validation, defensive copying, and exact comparison are linear in
  envelope payload size. A positional base is part of that payload, so its
  admission and deduplication cost grow with the base document. Dependency
  normalization also sorts the dependency ids.
- Known-id lookup is average `O(1)`. Ready selection is `O(log V)`, and each
  reverse dependency edge is released once.
- Cycle preflight first consults the reverse dependency index. A new id with no
  incoming pending edge cannot close a cycle and needs no graph walk. Other new
  edges walk only reachable dependency paths with an iterative stack; the
  implementation neither rebuilds unrelated graph state nor overflows the
  JavaScript call stack on deep chains.
- `current()` sorts and defensively copies frontier and queue observations, so
  its cost grows with the exposed state. `ingest()` does not call `current()`;
  callers pay that observation cost only when they request a snapshot.
- Ready positional materialization walks the envelope's transitive causal past
  and filters the applied ledger before delegating to the rebase planner.
  Stable-id materialization pays the configured resolver scan and document
  preflight costs.
- Exact dedup retains accepted authored payloads, and the causal ledger has no
  compaction in this lab. An inbox configured for positional materialization
  also retains its concrete applied-patch ledger. Memory therefore grows with
  accepted work, while direct-only and stable-id-only inboxes avoid the extra
  applied-patch copy.

## Non-goals

- No CRDT, OT, LWW policy, convergence claim, total-order protocol, sequencer,
  watermark, actor clock, tombstone, or replicated undo.
- No arrival-order-independent result across separate `ingest` calls. Only the
  ready set known to the current drain is ordered deterministically.
- No local submit/envelope generation, acknowledgement, transport, reconnect,
  offline queue, persistence, checkpoint, or compaction format.
- No generic protocol or materialization Adapter interface. The two concrete
  policies are deliberately a closed union.
- No target repair beyond conservative positional rebase or one stable-id
  field replacement; no automatic retry, conflict resolution, or
  independent-branch skipping after failure.
- No DOM Selection, multi-range or text-offset transform, presence, DOM input,
  render scheduling, or focus policy beyond committing one headless Pointer
  `selectionAfter` returned by a materializer.
- No support for multiple causal owners mutating the same document projection.
- No change to the `JSONDocument` public interface or core state.

## Friction report

The public document subscription, active envelope id, metadata marker, and
publication count distinguish this module's synchronous patch from ordinary
host publications. Reusing a previously observed marker outside that active
publication is rejected, and a nested patch that copies current metadata adds
a second publication and causes divergence. The marker remains a cooperative
in-process convention rather than a security boundary. Running another inbox
against the same document makes the first one diverge instead of trying to
merge two causal ledgers.

Only mutations published through the public `JSONDocument` interface are
observable. In-place mutation of an object reachable through `doc.value` emits
no subscription event and cannot be detected here; callers must treat document
values as owned projection state rather than a side channel for mutation.

Typed patch failure is a clean seam: core keeps the JSON projection atomic, so
the inbox can leave its frontier unchanged. The first strict
`JSONDocumentError` still propagates but its structured result is retained as
the global blocker, so later delivery does not retry implicitly. An error
callback or schema path can instead throw before returning a `JSONResult`; when
the projection is unchanged, the original exception propagates once and the
inbox becomes `faulted` rather than retrying. A host `onChange` or subscriber
can throw after core has published, however. The public interfaces cannot roll
that publication back across modules. This lab detects the changed projection
and halts as `diverged`; it does not claim crash-atomicity across arbitrary host
callbacks.

Ready-time materialization removes the known stale-planning gap without adding
a protocol abstraction. Positional correctness still depends on the host
supplying a base that corresponds to `dependsOn`; the inbox has no clock or
checkpoint with which to prove that relationship. Stable-id recovery still
inherits resolver scan cost, host scope correctness, and the planner's
conservative entity guard.

The positional planner also requires its concurrent batches to be ordered and
gap-free from the supplied base. A causal past need not be a prefix of this
inbox's local applied order, so filtering non-ancestors cannot prove that replay
relationship. Planner conflicts and final commit guards prevent an unsafe
overwrite, but a valid authored edit can conservatively become a false conflict
or a commit-time `patch_failed`. This tracer makes that limitation observable;
it does not claim a convergence protocol.

The concrete rebase modules are in-process dependencies. Their results are
preserved as structured failures rather than hidden behind a generic Adapter
seam. This supplies evidence for two real policies while keeping transport,
clocks, CRDT/OT, async execution, and universal intent languages out of scope.
