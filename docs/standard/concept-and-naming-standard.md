# json-document Concept and Naming Standard

상태: Canonical

이 문서는 현재 `json-document` repository의 개념과 이름 문법을 정의하는 유일한
사람 작성 정본이다. 개요, API 문서, v2 compatibility profile, package README,
generated catalog와 구현 이름은 이 문서를 참조한다. Generated artifact와 현재
구현은 이 문서의 개념 의미를 덮어쓸 수 없다.

이 문서는 runtime 동작, protocol 의미, wire 형식과 stable v2 public API를
변경하지 않는다. Canonical term과 v2 compatibility identifier가 다르면 문서는
canonical term을 먼저 설명하고 실제 identifier를 code font로 병기한다.

## 이름 권위

이름은 다음 우선순위로 결정한다.

1. 구현한 개념에 해당하는 normative standard의 정확한 이름
2. repository가 사용하는 platform 또는 framework의 안정된 이름
3. 실무자가 알아보는 de-facto domain 이름
4. 모호하지 않고 일관된 local ubiquitous language
5. 대상이 소유하거나 결정하는 책임 이름
6. 앞선 이름이 없을 때만 쓰는 짧은 설명 이름

낮은 순위의 이름이 높은 순위의 이름을 대체하려면 이유를 기록해야 한다.

Normative anchor는 RFC 8259 JSON, RFC 6901 JSON Pointer, RFC 6902 JSON
Patch, RFC 9535 JSONPath와 W3C DOM·Input Events·UI Events·composition
용어다.

협업 영역의 de-facto anchor는 change, dependency, change DAG, head,
conflict, replica, materialized view, checkpoint, compaction, relative
position, text splice, adapter와 transport-agnostic engine이다.

## 개념 경계

### 표준 JSON

| Canonical term | 정의 | 포함하지 않는 것 |
| --- | --- | --- |
| JSON value | RFC 8259와 호환되는 document data | Runtime state, DOM state, protocol envelope |
| JSON Pointer | RFC 6901에 따라 한 위치를 식별하는 주소 | JSONPath query, collaboration identity |
| JSONPath | RFC 9535에 따라 여러 위치를 찾는 query | Mutation target |
| JSON Patch | RFC 6902 ordered operation batch | Merge Patch, semantic operation |
| Patch application | JSON value에 JSON Patch를 원자적으로 적용하는 stateless 연산 | Stateful commit, notification, collaboration |

`Pure Protocol`은 별도 canonical concept가 아니다. v2 문맥에서 이 이름을
인용해야 할 때는 **v2 Pure Protocol compatibility label**이라고 쓰고, 일반
설명에서는 **stateless JSON Patch application**을 쓴다.

### JSON Document

| Canonical term | 정의 | 포함하지 않는 것 |
| --- | --- | --- |
| JSON Document | 현재 value, read, patch validation, commit과 subscription을 제공하는 stateful document | DOM, selection, history, transport |
| document value | JSON Document가 소유하는 현재 immutable JSON value | Checkpoint, replica status |
| patch validation | Patch를 commit할 수 있는지 state 변경 없이 평가하는 작업 | Commit, boolean-only capability |
| validation | Candidate document가 configured constraint를 만족하는지 평가하는 작업 | Transformation, normalization |
| commit | JSON Patch를 state에 원자적으로 적용하는 작업 | Stateless Patch application |
| applied change | 실제 적용된 canonical operations와 owned metadata | 실패한 candidate operations |
| change notification | State-changing commit 뒤 subscriber에게 전달되는 applied change | Document value, replica diagnostics |
| subscription | Change notification listener를 등록한 연결 | Network subscription |

다음 local synonym은 canonical concept에 합친다.

```text
Document Projection + Projection snapshot
  -> JSON Document + document value

acceptance + capability probe + schema acceptance
  -> validation

publication
  -> change notification
```

`Projection`, `canPatch`, `JSONCapabilityResult`, `accepts`는 deprecated stable
v2 compatibility identifier로만 남는다. Canonical code는 `JSONDocument`,
`validatePatch`, `JSONPatchValidationResult`, `validate`를 사용한다.

### Collaboration

