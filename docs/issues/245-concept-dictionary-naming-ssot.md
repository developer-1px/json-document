# Issue #245 raw — Establish the canonical concept dictionary and naming grammar

이 파일은 GitHub issue #245에 등록한 실행 계약의 raw 보존본이다. 개념과 이름의
현재 정본은 `docs/standard/concept-and-naming-standard.md`이며, 두 문서가
충돌하면 standard가 구현 결과의 authority다. Goal Anchor의 scope authority는
issue #245와 명시적으로 승인된 append-only contract delta다.

### Goal Anchor

- Outcome: Establish one durable, repository-owned source of truth for the concepts and naming grammar of the current JSON document, causal collaboration, history, collaborative text, checkpoint, and contenteditable boundaries.
- Done: A canonical concept dictionary and prefix/suffix/grammar rules are published in the repository; every current public concept is classified as keep, merge, rename, restrict, or remove; v2 compatibility names are mapped to canonical terms; future names can be evaluated mechanically without reconstructing this discussion.
- Don't: Do not change runtime behavior, protocol semantics, wire compatibility, package boundaries, or the stable v2 public API in this issue. Do not treat documentation cleanup as authorization for breaking renames. Do not introduce synonyms that increase the number of concepts.

The Goal Anchor above is immutable history. Any change to Outcome, Done, or Don't
requires an explicit, append-only contract-delta comment with the user's
authorization and reason. Context summaries and implementation plans are not
scope authority; after context loss, reread this issue and the current diff.

## Why

The repository currently has a sound implementation model, but its vocabulary is
distributed across the public overview, the stable v2 Projection Profile, API
reference, package READMEs, TypeScript contracts, conformance fixtures, and
implementation names.

Several local terms describe concepts that already have stable standard or
de-facto names:

- `Pure Protocol` overlaps stateless JSON Patch application.
- `Document Projection` overlaps the already-public `JSONDocument`.
- `snapshot` is used for current values, diagnostic state, historical state, and
  restore artifacts.
- `acceptance`, `capability`, `probe`, schema checks, and validation overlap.
- `publication`, notification, observation, and subscription overlap.
- `provider` describes a transport-free collaboration engine even though major
  collaboration ecosystems use provider for network connectors.
- `CollaborationSnapshot` contains current causal diagnostics rather than a
  complete historical or restoreable snapshot.
- `Control`, `Runtime`, `Adapter`, and package-name prefixes overlap without one
  explicit grammar.

This creates same-name/different-meaning and different-name/same-meaning costs.
The intended change is concept reduction, not cosmetic renaming.

## Naming authority order

Every naming decision must use this order:

1. Exact normative-standard term when the code models that concept.
2. Stable platform or framework term already used by the repository.
3. De-facto domain term recognized by practitioners.
4. Consistent local ubiquitous language.
5. Responsibility name describing what the item owns or decides.
6. A short descriptive name only when no stronger term exists.

Lower-priority vocabulary must not replace a higher-priority term without a
written reason.

Normative anchors:

- RFC 8259: JSON
- RFC 6901: JSON Pointer
- RFC 6902: JSON Patch and JSON Patch operation
- RFC 9535: JSONPath
- W3C DOM, Input Events, UI Events, and composition terminology

De-facto collaboration anchors:

- change, dependency, change DAG, head, conflict, materialized view
- replica, sync, checkpoint/snapshot, compaction
- presence/awareness/ephemeral state
- relative position/cursor and text splice
- adapter/binding and transport-agnostic engine

## Canonical concept dictionary

### Standard JSON layer

| Canonical concept | Definition | Excludes |
| --- | --- | --- |
| JSON value | RFC 8259-compatible document data | Runtime state, DOM state, protocol envelope |
| JSON Pointer | RFC 6901 address identifying one location | JSONPath query, stable collaboration identity |
| JSONPath | RFC 9535 query returning matching locations | Mutation target |
| JSON Patch | RFC 6902 ordered operation batch | Merge Patch, semantic collaboration operations |
| Patch application | Stateless, atomic application of JSON Patch to a JSON value | Stateful commit, publication, collaboration |

`Pure Protocol` must not remain a separate user-facing concept. In prose it
becomes **stateless JSON Patch application**. `applyPatch` remains the API name.

### Document layer

