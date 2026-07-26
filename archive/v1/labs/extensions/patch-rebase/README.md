# @interactive-os/json-document-patch-rebase

Lab optimistic JSON Patch rebase planner for `@interactive-os/json-document`
documents.

It tests how far delayed local edits can be rebased over an ordered applied-patch
stream before a collaboration protocol or CRDT is required.

```ts
const planned = rebaseChange(DocumentSchema, {
  base,
  concurrentBatches,
  operations: [
    { op: "replace", path: "/items/1/title", value: "Reviewed" },
  ],
  selectionAfter: {
    path: "/items/1/title",
    offset: 4,
    affinity: "forward",
  },
});

if (planned.ok) {
  doc.commit(planned.operations, {
    selectionAfter: planned.selectionAfter,
  });
}
```

`base` is the immutable document snapshot from which the local operations and
the ordered, gap-free `concurrentBatches` diverged. In-process callers can retain
the structurally shared `doc.value` reference instead of cloning the whole
document. Persisted workflows must own their snapshot and patch-log format.

Pass the same Zod-compatible schema that owns the document. The lab types only
the `safeParse` slice of that schema to avoid installing a second Zod runtime;
failed parses must expose an `error.issues` collection, as core `applyPatch`
expects. `selectionAfter` accepts a Pointer or one `SelectionPoint`. Its path is
authoritative after rebasing while `offset`, `edge`, and `affinity` are
preserved. Diagnostics describe shifted operation targets and dropped
selections. URI fragment paths are accepted and canonicalized to ordinary RFC
6901 Pointers in the returned plan. Point objects must be plain data and any
offset must be a non-negative safe integer; the final document commit may clamp
it to the selected string length.

## Scope

- Replay ordered concurrent batches from a shared base through public patch
  semantics. The first local preflight establishes the JSON boundary; later
  replay and final validation use the trusted-state public path to avoid
  rescanning the complete base for every batch.
- Validate the local batch against that same base.
- Rebase local non-root `replace` and `test` targets over concurrent `test`,
  `replace`, and object/array `add` or `remove` operations.
- Shift local targets and one headless Pointer or SelectionPoint path after
  concrete array index changes while preserving caret metadata.
- Treat numeric object keys as object members rather than array indexes.
- Report same-path and ancestor/descendant writes as structured conflicts.
- Revalidate the combined result so cross-field schema refinements can report a
  semantic conflict.
- Return leading RFC 6902 `test` guards followed by rebased local operations for
  one atomic `doc.commit`.
- Guard an independent `selectionAfter` target during the gap between planning
  and commit.

## Non-goals

- No transport, server version, acknowledgement, offline queue, persistence, or
  synchronization session.
- No CRDT, OT, actor identity, causal clock, tombstone, or convergence claim.
- No stable-id matching, array item identity inference, or ABA detection.
- No automatic rebase of concurrent `move`, `copy`, or root mutations.
- No automatic rebase of structural local operations while concurrent changes
  exist; uncertain cases return `unsupported_operation` conflict.
- No `SelectionSnap`, range/multi-range selection, same-string text-offset
  transform, DOM focus, rendering, keyboard, or UI policy.
- No plugin registration and no `@interactive-os/json-document` internal
  imports.

## Friction report

The public `applyPatch`, Pointer helpers, and `trackPointer` exports are enough
for a conservative pure planner. Applied operations must be used instead of raw
inputs so append paths such as `/-` have concrete coordinates.

Pointer tracking alone is not sufficient: numeric object keys look like array
indexes syntactically. The planner must inspect the replayed JSON state before
shifting array siblings. Likewise, selection freshness needs a guard even when
the selection target is independent from the mutation target.

The remaining hard cases are identity and causality. A positional Pointer
cannot prove that an item removed and reinserted at the same index is the same
logical node. A later stable-id rebase experiment should compose the official
id resolver before this lab grows a protocol or adapter interface.

Freshness guards copy the guarded JSON values. A selection outside every local
mutation therefore adds its own guard and can be expensive when it points at a
large subtree. This is deliberate for the tracer; a production protocol needs
stable identity or a cheaper revision/identity token before relaxing it.