| Canonical term | 정의 | 포함하지 않는 것 |
| --- | --- | --- |
| collaboration engine | Authored Patch를 causal changes로 번역하고 replicas를 수렴시키는 transport-agnostic engine | Network provider |
| replica | 한 participant가 소유한 causal state와 sync surface | User presence |
| change | 작성된 원자적 causal record | 적용 전 command |
| Change ID | Actor ID와 actor-local counter로 만든 change identity | Pointer, array index |
| dependency | Change의 causal predecessor | Runtime/package dependency |
| change DAG | Dependencies로 연결한 directed acyclic graph | Materialized JSON tree |
| head | 알려진 successor가 없는 현재 causal frontier change | Array head, document root |
| collaboration bundle | Epoch과 changes를 담는 transport-neutral exchange artifact | Network framing |
| replica status | Heads, pending changes, conflicts, suppressed changes를 담은 현재 진단 상태 | Restore artifact |
| pending change | Dependencies가 도착하지 않아 materialize할 수 없는 change | Failed 또는 suppressed change |
| conflict | Deterministic winner와 보존된 concurrent alternatives | Validation failure |
| suppressed change | 알려졌지만 validation/history 규칙 때문에 현재 materialization에 기여하지 않는 change | 영구 폐기된 input |
| materialization | Change DAG에서 현재 JSON document value를 결정적으로 계산하는 작업 | DOM rendering |

`provider`는 실제 network, storage, schema 또는 host provider에만 쓴다.
Transport를 소유하지 않는 collaboration package는 **collaboration engine**이다.

`CollaborationSnapshot`은 deprecated compatibility alias다. Canonical type은
`ReplicaStatus`이며 snapshot이나 checkpoint로 설명하지 않는다.

### Lifecycle

| Canonical term | 정의 | 포함하지 않는 것 |
| --- | --- | --- |
| epoch | Base document, ruleset과 membership이 고정되는 collaboration generation | Browser session |
| membership | 한 epoch에서 change를 작성하도록 admitted된 actors | Authentication proof |
| checkpoint | Restore에 충분한 versioned integrity-protected artifact | Current diagnostic status |
| compaction | Causal history를 새 epoch base로 접는 작업 | In-place history deletion |
| restore | Checkpoint를 검증하고 runtime을 재구성하는 작업 | Undo |

### Collaborative history

| Canonical term | 정의 |
| --- | --- |
| selective undo | 다른 actor를 덮어쓰지 않고 현재 actor의 causal contribution을 비활성화하는 작업 |
| selective redo | 유효한 selective undo contribution을 다시 활성화하는 작업 |
| history status | 현재 undo/redo target, depth와 revision |

History undo/redo는 document time travel이나 inverse-value overwrite가 아니다.

### Collaborative text

| Canonical term | 정의 |
| --- | --- |
| text atom | Collaborative string의 stable-identity unit |
| text splice | Stable left/right context에 상대적인 removal과 insertion |
| relative selection | Causal context를 유지하는 anchor/focus 위치 |
| text capture | Native input 전 text, selection과 causal frontier |
| text plan | Capture와 최종 DOM observation에서 준비한 splice |
| text commit | 유효하고 stale하지 않은 Text Plan의 causal commit |

`capture -> plan -> commit`은 stale-plan detection과 native-input
reconciliation을 소유하므로 일반 patch validation과 합치지 않는다.

### DOM과 editor

| Canonical term | 정의 |
| --- | --- |
| DOM adapter | Platform DOM state를 observe, render, restore하는 경계 |
| contenteditable adapter | 한 contenteditable root와 collaborative text를 연결하는 adapter |
| native-input DOM lease | Model ingestion은 계속하면서 browser에 DOM mutation ownership을 임시로 맡기고 model-to-DOM rendering만 유예하는 상태 |
| composition session | W3C IME composition lifecycle |

Native-input DOM lease는 collaboration ingestion을 멈추지 않는다.

## 이름 문법

Public TypeScript 이름은 다음 순서로 만든다.

```text
[standard 또는 domain qualifier] + [subject] + [role suffix]
```

예:

```text
JSONPatchOperation
JSONDocumentCommitResult
CollaborationCheckpoint
ReplicaStatus
TextPlanResult
ContentEditableAdapter
```

Package 이름과 subpath가 이미 namespace이면 타입 이름에서 반복하지 않는다.

```text
avoid  CollaborationTextCaptureResult
prefer TextCaptureResult from the /text subpath
```

## 접두어와 casing