| Canonical concept | Definition | Excludes |
| --- | --- | --- |
| JSON Document | Stateful document exposing current value, reads, patch validation, commit, and subscription | DOM, selection, history, transport |
| document value | Current immutable JSON value owned by a JSON Document | Checkpoint, replica status |
| patch validation | Side-effect-free evaluation of whether a patch can be committed | Commit, boolean-only capability |
| commit | Atomic stateful application of JSON Patch | Stateless patch application |
| applied change | Canonical operations that were actually applied, with owned metadata when present | Candidate operations that failed |
| change notification | Applied change delivered after a successful state-changing commit | Current value, replica diagnostics |
| subscription | Registration that observes change notifications | Transport subscription |
| validation | Provider-neutral candidate-document constraint evaluation | Transformation or normalization |

Collapse the following vocabulary:

```text
Document Projection + Projection snapshot -> JSON Document + document value
acceptance + capability probe + schema acceptance -> validation
publication -> change notification
```

### Collaboration layer

| Canonical concept | Definition | Excludes |
| --- | --- | --- |
| collaboration engine | Transport-agnostic component that converts authored patches to causal changes and converges replicas | Network provider |
| replica | One collaboration participant's causal state and sync surface | User presence |
| change | Atomic authored causal record | Unapplied command |
| Change ID | Actor ID plus actor-local counter | Pointer or array index |
| dependency | Causal predecessor of a change | Runtime/package dependency |
| change DAG | Changes connected by causal dependencies | Materialized JSON tree |
| head | Current causal frontier change without a known successor | Array head or document root |
| collaboration bundle | Transport-neutral epoch-and-changes exchange artifact | Network message framing |
| replica status | Current heads, pending changes, conflicts, and suppressed changes | Restoreable snapshot/checkpoint |
| pending change | Change waiting for missing dependencies | Failed or suppressed change |
| conflict | Deterministic winner and preserved concurrent alternatives | Validation failure |
| suppressed change | Known change currently excluded from materialization by validation/history rules | Permanently rejected input |
| materialization | Deterministic derivation of the current JSON document from the change DAG | DOM rendering |

`CollaborationSnapshot` is canonically **replica status**. `provider` must not
describe the transport-free engine. `Provider` is reserved for actual network,
storage, schema, or host providers when one exists.

### Lifecycle layer

| Canonical concept | Definition | Excludes |
| --- | --- | --- |
| epoch | Generation in which base document, ruleset, and membership are fixed | Browser session |
| membership | Actors admitted to author changes in an epoch | Authentication proof |
| checkpoint | Versioned, integrity-protected artifact sufficient for restore | Current diagnostic status |
| compaction | Folding causal history into a new epoch base | In-place history deletion |
| restore | Validating a checkpoint and reconstructing a runtime | Ordinary undo |

### Collaborative history layer

| Canonical concept | Definition |
| --- | --- |
| selective undo | Disabling the current actor's causal contribution without overwriting another actor |
| selective redo | Reinstating an eligible selectively undone contribution |
| history status | Current undo/redo targets, depths, and revision |

History undo/redo is not document time travel and not inverse-value overwrite.

### Collaborative text layer

| Canonical concept | Definition |
| --- | --- |
| text atom | Stable-identity unit in collaborative text |
| text splice | Removal and insertion relative to stable left/right context |
| relative selection | Anchor/focus positions that retain causal context |
| text capture | Pre-native-input text, selection, and causal frontier |
| text plan | Prepared splice derived from a capture and final DOM observation |
| text commit | Causal commit of a valid, non-stale text plan |

`capture -> plan -> commit` remains distinct from ordinary patch validation and
commit because it owns stale-plan detection and native-input reconciliation.

### DOM and editor boundary

| Canonical concept | Definition |
| --- | --- |
| DOM adapter | Boundary that observes, renders, and restores platform DOM state |
| contenteditable adapter | Adapter connecting one contenteditable root to collaborative text |
| native-input DOM lease | Temporary browser ownership of DOM mutation while model ingestion continues and model-to-DOM rendering is deferred |
| composition session | W3C IME composition lifecycle |

The lease never pauses collaboration ingestion. It gates DOM rendering only.

## Canonical naming grammar

Public TypeScript names use:

```text
[standard or domain qualifier] + [subject] + [role suffix]
```

Examples:

```text
JSONPatchOperation
JSONDocumentCommitResult
CollaborationCheckpoint
ReplicaStatus
TextPlanResult
ContentEditableAdapter
```

