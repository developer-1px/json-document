# @interactive-os/json-document-causal-patch-inbox

Lab module for admitting dependency-declared JSON Patch envelopes, holding
out-of-order work, and applying each ready envelope to one `JSONDocument`.

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

The envelope operations are already-materialized JSON Patch. They can be raw
protocol output or guarded operations produced by another planner. This module
owns causal admission and scheduling, not target recovery or merge policy.

An `ingest` batch is preflighted before any new envelope is admitted. An exact
duplicate is a no-op; the same id with different dependencies or operations is
`duplicate_mismatch`. Dependency order has set semantics, while operation and
array order remain significant. A known graph cycle rejects the closing batch.

Ready envelopes currently known to one drain are applied by locale-independent
id order. Each envelope is one atomic `doc.patch`; causal frontier state moves
only after that patch succeeds. A batch is not one transaction: earlier
envelopes remain applied when a later envelope fails. Patch failure globally
blocks this first tracer, preserving the failed envelope and its descendants
for inspection. Recovery, skipping, and conflict resolution need a later
policy rather than an implicit retry.

`current().frontier` is the maximal set in the declared dependency DAG. It is
not an actor clock or version vector. `queued[].missing` contains dependencies
that have not been applied by this inbox. Snapshot status `active` describes a
usable inbox, including one that has pending dependencies; it does not mean
that a ready envelope currently exists. `blocked` preserves a structured patch
failure, while `faulted` preserves an unexpected thrown execution failure that
has no `JSONResult`. Full queue snapshots are produced only by `current()`.
Successful `ingest` results report only this call's `applied`, `pending`, and
`duplicates` ids.

## Scope

- Defensively validate and copy one envelope or a batch before admission.
- Queue envelopes whose declared dependencies have not been applied.
- Distinguish exact duplicate delivery from an id/payload mismatch.
- Reject empty ids, invalid dependency ids, self/duplicate dependencies,
  accessor/non-enumerable data, non-JSON payloads, and cycles closed by new
  dependency edges.
- Choose the smallest currently ready id with a private min-heap.
- Wake dependents through a reverse dependency index rather than rescanning the
  whole queue after every successful patch.
- Apply one envelope through one public `doc.patch` call and advance causal
  state only after success.
- Permit an empty projection patch to advance causal state.
- Stop with structured `patch_failed` state for non-strict documents; preserve
  the core `JSONDocumentError` throw policy for strict documents.
- Move to terminal `faulted` state when patch execution throws without changing
  the projection and without supplying a structured `JSONDocumentError`.
- Reject reentrant ingestion as `busy` while a document patch is publishing.
- Detect direct document mutation and move the inbox to `diverged` rather than
  inferring a causal envelope from an observed patch.
- Dispose the document subscription explicitly.

## Performance

- Envelope validation, defensive copying, and exact comparison are linear in
  envelope payload size; dependency normalization also sorts the dependency
  ids.
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
- The module does not clone, diff, or stringify the whole document. Core patch
  application and schema/refinement validation can still dominate runtime.
- Exact dedup retains accepted envelope payloads, and the causal ledger has no
  compaction in this lab. Memory therefore grows with accepted work.

## Non-goals

- No CRDT, OT, LWW policy, convergence claim, total-order protocol, sequencer,
  watermark, actor clock, tombstone, or replicated undo.
- No arrival-order-independent result across separate `ingest` calls. Only the
  ready set known to the current drain is ordered deterministically.
- No local submit/envelope generation, acknowledgement, transport, reconnect,
  offline queue, persistence, checkpoint, or compaction format.
- No generic protocol or materialization Adapter interface yet.
- No ready-time positional rebase, stable-id lookup, target repair, automatic
  retry, conflict resolution, or independent-branch skipping after failure.
- No selection, presence, DOM input, render scheduling, or focus policy.
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

Already-materialized guarded operations can become stale while waiting for
dependencies. The inbox then blocks without rewriting their intent. The next
useful experiment is ready-time materialization with at least two concrete
policies, such as positional patch rebase and stable-id target recovery. That
evidence should come before exposing a generic Adapter seam or choosing OT/CRDT.