### `JSON`

타입 의미가 JSON 표준 경계에 의해 정의될 때만 사용한다.

```text
keep   JSONValue, JSONDocument, JSONPatchOperation
keep   JSONPatchResult, JSONAppliedChange, JSONChangeMetadata
avoid  JSONCollaborationRuntime, JSONReplicaStatus, JSONTextCapture
```

`JSON`은 JSON을 사용한다는 표시가 아니라 JSON 표준 경계가 의미를 정의한다는
표시다.

### `Collaboration`

최상위 collaboration concept와 artifact에만 사용한다.

```text
CollaborationRuntime
CollaborationChange
CollaborationBundle
CollaborationConflict
CollaborationCheckpoint
CollaborationEpoch
CollaborationMembership
```

History, text, status, DOM type마다 반복하지 않는다.

### `Collaborative`

이미 namespace가 제공되지 않는 표면에서 collaborative subject를 구분해야 할
때만 형용사로 사용한다.

```text
prefer TextRuntime from /text
next   CollaborativeTextRuntime
avoid  CollaborationTextRuntime
```

### `DOM`

W3C casing을 유지한다. Platform boundary라면 책임 suffix를 붙인다.

```text
prefer TextDOMAdapter
avoid  CollaborationTextDOM
```

### `ContentEditable`

TypeScript type은 `ContentEditable` casing을 사용한다. Package가 collaboration
namespace를 이미 제공하면 그 접두어를 반복하지 않는다.

### `Id`

Type은 `Id`, value와 property는 `...Id`를 사용한다.

```text
ActorId, ChangeId, actorId, epochId
```

`ActorID`, `ChangeID`, `actorID`는 사용하지 않는다.

## 접미어

| Suffix | 사용하는 경우 | 사용하지 않는 경우 |
| --- | --- | --- |
| `Document` | 사용자-facing 논리 document state | Replica diagnostics, checkpoint |
| `Value` | JSON content 자체 | Stateful document |
| `Operation` | 실행할 command 또는 protocol atom | Historical record |
| `Change` | 작성되거나 적용된 record | Candidate command |
| `Result` | `{ ok: true } \| { ok: false }` expected-outcome union | 임의 return object |
| `Success` | 독립 재사용하는 Result success variant | Boolean status |
| `Failure` | 반환하는 expected-failure variant | Thrown exception |
| `Error` | Thrown `Error` subclass | Expected failure value |
| `Options` | Caller가 제공하는 선택적 입력 | Runtime state, shared ruleset |
| `Runtime` | 관련 stateful capabilities의 조합 | Plain data |
| `Replica` | 한 participant의 causal state와 sync surface | Transport |
| `Status` | 현재 진단 정보 | Restore artifact |
| `Snapshot` | 한 시점의 완전한 immutable state | Diagnostics 또는 checkpoint의 동의어 |
| `Checkpoint` | Versioned restoreable artifact | Current status |
| `Payload` | Envelope 안의 serializable body | Top-level domain object |
| `Report` | 완료 작업의 통계와 진단 | Success/failure union |
| `Adapter` | 외부 platform/model 변환 경계 | Domain state |
| `Binding` | 두 public model 사이의 지속적 synchronization | 일반 wrapper |

### 제한 suffix

새 public 이름에는 다음 suffix를 쓰지 않는다.

```text
Control
Manager
Helper
Util
Common
Misc
Data
Info
```

`Data`가 JSON data처럼 정확한 표준 용어일 때는 예외다. 기존 compatibility
identifier는 versioned migration 없이 제거하지 않는다.

책임 이름으로 대체한다.

```text
CollaborationControl -> CollaborationReplica
CollaborationSnapshot -> ReplicaStatus
PointerHelper -> PointerParser 또는 PointerBuilder
CheckpointManager -> CheckpointStore 또는 CheckpointVerifier
```

## Operation과 Change

이 구분은 불변이다.

```text
Operation = 수행할 instruction
Change    = 작성되거나 적용된 historical record
```

따라서:

- `JSONPatchOperation`, `SemanticOperation`, `TextSpliceOperation`은 command다.
- `JSONAppliedChange`, `CollaborationChange`, `PendingChange`,
  `SuppressedChange`는 record다.

## 함수 동사