Do not use:

```text
[package name] + [subpath/profile name] + [subject] + [role]
```

Subpath exports already provide a namespace. Avoid names such as
`CollaborationTextCaptureResult` when `TextCaptureResult` is exported from the
`/text` subpath.

## Prefix rules

### `JSON`

Use only when the type's semantics are defined by the standard JSON boundary:

- keep: `JSONValue`, `JSONDocument`, `JSONPatchOperation`,
  `JSONPatchResult`, `JSONAppliedChange`, `JSONChangeMetadata`,
  `JSONPathSyntaxError`
- avoid: `JSONCollaborationRuntime`, `JSONReplicaStatus`, `JSONTextCapture`

`JSON` means “defined by the JSON standard boundary,” not merely “contains or
uses JSON.”

### `Collaboration`

Use only for top-level collaboration concepts and artifacts:

- `CollaborationRuntime`
- `CollaborationChange`
- `CollaborationBundle`
- `CollaborationConflict`
- `CollaborationCheckpoint`
- `CollaborationEpoch`
- `CollaborationMembership`

Do not repeat it on every history, text, status, or DOM type.

### `Collaborative`

Use as an adjective only when a type must explicitly distinguish a
collaborative subject outside an already-namespaced subpath. Prefer `TextRuntime`
from `/text` over either `CollaborativeTextRuntime` or
`CollaborationTextRuntime`.

### `DOM`

Preserve W3C casing. A platform boundary must include a responsibility suffix:

- prefer: `TextDOMAdapter`
- avoid: `CollaborationTextDOM`

### `ContentEditable`

Use PascalCase `ContentEditable` in TypeScript names. Do not repeat the package's
collaboration qualifier unless collision evidence requires it.

### `Id`

Use `Id` in type names and `...Id` in values/properties:

- `ActorId`, `ChangeId`, `actorId`, `epochId`
- do not use `ActorID`, `ChangeID`, `actorID`

This follows the repository's established JavaScript/TypeScript casing.

## Suffix rules

| Suffix | Use only for | Must not mean |
| --- | --- | --- |
| `Document` | User-facing logical document state | Replica diagnostics or checkpoint |
| `Value` | JSON content itself | Stateful document |
| `Operation` | Command/protocol atom to execute | Historical record |
| `Change` | Authored or applied record | Candidate command |
| `Result` | `{ ok: true } \| { ok: false }` expected-outcome union | Arbitrary return object |
| `Success` | Reusable success variant of a Result | Boolean status |
| `Failure` | Returned expected-failure variant | Thrown exception |
| `Error` | Thrown `Error` subclass | Expected result failure |
| `Options` | Caller-supplied optional input | Runtime state or shared ruleset |
| `Runtime` | Stateful composition of related capabilities | Plain data |
| `Replica` | One participant's causal state/sync surface | Transport |
| `Status` | Current diagnostic information | Restore artifact |
| `Snapshot` | Complete immutable state at a point in time | Diagnostics or checkpoint by default |
| `Checkpoint` | Versioned restoreable artifact | Current status |
| `Payload` | Serializable body inside an envelope | Top-level domain object |
| `Report` | Statistics/diagnostics of a completed operation | Success/failure union |
| `Adapter` | External platform/model conversion boundary | Domain state |
| `Binding` | Persistent synchronization between two public models | General wrapper |

### Restricted suffixes

The following suffixes must not appear in new public names:

- `Control`
- `Manager`
- `Helper`
- `Util`
- `Common`
- `Misc`
- `Data`
- `Info`

Replace them with the owned responsibility:

```text
CollaborationControl -> CollaborationReplica
CollaborationSnapshot -> ReplicaStatus
PointerHelper -> PointerParser or PointerBuilder
CheckpointManager -> CheckpointStore or CheckpointVerifier
```

`Data` remains allowed only where it is the exact standard/domain term, such as
JSON data, not as a vague container suffix.

## Operation versus Change

This distinction is invariant:

```text
Operation = instruction to perform
Change    = authored/applied historical record
```

Examples:

- `JSONPatchOperation` is a command.
- `SemanticOperation` is an internal collaboration command atom.
- `TextSpliceOperation` is a text command atom.
- `JSONAppliedChange` records applied operations.
- `CollaborationChange` records authored semantic operations and dependencies.

