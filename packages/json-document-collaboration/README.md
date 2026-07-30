# @interactive-os/json-document-collaboration

Transport-free causal collaboration engine for the six-member
`@interactive-os/json-document` JSON Document contract.

Local and collaborative implementations expose the same six-member
`JSONDocument` API.

Canonical concept와 stable compatibility identifier의 관계는
[Concept and Naming Standard](../../docs/standard/concept-and-naming-standard.md)가
정의합니다. `runtime.replica`, `CollaborationReplica`과
`ReplicaStatus`은 현재 API 이름이며 canonical prose에서는 각각 replica
surface와 replica status로 설명합니다.

```ts
import {
  createCollaborationRuntime,
} from "@interactive-os/json-document-collaboration";

const runtime = createCollaborationRuntime(initial, {
  actorId: "browser-a",
  epochId: "document-42/v1",
  ruleset: {
    id: "example/task-document",
    digest: "task-document-rules-v1",
  },
});

runtime.document.commit([
  { op: "replace", path: "/title", value: "Shared title" },
]);

send(runtime.replica.exportBundle());
receive((bundle) => runtime.replica.ingest(bundle));
```

The editor receives only `runtime.document`, whose required API is identical to
the local-only implementation. Causal state, conflicts, bundles, and sync capabilities
remain on `runtime.replica`. The package contains no transport, presence,
storage, DOM, React, or server dependency.

Actor-local selective history is an opt-in authoring surface:

```ts
import {
  createHistoryRuntime,
} from "@interactive-os/json-document-collaboration/history";

const runtime = createHistoryRuntime(initial, options);
runtime.history.undo();
runtime.history.redo();
```

The base runtime still ingests, materializes, and forwards history wire
operations so peers converge, but it does not expose history authoring
capabilities. History withdraws or reinstates the original Change contribution; it
does not write an inverse value over another actor's work.

Fine-grained JSON string collaboration is also opt-in:

```ts
import {
  createTextRuntime,
} from "@interactive-os/json-document-collaboration/text";

const runtime = createTextRuntime(initial, options);
runtime.history.undo();

// Ordinary editor code keeps using the same document API. String-to-string
// replace operations compile to collaborative text splices in this profile.
runtime.document.commit([
  { op: "replace", path: "/title", value: "Shared title" },
]);

// Native input and IME adapters capture before the browser mutates the DOM.
const captured = runtime.text.capture("/title");
if (captured.ok) {
  const planned = runtime.text.plan(captured.capture, {
    value: finalDOMText,
    selection: { anchor: 6, focus: 6 },
  });
  if (planned.ok) {
    runtime.text.commit(planned.plan, {
      metadata: { editor: { transactionId } },
    });
  }
}
```

Remote bundles may be ingested between `capture` and `plan`. The authored
Change still uses the capture-time causal frontier, so unseen remote input stays
concurrent and merges by stable text atoms. Any graph change after `plan`
returns `stale_text_plan`; adapters recover by rendering the latest model
instead of silently rebasing an already observed DOM result.

The text profile includes the same actor-local selective `history` sidecar as
the history profile. A successful text commit returns the canonical
`JSONAppliedChange`, including owned metadata, so editor transaction tracking
does not need a second change-notification protocol.

`runtime.replica.subscribe` publishes one deeply immutable replica status
when an ingest adds causal state, even if it only changes pending/conflict metadata.
Duplicate-only delivery publishes nothing. Unsubscribe follows the JSON Document
subscription contract.

## Checkpoints, membership, and epochs

`exportCheckpoint()` is a lossless same-epoch artifact. It retains every ready
and pending Change, history control, conflict input, and suppressed Change
input. Restore replays the causal state rather than trusting a cached document
value:

```ts
import {
  compactCollaborationCheckpoint,
  restoreCollaborationRuntime,
} from "@interactive-os/json-document-collaboration";

const checkpoint = runtime.replica.exportCheckpoint();
const restored = restoreCollaborationRuntime(checkpoint, {
  actorId: "browser-a",
  ruleset: options.ruleset,
});

const compacted = compactCollaborationCheckpoint(checkpoint, {
  mode: "new-epoch",
  nextEpochId: "document-42/v3",
  nextRuleset: options.ruleset,
});
```

Compaction is deliberately destructive and therefore only produces a new
epoch. It requires no pending Changes, uses the current valid JSON document
as the next base, resets actor counters, reports the discarded causal
diagnostics, and binds the new epoch to the source checkpoint digest. Hosts
must quiesce writers and coordinate the epoch switch; the transport-free core
does not claim that authority.