| Prefix | 의미 |
| --- | --- |
| `create*` | 새 document, runtime, adapter 또는 identity 구성 |
| `restore*` | Persisted state 검증과 runtime 재구성 |
| `apply*` | Operations를 value 또는 state에 적용 |
| `validate*` | State 변경 없이 입력 검사 |
| `parse*` | Syntax parse, invalid syntax에서 throw |
| `tryParse*` | Syntax parse, invalid syntax에서 null/failure 반환 |
| `build*` | Structured parts로 public representation 조립 |
| `append*` | 기존 representation에 component 하나 추가 |
| `track*` | Change를 통과한 identity/location 추적 |
| `materialize*` | Change history/DAG를 현재 domain value로 fold |
| `project*` | 낮은 수준 구조에서 read representation 파생; internal 전용 |
| `export*` | Typed transport-neutral artifact 생성 |
| `ingest*` | 신뢰하지 않는 외부 artifact 검증과 replica 통합 |
| `compact*` | History를 새 recovery boundary로 fold |

같은 validation 책임에 `accept*`, `check*`, `probe*`, `validate*`를 섞지 않는다.
Boolean capability predicate만 `can*`을 사용할 수 있다.

## Boolean

Public boolean은 predicate로 읽혀야 한다.

| Prefix | 의미 |
| --- | --- |
| `is*` | Classification 또는 current state |
| `has*` | Possession 또는 existence |
| `can*` | Capability |
| `should*` | Policy decision |
| `did*` | 완료된 operation의 outcome |

예:

```text
isUndoable
hasPendingChanges
canUndo
shouldPublish
didChangeDocument
```

`ok`는 Result discriminant이므로 유지한다. `active`, `available`, `valid`,
`accepted`, `changed` 같은 무접두 public boolean은 새로 만들지 않는다.

Canonical replacement:

```text
projectionChanged (deprecated alias) -> didChangeDocument
```

Canonical field와 compatibility field는 같은 boolean을 반환한다.

## Collection과 축약

Collection은 복수 명사를 사용한다.

```text
operations, changes, dependencies, heads, conflicts, members
```

새 public name과 wire field에는 피할 수 있는 축약을 만들지 않는다.

```text
prefer dependencies, operations, document, previous, current
avoid  deps, ops, doc, prev, curr, cfg, ctx
```

기존 versioned wire field `deps`, `ops`는 별도 protocol version 승인 전까지
변경하지 않는다. Prose에서는 dependencies와 operations라고 설명할 수 있다.

안정된 acronym은 대문자를 유지한다.

```text
JSON, DOM, URI, URL, IME
```

Identifier의 `Id`는 앞선 TypeScript casing 규칙을 따른다.

## 파일과 경로

- TypeScript module file과 folder는 `kebab-case`를 사용한다.
- React component처럼 platform convention이 책임을 나타내는 파일은
  `PascalCase`를 허용한다.
- Package entrypoint는 export subpath와 맞춘 `index.ts` 또는
  `<subpath>-index.ts`를 사용한다.
- Compatibility profile, vector, fixture와 test file은 호환 대상의 기존 이름을
  포함할 수 있지만 경로 자체가 compatibility artifact임을 드러내야 한다.
- Canonical domain path는 `domain/json-document`다.
  `domain/projection`은 사용하지 않는다.

## 현재 이름 평가