## Function verb rules

| Prefix | Meaning |
| --- | --- |
| `create*` | Construct a new document/runtime/adapter/identity |
| `restore*` | Validate persisted state and reconstruct a runtime |
| `apply*` | Apply operations to a value or state |
| `validate*` | Inspect without state mutation |
| `parse*` | Parse syntax and throw on invalid syntax |
| `tryParse*` | Parse syntax and return null/failure on invalid syntax |
| `build*` | Assemble a public representation from structured parts |
| `append*` | Add one component to an existing representation |
| `track*` | Track identity/location through changes |
| `materialize*` | Fold change history/DAG into current domain value |
| `project*` | Derive a lower-level read representation; internal use only |
| `export*` | Produce a typed transport-neutral artifact |
| `ingest*` | Validate and integrate untrusted external artifact |
| `compact*` | Fold history into a new recovery boundary |

Do not mix `accept*`, `check*`, `probe*`, and `validate*` for the same validation
responsibility. Boolean capability predicates may use `can*`.

## Boolean rules

Public booleans must read as predicates:

- `is*`: classification/current state
- `has*`: possession/existence
- `can*`: capability
- `should*`: policy decision
- `did*`: outcome of a completed operation

Examples:

```text
isUndoable
hasPendingChanges
canUndo
shouldPublish
didChangeDocument
```

`ok` remains the established Result discriminant.

Avoid unqualified public boolean fields such as `active`, `available`, `valid`,
`accepted`, or `changed`. Use `isActive`, `isAvailable`, `isValid`,
`wasAccepted`, or `didChangeDocument`.

Canonical replacement:

```text
projectionChanged -> didChangeDocument
```

## Collection and abbreviation rules

Collections use plural nouns:

- `operations`, `changes`, `dependencies`, `heads`, `conflicts`, `members`

Public names and new wire fields must not introduce avoidable abbreviations:

- prefer: `dependencies`, `operations`, `document`, `previous`, `current`
- avoid: `deps`, `ops`, `doc`, `prev`, `curr`, `cfg`, `ctx`

Existing versioned wire fields such as `deps` and `ops` remain unchanged until a
new explicitly authorized protocol version. Documentation may call them
dependencies and operations without changing their serialized spelling.

Stable acronyms remain uppercase:

- `JSON`, `DOM`, `URI`, `URL`, `IME`
- `Id` follows the repository's TypeScript identifier rule above.

## Evaluation of current public vocabulary

| Current name | Responsibility | Match | Ambiguity | Decision | Canonical/proposed name |
| --- | --- | --- | --- | --- | --- |
| `JSONDocument` | Stateful document API | Exact domain | None | keep | `JSONDocument` |
| `Document Projection` | Same stateful document API | Weak/local | DB projection collision | merge | JSON Document |
| `Pure Protocol` | Stateless patch application | Weak/local | Wire protocol collision | merge | stateless JSON Patch |
| `canPatch` | Validate patch and candidate | Near | Capability/probe synonym | v3 rename | `validatePatch` |
| `JSONCapabilityResult` | Patch-validation result | None | Over-broad capability | v3 rename | `JSONPatchValidationResult` |
| `accepts` | Candidate validator | Near | Looks boolean but returns Result | v3 rename | `validate` |
| acceptance | Candidate validation | Near | Duplicate validation concept | merge | validation |
| publication | Subscriber notification | Near | Process/mechanism ambiguity | merge | change notification |
| `JSONAppliedChange` | Canonical applied operations | Exact responsibility | None | keep | `JSONAppliedChange` |
| collaboration provider | Transport-free causal engine | Mismatch | Provider implies connector | rename in prose | collaboration engine |
| `CollaborationControl` | Replica status/sync/checkpoint API | None | Vague responsibility | vNext rename | `CollaborationReplica` |
| `runtime.collaboration` | Replica surface | Near | Package name, not role | vNext rename | `runtime.replica` |
| `CollaborationSnapshot` | Current causal diagnostics | Mismatch | Snapshot/checkpoint collision | vNext rename | `ReplicaStatus` |
| `current()` | Return replica status | Weak | Return meaning hidden | vNext rename | `status()` |
| `CollaborationBundle` | Epoch-and-change exchange artifact | Near | Full vs incremental unspecified | keep | `CollaborationBundle` |
| `SuppressedChange` | Known but inactive contribution | Exact local semantics | Rejection confusion documented | keep | `SuppressedChange` |
| `materializeChanges` | Derive current document from DAG | Exact de-facto | None | keep | `materializeChanges` |
| `projectionChanged` | Commit changed visible document | Weak | Removed concept leaks | vNext rename | `didChangeDocument` |
| `CollaborationTextDOM` | DOM observe/render/selection boundary | Mismatch | Sounds like DOM state | rename | `TextDOMAdapter` |
| publication lease | Defer DOM rendering during native input | Local | Could imply sync lock | rename in prose | native-input DOM lease |