An optional canonical membership list binds admitted `actorId` values and
credential identifiers into the epoch digest. Unknown Change authors,
dependencies, and history references are rejected transactionally. Actor IDs
are lineage identifiers, not authentication. A host may attach a proof and
must pass `verify` on restore/compaction when authenticity matters.

The checkpoint checksum is canonical SHA-256 tamper detection. It is not a
signature. A custom `validate` resolver is recorded by the epoch's
wire-compatible `acceptance` mode;
restore and compaction fail with `acceptance_required` if that resolver is
omitted.

## Rich-text boundary

The collaboration core does not add a generic rich-text command protocol.
Rich editors already have a smaller convergence path: model their document as
JSON objects and arrays, translate editor intent to standard JSON Patch, and
use the `./text` profile for string leaves. Stable structure, moves, concurrent
insertions, text atoms, history, validation, and checkpoints then use the same
built-in wire operations that every base peer can materialize.

A concrete ProseMirror, Lexical, or custom-schema resolver belongs in its own
adapter package. It may expose higher-level commands, but it must commit
ordinary patches through the six-member `document` port and keep its schema,
DOM, marks, and selection policy out of this package. If a rich model genuinely
needs a new wire protocol, every materializing participant must install that
separate protocol; an unconfigured base document must never pretend it can
resolve opaque commands.

Native-input DOM leasing is likewise separate in
`@interactive-os/json-document-contenteditable-collaboration`. It continues
ingesting model Changes during composition and gates only rendering for the
leased surface.

## Release evidence

The ordinary package suite includes an implementation-neutral task-board host that
depends only on the six-member `JSONDocument`. The same host commands run
unchanged against the local implementation and collaboration engine, including a
concurrent card edit that follows a structural move by stable identity.

It also runs a small deterministic convergence soak on every verification.
Three replicas author randomized task-board commands and selective
undo/redo while bundles are partially, out of order, and repeatedly
delivered. Each case must converge before and after checkpoint restore,
continue the restored actor lineage without a fork, export one canonical
checkpoint, and survive new-epoch compaction.

Run the deeper reproducible profile with:

```sh
npm run test:collaboration:soak
```

The soak reports its seed in every failure so the exact schedule can be
replayed with `JSON_DOCUMENT_COLLABORATION_SOAK_SEED` and a case count of one.
This evidence protects the architecture but does not turn an RC into
production proof by itself. Stable promotion still requires sustained
external use, large-document performance evidence, and successful
offline/checkpoint/epoch operations under a real transport and storage host.

## Protocol v3 profile

The implemented profile includes:

- immutable `Change { changeId, deps, ops }` envelopes;
- actor/counter identities and dependency-frontier authoring;
- idempotent, out-of-order bundle ingestion;
- deterministic topological materialization;
- stable hidden member and container identities;
- immutable array placement incarnations and two-sided gap anchors;
- identity-preserving object rename and array/object move;
- fresh identities for copy, insertion, and container replacement;
- stable semantic `test` preconditions for dependent commands;
- atomic strings in the base authoring profile;
- opt-in lazy text atoms with exact deletion and deterministic same-gap insert;
- capture-time text frontiers and UTF-16 selection-gap restoration;
- opt-in actor-local selective undo/redo with causal history reconstruction;
- whole-Change validation and deterministic suppression;
- canonical membership, SHA-256 checkpoints, restore, and new-epoch compaction;
- valid JSON change notification through the standard six-member `JSONDocument`;
- conflict and suppression sidecars outside `document.value`.

Transport, presence, storage, signing keys, server coordination, and concrete
rich-text schemas remain outside this package.

`ruleset.id` and `ruleset.digest` are immutable within an epoch. They cover the
domain validation rule and every materialization policy used by all writers.
A mismatched bundle is rejected before any state changes.
`baseDigest`, membership, acceptance mode, and protocol version are immutable
within an epoch.

Convergence requires `validate` to be synchronous, total, side-effect-free, and
referentially transparent. For the same candidate, every replica and every
invocation must return the same complete result, including `code`, `reason`,
and `pointer`. It must not read clocks, randomness, mutable closure state, or
replica-local environment. The ruleset digest must identify its implementation
and configuration; the runtime cannot prove this property for an arbitrary
JavaScript callback.

An `actorId` identifies one persisted authoring lineage within an epoch. Its
retained counter and causal history must be ingested before that actor authors
again. Authoring is blocked while that actor has pending history, and a
non-contiguous or non-causal retained lineage is rejected. A genuinely new
writer must use a fresh actor ID; reuse cannot be detected until conflicting
history is observed.