| Current name | 책임 | Match | 모호성 | 결정 | Canonical 또는 proposed name |
| --- | --- | --- | --- | --- | --- |
| `JSONDocument` | Stateful document API | Exact domain | 없음 | keep | `JSONDocument` |
| Document Projection | 같은 stateful document API | Weak/local | DB projection과 충돌 | merge | JSON Document |
| Pure Protocol | Stateless Patch application | Weak/local | Wire protocol과 충돌 | merge | stateless JSON Patch |
| `canPatch` | Patch와 candidate validation | Near | Capability/probe synonym | compatibility alias | `validatePatch` |
| `JSONCapabilityResult` | Patch validation result | None | 지나치게 넓음 | compatibility alias | `JSONPatchValidationResult` |
| `accepts` | Candidate validator | Near | Boolean처럼 보이나 Result 반환 | compatibility alias | `validate` |
| acceptance | Candidate validation | Near | Validation과 중복 | merge | validation |
| publication | Subscriber notification | Near | Process/mechanism 모호 | merge | change notification |
| `JSONAppliedChange` | Applied canonical operations | Exact | 없음 | keep | `JSONAppliedChange` |
| collaboration provider | Transport-free causal engine | Mismatch | Provider는 connector를 암시 | rename prose | collaboration engine |
| `CollaborationControl` | Replica status/sync/checkpoint API | None | Vague responsibility | compatibility alias | `CollaborationReplica` |
| `runtime.collaboration` | Replica surface | Near | Package 이름이지 역할이 아님 | compatibility alias | `runtime.replica` |
| `CollaborationSnapshot` | Current causal diagnostics | Mismatch | Snapshot/checkpoint 충돌 | compatibility alias | `ReplicaStatus` |
| `current()` | Replica status 반환 | Weak | Return 의미가 숨음 | compatibility alias | `status()` |
| `CollaborationBundle` | Epoch/change exchange artifact | Near | Full/incremental 불명확 | keep | `CollaborationBundle` |
| `SuppressedChange` | Known inactive contribution | Exact local | Rejection과 구분 필요 | keep | `SuppressedChange` |
| `materializeChanges` | DAG에서 current document 파생 | Exact de-facto | 없음 | keep | `materializeChanges` |
| `projectionChanged` | Visible document change outcome | Weak | 제거할 concept 누출 | compatibility alias | `didChangeDocument` |
| `CollaborationTextDOM` | DOM observe/render/selection boundary | Mismatch | DOM state처럼 보임 | compatibility alias | `TextDOMAdapter` |
| publication lease | Native input 중 DOM rendering 유예 | Local | Sync lock으로 오해 | rename prose | native-input DOM lease |

## v2 compatibility map

| Canonical term | Stable v2 identifier 또는 label | 사용 규칙 |
| --- | --- | --- |
| JSON Document | `JSONDocument`, Document Projection, Projection | `JSONDocument`는 유지하고 Projection은 v2 compatibility 문맥에서만 사용 |
| Stateless JSON Patch | Pure Protocol, `applyPatch` | `applyPatch`는 유지하고 Pure Protocol을 새 canonical concept로 사용하지 않음 |
| Patch validation | `canPatch`, `JSONCapabilityResult` | Deprecated alias; code는 `validatePatch`, `JSONPatchValidationResult` 사용 |
| Validation | acceptance, `accepts` | Wire label과 deprecated alias; code는 `validate` 사용 |
| Applied change | `JSONAppliedChange` | 그대로 사용 |
| Change notification | publication, `subscribe` | `subscribe`는 유지하고 publication을 notification으로 설명 |
| Collaboration engine | collaboration provider package description | Transport-free engine으로 설명 |
| Replica | `CollaborationControl`, `runtime.collaboration` | Deprecated alias; `CollaborationReplica`, `runtime.replica` 사용 |
| Replica status | `CollaborationSnapshot`, `current()` | Deprecated alias; `ReplicaStatus`, `status()` 사용 |
| History status | `CollaborationHistorySnapshot` | Deprecated alias; `HistoryStatus` 사용 |
| Native-input DOM lease | DOM/IME publication lease | Rendering만 유예한다고 명시 |
| DOM adapter | `CollaborationTextDOM` | Deprecated alias; `TextDOMAdapter` 사용 |

## Current public surface decisions

## Compatibility migration

Compatibility alias는 기존 runtime object 또는 export와 같은 값을 가리키며 별도
동작이나 개념을 만들지 않는다.

```text
Core
  canPatch                         -> validatePatch
  JSONCapabilityResult             -> JSONPatchValidationResult
  options.accepts                  -> options.validate

Collaboration
  runtime.collaboration            -> runtime.replica
  CollaborationControl             -> CollaborationReplica
  CollaborationSnapshot            -> ReplicaStatus
  replica.current()                -> replica.status()
  CollaborationAcceptance          -> CollaborationValidation

History subpath
  CollaborationHistory*            -> History*
  createCollaborationHistoryRuntime -> createHistoryRuntime
  restoreCollaborationHistoryRuntime -> restoreHistoryRuntime
  history.current()                -> history.status()

Text subpath
  CollaborationText*               -> Text*
  createCollaborationTextRuntime    -> createTextRuntime
  restoreCollaborationTextRuntime   -> restoreTextRuntime

Contenteditable package
  CollaborationContentEditable*        -> ContentEditable*
  createCollaborationContentEditableAdapter -> createContentEditableAdapter
  CollaborationTextDOM*                -> TextDOMAdapter / DOMObservation
  plainTextCollaborationDOM             -> plainTextDOMAdapter

Boolean result
  projectionChanged                -> didChangeDocument
```