## Target public vocabulary

The exact vNext API remains a separate breaking-change decision, but new
documentation and design work should converge toward:

```text
Core
├─ JSONValue
├─ Pointer
├─ JSONPatchOperation
├─ JSONAppliedChange
├─ JSONPatchValidationResult
├─ JSONPatchResult
├─ JSONDocument
├─ JSONDocumentOptions
├─ JSONDocumentCommitOptions
└─ JSONDocumentCommitResult

Collaboration root
├─ ActorId
├─ ChangeId
├─ CollaborationChange
├─ CollaborationBundle
├─ CollaborationConflict
├─ CollaborationEpoch
├─ CollaborationMembership
├─ CollaborationCheckpoint
├─ CollaborationRuntime
├─ CollaborationReplica
├─ ReplicaStatus
├─ PendingChange
└─ SuppressedChange

History subpath
├─ History
├─ HistoryStatus
├─ HistoryResult
└─ HistoryRuntime

Text subpath
├─ TextSelection
├─ TextObservation
├─ TextCapture
├─ TextCaptureResult
├─ TextPlan
├─ TextPlanResult
├─ TextCommitResult
└─ TextRuntime

Contenteditable package
├─ TextDOMAdapter
├─ DOMObservation
├─ ContentEditableOptions
├─ ContentEditableResult
└─ ContentEditableAdapter
```

The target list is vocabulary direction, not authorization to rename every
public symbol. Each breaking rename still requires usage evidence and a
migration plan.

## Required repository SSOT

Create one canonical, human-maintained concept-and-naming document. It must:

1. Contain the Goal Anchor or link back to this issue.
2. State the naming authority order.
3. Define every canonical concept above.
4. Contain prefix, suffix, verb, boolean, collection, casing, and abbreviation
   rules.
5. Include allowed, restricted, and forbidden examples.
6. Include a canonical-term-to-v2-API compatibility map.
7. Distinguish normative standard terms, de-facto terms, and local terms.
8. Define how a new concept is proposed and rejected.
9. Be referenced by overview, API, standard-profile, collaboration, history,
   text, contenteditable, and contributor-facing documentation.
10. Be checked for drift by repository verification.

Generated catalogs may consume this SSOT but must not become its authority.

## Concept admission test

A new public concept or synonym is admitted only when all answers are yes:

```text
1. Does it represent a responsibility not already named?
2. Is there no applicable normative or stable de-facto name?
3. Does the name follow the prefix/suffix/grammar rules?
4. Does it reduce or preserve the number of concepts?
5. Is its boundary distinguishable from adjacent concepts?
6. Can its public and wire compatibility impact be stated?
```

If the proposal fails any item, reuse or qualify an existing canonical term.

## Implementation phases

### Phase A — publish the non-breaking SSOT

- Add the canonical concept-and-naming document.
- Replace the overview's distributed concept table with a summary and link.
- Add the v2 compatibility map.
- Normalize prose:
  - Pure Protocol -> stateless JSON Patch
  - Document Projection -> JSON Document
  - acceptance/capability probe -> validation
  - publication -> change notification
  - local provider -> local implementation
  - collaboration provider -> collaboration engine
  - collaboration snapshot -> replica status
  - DOM projection -> DOM adapter
- Preserve code symbols when documentation refers specifically to the v2 API.
- Mark code identifiers with code formatting so conceptual and compatibility
  names cannot be confused.

### Phase B — non-public implementation vocabulary

Evaluate and rename internal-only identifiers where tests prove no public or
wire impact:

```text
ProjectionOptions -> DocumentOptions
ProjectionDocument -> JSONDocumentImplementation
createProjection -> createDocument
acceptCandidate -> validateCandidate
PublishedProjection -> RenderedDocumentValue
```

