# @interactive-os/json-document-stable-id-rebase

Lab planner for materializing one delayed field replacement against the current
Pointer of a host-owned stable id.

It complements the positional `patch-rebase` lab. Instead of replaying a patch
log, it assumes remote changes are already present in the document and asks the
official id resolver where the authored target lives now.

```ts
const planned = rebaseStableChange(doc, {
  scopes: [{
    scope: "card",
    query: "$.columns[*].cards[*]",
    readId: value => isCard(value) ? value.id : undefined,
  }],
  target: { scope: "card", id: "b" },
  relativePath: "/title",
  expected: "Draft",
  value: "Reviewed",
  relativeSelectionAfter: "/title",
});

if (planned.ok) {
  const options = planned.selectionAfter === undefined
    ? {}
    : { selectionAfter: planned.selectionAfter };
  doc.commit(planned.operations, options);
}
```

`relativePath` and `relativeSelectionAfter` are RFC 6901 Pointers rooted at the
stable entity. A successful result's `selectionAfter` is instead an absolute
document Pointer. URI-fragment forms are accepted and returned as ordinary
canonical Pointers. `expected` is the field value observed when the delayed
input was authored; a different current value produces `target_changed` rather
than an overwrite.

## Scope

- Bind the official id resolver to the supplied document from scope
  descriptors, so a resolver for another document cannot be passed by mistake.
- Resolve one delayed non-root field replacement against the current document.
- Preserve a remote move, reorder, or unrelated field edit on the same entity.
- Return the resolver's missing, duplicate, invalid-query, and missing-scope
  meanings as structured identity failures.
- Prefix the replacement with an entity snapshot guard and an authored-value
  guard for one atomic `doc.commit`.
- Re-run the target scope's `readId` against the preview entity and reject an
  `readId`-changing replacement.
- Rebase one Pointer selection relative to the same stable entity, or report
  that it was dropped when it will not exist after the change.
- Preflight the complete guarded plan through public `doc.canPatch` semantics.

## Non-goals

- No patch-log replay, transport, acknowledgement, offline queue, causal clock,
  CRDT, OT, convergence, or replicated undo.
- No id generation, rekeying, repair, tombstone, or universal id field.
- No stable-entity root replacement, structural add/remove/move/copy, or
  multiple target batch language.
- No identity inference below `relativePath`; nested array indexes remain
  positional.
- No ABA detection when an identical entity disappears and reappears.
- No scope-wide protection against a duplicate id introduced after planning;
  products needing that invariant must enforce it in their document schema.
- No text offset, multi-range selection, DOM focus, render, or input policy.
- No mutation during planning and no plugin registration.

## Friction report

The existing resolver is sufficient to reconnect a delayed input after a move
without adding identity to core. The planner creates it internally from the
provided scopes, eliminating the unsafe possibility of resolving against a
different document. Scope names must be unique and `readId` must be deterministic
and non-mutating.

After the structural dry-run, the planner applies the matching scope's `readId`
to the preview entity and verifies that the id is unchanged. It cannot rerun the
scope's JSONPath query against the preview without another schema-backed
document, so a field that changes query membership while preserving `readId`
remains a caller-owned constraint in this tracer.

The resolver exposes the current entity Pointer but not a cheap identity guard
Pointer or revision token. The planner therefore guards the entire current
entity value. That stops a second move between planning and commit, but copying
and comparing a large entity is expensive and an unrelated post-plan field edit
causes a conservative conflict. This is concrete pressure for an indexed
resolver plus identity/revision token; it is not a reason to add clocks or CRDT
state to `JSONDocument` core.

The official resolver currently scans its configured query on each `resolve`.
This tracer calls it once, but a broad scope is still linear in its match set.
`doc.canPatch` also pays the document's schema/refinement cost. One additional
structural dry-run always verifies preview identity, and selection checking
reuses that preview when requested.

The module intentionally handles one replacement. If multiple anchored edits,
identity-based destinations, or structural operations become real callers,
they should first prove a shared operation language rather than widening this
tracer speculatively.