Wire fields와 error code인 `acceptance`, `acceptance_required`,
`acceptance_reentrancy`, `deps`, `ops`는 protocol compatibility 영역이므로
이 migration의 identifier 대상이 아니다.

아래 표는 현재 public export를 canonical 또는 compatibility alias로 분류한다.
Canonical 이름은 새 코드와 문서가 사용한다. Compatibility alias는 기존 소비자를
보호하지만 새 코드에서 사용하지 않으며 `@deprecated`로 표시한다.

### Core root

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `JSONValue`, `Pointer`, `JSONPatchOperation`, `JSONAppliedChange`, `JSONPatchResult`, `JSONDocument`, `JSONDocumentOptions`, `JSONDocumentCommitOptions`, `JSONDocumentCommitResult`, `JSONPatchValidationResult`, `ReadResult`, `QueryResult` | Standard JSON 또는 책임 suffix와 일치 |
| keep | `createJSONDocument`, `applyPatch`, `parsePointer`, `tryParsePointer`, `buildPointer`, `parentPointer`, `appendSegment`, `trackPointer` | Function verb grammar와 일치 |
| merge | `JSONChangeMetadata` | Applied change의 metadata이며 별도 domain concept를 만들지 않음 |
| compatibility alias | `JSONCapabilityResult`, `canPatch`, `accepts` | 각각 `JSONPatchValidationResult`, `validatePatch`, `validate`로 대체 |

### Collaboration root

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `ActorId`, `ChangeId`, `MemberId`, `ContainerNodeId`, `PositionId`, `TextNodeId`, `TextAtomId` | Stable identity와 `Id` casing |
| keep | `ObjectPlacement`, `ArrayPlacement`, `MemberPlacement` | Stable placement responsibility |
| keep | `SemanticOperation`, `TextSpliceOperation` | Operation은 instruction |
| keep | `CollaborationChange`, `PendingChange`, `SuppressedChange` | Change는 record |
| keep | `CollaborationBundle`, `CollaborationConflict`, `CollaborationCheckpoint`, `CollaborationCheckpointPayload` | Top-level collaboration artifact와 suffix가 일치 |
| keep | `CollaborationEpoch`, `CollaborationEpochParent`, `CollaborationMember`, `CollaborationMembership`, `CollaborationRulesetIdentity` | Lifecycle과 membership 책임이 명확 |
| keep | `CollaborationIngestSuccess`, `CollaborationIngestFailure`, `CollaborationIngestResult` | Result variant grammar와 일치 |
| keep | `CollaborationRuntime`, `CollaborationRuntimeOptions`, `CollaborationRestoreOptions`, `CollaborationRestoreResult`, `CollaborationCompactionOptions`, `CollaborationCompactionReport`, `CollaborationCompactionResult`, `CollaborationReplica`, `ReplicaStatus`, `CollaborationValidation` | Runtime/Options/Result/Report/Replica/Status grammar와 일치 |
| keep | `createCollaborationRuntime`, `restoreCollaborationRuntime`, `compactCollaborationCheckpoint` | Function verb grammar와 일치 |
| compatibility alias | `CollaborationAcceptance`, `CollaborationControl`, `CollaborationSnapshot`, `runtime.collaboration`, `current()` | 각각 `CollaborationValidation`, `CollaborationReplica`, `ReplicaStatus`, `runtime.replica`, `status()`로 대체 |

### History subpath

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `History`, `HistoryStatus`, `HistoryResult`, `HistoryRuntime`, `HistoryRestoreResult`, `createHistoryRuntime`, `restoreHistoryRuntime` | Subpath namespace와 책임 suffix가 일치 |
| compatibility alias | `CollaborationHistoryControl`, `CollaborationHistorySnapshot`, `CollaborationHistoryResult`, `CollaborationHistoryRuntime`, `CollaborationHistoryRestoreResult`, `createCollaborationHistoryRuntime`, `restoreCollaborationHistoryRuntime`, `current()` | Canonical `History*`, `createHistoryRuntime`, `restoreHistoryRuntime`, `status()`로 대체 |