Do not rename an identifier merely because it appears in this candidate list;
confirm responsibility and visibility first.

### Phase C — design a versioned breaking migration

Prepare, but do not execute without explicit authorization:

```text
canPatch -> validatePatch
JSONCapabilityResult -> JSONPatchValidationResult
accepts -> validate
CollaborationControl -> CollaborationReplica
runtime.collaboration -> runtime.replica
CollaborationSnapshot -> ReplicaStatus
current() -> status()
projectionChanged -> didChangeDocument
CollaborationTextDOM -> TextDOMAdapter
```

The migration design must address TypeScript aliases, deprecation windows,
machine-readable manifests, conformance suites, wire fields, package subpaths,
documentation, and semver.

## Acceptance criteria

- [ ] Exactly one repository document is declared the concept-and-naming SSOT.
- [ ] The SSOT contains all concepts and grammar rules in this issue.
- [ ] RFC/W3C-defined names retain exact standard spelling and meaning.
- [ ] Operation and Change are explicitly distinguished.
- [ ] Value, Status, Snapshot, and Checkpoint are explicitly distinguished.
- [ ] Runtime, Replica, Adapter, and Binding are explicitly distinguished.
- [ ] Result, Success, Failure, Error, Options, Payload, and Report suffixes are
      explicitly distinguished.
- [ ] JSON, Collaboration, Collaborative, DOM, ContentEditable, and Id prefix/
      casing rules are explicit.
- [ ] Function verb and boolean predicate rules are explicit.
- [ ] Collection and abbreviation rules are explicit.
- [ ] `Control`, `Manager`, `Helper`, `Util`, `Common`, `Misc`, vague `Data`, and
      vague `Info` are restricted for new public names.
- [ ] Every current public concept is marked keep, merge, rename, restrict, or
      remove.
- [ ] Canonical prose and stable v2 identifiers are visibly distinguished.
- [ ] The compatibility map covers the core, collaboration, history, text, and
      contenteditable public surfaces.
- [ ] No runtime, protocol, wire, or stable v2 API behavior changes.
- [ ] Repository checks detect undocumented vocabulary drift or stale generated
      concept output.
- [ ] A future breaking migration is separately scoped and not silently bundled
      into this issue.

## Verification

At minimum:

- documentation generation/check
- documentation evaluation
- site documentation consistency tests
- source/public-surface drift checks
- focused searches for forbidden or deprecated conceptual synonyms
- full diff audit against the Goal Anchor

Commands should be derived from the repository at implementation time. Current
likely checks include:

```text
npm run docs:check
npm run docs:evaluate
npm test -w @interactive-os/json-document-site
npm run standard:check
```

## Explicitly out of scope

- Runtime behavior changes
- CRDT or merge-rule changes
- Wire protocol field renames (`deps`, `ops`, etc.)
- Epoch/checkpoint format changes
- Package restructuring
- Presence/awareness implementation
- A generic rich-text protocol
- Immediate v2 public API removal or breaking rename
- Compatibility aliases or deprecations before a separate migration decision
- Creating unrelated cleanup issues

## Risks

- The v2 Projection Profile is stable and machine checked. Conceptual prose must
  not falsely claim that existing v2 symbol names already changed.
- `Projection` appears in standards, vectors, independent implementations,
  collaboration bindings, site descriptions, and tests. Removing the word
  mechanically would destroy compatibility context.
- `deps` and `ops` are versioned wire fields. Expanding them in prose does not
  authorize serialized-field changes.
- Over-prefix removal can create collisions at root entrypoints. Subpath
  simplification must be evaluated per export surface.
- `Snapshot` may remain valid for internal complete immutable states. Restrict
  the meaning rather than globally replacing every occurrence.
- `provider` may remain valid for actual schema/network/storage providers. Only
  the transport-free collaboration-engine misuse is targeted.

## Deferred decisions

The following remain visible but outside Done:

- Exact v3/vNext public API shape
- Alias and deprecation duration
- Whether `/history` and `/text` become stronger naming namespaces
- Whether `Pointer` should ever become `JSONPointer` in TypeScript
- Whether result booleans standardize on `didChangeDocument` or retain a
  compatibility spelling
- Whether wire protocol v4 expands `deps` and `ops`

These require explicit follow-up authorization; they are not hidden acceptance
criteria for this issue.