### Text subpath

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `Text`, `TextSelection`, `TextObservation`, `TextCapture`, `TextCaptureResult`, `TextPlan`, `TextPlanResult`, `TextCommitResult`, `TextRuntime`, `TextRestoreResult`, `createTextRuntime`, `restoreTextRuntime` | Subpath namespace와 capture/plan/commit 책임이 일치 |
| compatibility alias | `CollaborationTextControl`, `CollaborationTextSelection`, `CollaborationTextObservation`, `CollaborationTextCapture`, `CollaborationTextCaptureResult`, `CollaborationTextPlan`, `CollaborationTextPlanResult`, `CollaborationTextCommitResult`, `CollaborationTextRuntime`, `CollaborationTextRestoreResult`, `createCollaborationTextRuntime`, `restoreCollaborationTextRuntime` | Canonical `Text*`, `createTextRuntime`, `restoreTextRuntime`로 대체 |

### Contenteditable package

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `ContentEditableAdapter`, `ContentEditableOptions`, `ContentEditableResult`, `createContentEditableAdapter`, `TextDOMAdapter`, `DOMObservation`, `plainTextDOMAdapter` | Package namespace와 DOM Adapter 책임이 일치 |
| compatibility alias | `CollaborationContentEditableAdapter`, `CollaborationContentEditableOptions`, `CollaborationContentEditableResult`, `CollaborationTextDOM`, `CollaborationTextDOMObservation`, `createCollaborationContentEditableAdapter`, `plainTextCollaborationDOM` | Canonical 이름으로 대체 |

## Target vocabulary

이 목록은 현재 canonical public vocabulary다.

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

## 새 concept admission

새 public concept나 synonym은 다음 질문에 모두 yes일 때만 추가한다.

```text
1. 아직 이름 붙지 않은 별도 책임인가?
2. 적용 가능한 normative 또는 stable de-facto name이 없는가?
3. Prefix, suffix, verb, boolean과 casing 규칙을 따르는가?
4. 독자가 기억할 concept 수를 늘리지 않는가?
5. 인접 concept와 경계를 검증할 수 있는가?
6. Public API와 wire compatibility 영향을 설명할 수 있는가?
```

하나라도 no이면 기존 canonical term을 재사용하거나 정확한 qualifier를 붙인다.

## 변경 절차

1. Naming evaluation table에 책임, 근거, 안정성, 일관성, 모호성, concept
   reduction과 compatibility 영향을 기록한다.
2. Canonical prose 변경과 code identifier 변경을 분리한다.
3. Stable identifier나 wire field 변경은 별도 versioned migration으로 승인받는다.
4. Overview, API, compatibility profile, collaboration/history/text,
   contenteditable와 contributor 문서를 함께 갱신한다.
5. Generated artifact는 이 정본을 복제하지 않고 참조 또는 검증한다.
6. Naming drift check와 관련 test를 통과한다.

## 불변 규칙

1. RFC/W3C 이름은 동의어를 만들지 않는다.
2. `JSON`은 표준 JSON boundary type에만 붙인다.
3. `Collaboration`은 최상위 collaboration artifact에만 붙인다.
4. Subpath가 namespace이면 type name에 namespace를 반복하지 않는다.
5. Operation은 instruction이고 Change는 record다.
6. Result는 `{ ok }` success/failure union에만 붙인다.
7. Failure는 반환값이고 Error는 thrown object다.
8. Options는 caller input, Status는 현재 진단, Snapshot은 완전한 시점
   state, Checkpoint는 restoreable artifact다.
9. Runtime은 stateful capability 조합, Replica는 causal participant,
   Adapter는 외부 platform boundary다.
10. `Control`, `Manager`, `Helper`, `Util`, `Common`, `Misc`, vague `Data`,
    vague `Info`를 새 public 이름에 쓰지 않는다.
11. Public boolean은 `is`, `has`, `can`, `should`, `did`로 읽히게 한다.
12. 새 public field를 불필요하게 축약하지 않는다.
13. 같은 validation 책임에는 하나의 동사를 사용한다.
14. Public canonical concept는 JSON Document이며 Projection은 v2
    compatibility label로만 남긴다.
15. 이름 변경은 runtime logic, protocol semantics 또는 wire behavior 변경을
    승인하지 않는다.
