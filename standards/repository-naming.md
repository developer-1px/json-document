# json-document Concept and Naming Standard

상태: Canonical

이 문서는 현재 `json-document` repository의 개념과 이름 문법을 정의하는 유일한
사람 작성 정본이다. 개요, API 문서, versioned profile, package README,
package metadata와 구현 이름은 이 문서를 참조한다. 현재 구현은 이 문서의 개념
의미를 덮어쓸 수 없다.

이 문서는 runtime 동작, protocol 의미와 wire 형식을 변경하지 않는다. Public
TypeScript API와 내부 identifier는 canonical term만 사용한다.

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

`Pure Protocol`은 retired vocabulary이며 별도 canonical concept가 아니다.
일반 설명과 identifier에서는 **stateless JSON Patch application**을 쓴다.

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

`Projection`, capability probe, acceptance callback 같은 이전 synonym은 public
identifier로 남기지 않는다. Canonical code는 `JSONDocument`, `validatePatch`,
`JSONPatchValidationResult`, `validate`만 사용한다.

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

Canonical type은 `ReplicaStatus`이며 snapshot이나 checkpoint로 설명하지 않는다.

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

### Connector

| Canonical term | 정의 | 포함하지 않는 것 |
| --- | --- | --- |
| Connector | 이름 붙은 외부 생태계의 public contract와 json-document의 public contract를 번역하는 optional package category | 공통 runtime interface, document semantics, product UI |
| Connector package | 외부 peer dependency를 격리하고 독립 version으로 배포하는 공식 integration artifact | Kernel subpath, app-local glue folder |

Connector는 TypeScript base interface가 아니라 package와 지원 정책의 분류다.
React hook, Zod validator와 TanStack Table options는 서로 다른 native contract를
유지하며 공통 `Connector` interface에 맞추지 않는다. Connector 안의 구체적인
model 또는 platform 변환 경계는 `Adapter`, 두 public model 사이의 지속적인
synchronization은 `Binding`이라고 부를 수 있다.

`Provider`는 network, storage, schema 또는 host port의 실제 구현을 가리킨다.
예를 들어 Zod schema는 validation provider이고 Zod Connector는 그 provider를
`JSONDocumentOptions.validate` contract로 번역한다. 둘은 같은 책임이 아니다.

공식 Connector는 다음 조건을 모두 만족해야 한다.

1. 대상 외부 생태계와 stable public contract가 명시되어 있다.
2. json-document의 public package surface만 import한다.
3. 외부 runtime은 Connector package의 peer dependency로 격리된다.
4. 제거하거나 교체해도 canonical JSON과 editing semantics가 바뀌지 않는다.
5. 대상 생태계의 native API 모양을 보존하고 contract test를 제공한다.
6. 지원 version 범위, connector-specific Live Demo와 browser acceptance가 있다.

공식 package는 `@interactive-os/json-document-<target>` 문법을 사용한다.
Connector들은 대상 peer와 독립적인 release lifecycle을 가지며 Kernel version을
따라 lockstep release하지 않는다. 각 package README는 지원하는 Kernel,
companion과 외부 peer version 범위를 기록한다.

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
avoid  TextRuntime
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
| `Connector` | 외부 생태계 integration package의 분류 | 공통 runtime interface 또는 product semantics |

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

`Data`가 JSON data처럼 정확한 표준 용어일 때는 예외다.

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

Completed operation의 document 변화 여부는 `didChangeDocument`만 사용한다.

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
- Versioned profile, vector, fixture와 test file도 해당 버전의 canonical
  vocabulary를 사용한다.
- Canonical domain path는 `domain/json-document`다.
  `domain/projection`은 사용하지 않는다.

## 현재 이름 평가

| Current name | 책임 | Match | 모호성 | 결정 | Canonical 또는 proposed name |
| --- | --- | --- | --- | --- | --- |
| `JSONDocument` | Stateful document API | Exact domain | 없음 | keep | `JSONDocument` |
| Document Projection | 같은 stateful document API | Weak/local | DB projection과 충돌 | merge | JSON Document |
| Pure Protocol | Stateless Patch application | Weak/local | Wire protocol과 충돌 | merge | stateless JSON Patch |
| `validatePatch` | Patch와 candidate validation | Exact responsibility | 없음 | keep | `validatePatch` |
| `JSONPatchValidationResult` | Patch validation result | Exact responsibility | 없음 | keep | `JSONPatchValidationResult` |
| `validate` | Candidate validator | Exact responsibility | 없음 | keep | `validate` |
| acceptance | Candidate validation | Near | Validation과 중복 | merge | validation |
| publication | Subscriber notification | Near | Process/mechanism 모호 | merge | change notification |
| `JSONAppliedChange` | Applied canonical operations | Exact | 없음 | keep | `JSONAppliedChange` |
| collaboration provider | Transport-free causal engine | Mismatch | Provider는 connector를 암시 | rename prose | collaboration engine |
| `CollaborationReplica` | Replica status/sync/checkpoint API | Exact responsibility | 없음 | keep | `CollaborationReplica` |
| `runtime.replica` | Replica surface | Exact responsibility | 없음 | keep | `runtime.replica` |
| `ReplicaStatus` | Current causal diagnostics | Exact responsibility | 없음 | keep | `ReplicaStatus` |
| `status()` | Replica status 반환 | Exact responsibility | 없음 | keep | `status()` |
| `CollaborationBundle` | Epoch/change exchange artifact | Near | Full/incremental 불명확 | keep | `CollaborationBundle` |
| `SuppressedChange` | Known inactive contribution | Exact local | Rejection과 구분 필요 | keep | `SuppressedChange` |
| `materializeChanges` | DAG에서 current document 파생 | Exact de-facto | 없음 | keep | `materializeChanges` |
| `didChangeDocument` | Visible document change outcome | Exact predicate | 없음 | keep | `didChangeDocument` |
| `TextDOMAdapter` | DOM observe/render/selection boundary | Exact responsibility | 없음 | keep | `TextDOMAdapter` |
| publication lease | Native input 중 DOM rendering 유예 | Local | Sync lock으로 오해 | rename prose | native-input DOM lease |
| framework binding | 외부 framework와의 package integration | Near | Host glue와 공식 지원을 구분하지 못함 | classify | Connector package |
| `Connector` | 외부 생태계와 public contract를 번역하는 공식 package category | Exact local | 외부 표준명은 아니지만 Adapter 의미 중복을 피함 | admit | Connector |

## Protocol vocabulary boundary

Wire fields와 error code인 `acceptance`, `acceptance_required`,
`acceptance_reentrancy`, `deps`, `ops`는 versioned protocol 영역이므로
TypeScript identifier 문법과 별도로 유지한다. Public TypeScript API와 내부
identifier에는 canonical vocabulary만 사용한다.

## Current public surface decisions

아래 표는 현재 public export를 canonical vocabulary로 분류한다.

### Core root

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `JSONValue`, `Pointer`, `JSONPatchOperation`, `JSONAppliedChange`, `JSONPatchResult`, `JSONDocument`, `JSONDocumentOptions`, `JSONDocumentCommitOptions`, `JSONDocumentCommitResult`, `JSONPatchValidationResult`, `ReadResult`, `QueryResult` | Standard JSON 또는 책임 suffix와 일치 |
| keep | `createJSONDocument`, `applyPatch`, `parsePointer`, `tryParsePointer`, `buildPointer`, `parentPointer`, `appendSegment`, `trackPointer` | Function verb grammar와 일치 |
| merge | `JSONChangeMetadata` | Applied change의 metadata이며 별도 domain concept를 만들지 않음 |

### Editing package

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `EditingPlan`, `EditingResult`, `EditingSession`, `EditingSnapshot`, `createEditingSession` | 공통 editing lifecycle과 Plan/Result/Session/Snapshot suffix가 일치 |
| keep | `EditingIntent`, `EditingDispatch` | 편집 층 제품 문장의 공통 껍질과 `dispatch` 문 |
| keep | `BlockDocument`, `DocumentBlock`, `DocumentClipboard`, `DocumentEditor`, `DocumentIntent`, `DocumentPoint`, `DocumentRange`, `DocumentSelection`, `createDocumentEditor` | Document domain과 selection topology 책임이 일치 |
| keep | `SheetCell`, `SheetClipboard`, `SheetColumn`, `SheetDocument`, `SheetEditor`, `SheetIntent`, `SheetPoint`, `SheetRange`, `SheetRow`, `SheetSelection`, `createSheetEditor` | Sheet domain, stable identity와 rectangular range-set selection 책임이 일치 |
| keep | `SheetTopology` | Host가 제공한 visible row/column order를 Sheet 편집 의미로 해석하는 책임이 일치 |
| keep | `LineTopology`, `GridTopology` | Selection이 기대는 화면 순서. 한 축과 두 축 |
| keep | `OrderClipboard`, `OrderEditor`, `OrderIntent`, `OrderSelection`, `createOrderEditor` | Order domain과 line-range clipboard 책임이 일치 |
| keep | `ObjectClipboard`, `ObjectEditor`, `ObjectIntent`, `ObjectSelection`, `createObjectEditor` | Object domain과 key-set clipboard 책임이 일치 |
| keep | `TreeClipboard`, `TreeEditor`, `TreeIntent`, `TreeSelection`, `TreeTopology`, `createTreeEditor` | Tree domain, visible-line selection과 subtree clipboard 책임이 일치 |
| keep | `DatabaseClipboard`, `DatabaseEditor`, `DatabaseIntent`, `DatabaseSelection`, `DatabaseTopology`, `createDatabaseEditor` | Database domain, saved-view grid와 rectangular clipboard 책임이 일치 |

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

### History subpath

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `History`, `HistoryStatus`, `HistoryResult`, `HistoryRuntime`, `HistoryRestoreResult`, `createHistoryRuntime`, `restoreHistoryRuntime` | Subpath namespace와 책임 suffix가 일치 |

### Text subpath

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `Text`, `TextSelection`, `TextObservation`, `TextCapture`, `TextCaptureResult`, `TextPlan`, `TextPlanResult`, `TextCommitResult`, `TextRuntime`, `TextRestoreResult`, `createTextRuntime`, `restoreTextRuntime` | Subpath namespace와 capture/plan/commit 책임이 일치 |

### Contenteditable package

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `ContentEditableAdapter`, `ContentEditableOptions`, `ContentEditableResult`, `createContentEditableAdapter`, `TextDOMAdapter`, `DOMObservation`, `plainTextDOMAdapter` | Package namespace와 DOM Adapter 책임이 일치 |

### React Connector package

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `useReactConnector`, `useJSONDocumentValue`, `useEditingSnapshot`, `useDocumentEditor`, `EditingSnapshotSource` | 공식 React Connector 진입점과 document/editor snapshot 구독 |

### React Hook Form Connector package

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `useReactHookFormConnector`, `useJSONDocumentForm`, `UseJSONDocumentFormOptions`, `JSONDocumentFormBinding`, `CanonicalFormFailure` | 공식 React Hook Form Connector 진입점과 하위 session binding |

### Zod Connector package

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `createZodValidator`, `ZodValidatorOptions` | Zod native schema를 JSON Document validation callback으로 연결하는 책임이 일치 |
| keep | `databaseDocumentFromZod`, `DatabaseDocumentFromZod`, `DatabaseDocumentFromZodResult` | Zod object schema와 레코드 배열을 public Database document로 번역하는 책임이 일치. `createXxxConnector`가 아니다 |

### Ajv Connector package

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `createAjvValidator`, `AjvValidatorOptions` | Ajv native compiled validator를 JSON Document validation callback으로 연결하는 책임이 일치 |

### TanStack Table Connector package

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `createTanStackTableConnector`, `createTableDocumentBinding`, `TableDocumentBinding`, `TableDocumentOptions` | 공식 TanStack Table Connector 진입점과 하위 Sheet binding |

### Web Platform Connector package

| Decision | Current public exports | Canonical rule |
| --- | --- | --- |
| keep | `createWebClipboardBinding`, `WebClipboardBinding`, `WebClipboardCodec`, `WebClipboardData`, `WebClipboardEvent`, `WebClipboardPayload`, `WebClipboardResult`, `documentClipboardCodec`, `sheetClipboardCodec`, `orderClipboardCodec`, `objectClipboardCodec`, `treeClipboardCodec`, `databaseClipboardCodec` | Web clipboard native contract와 public domain clipboard 번역 책임이 일치 |
| keep | `selectionOperationFromModifiers`, `WebModifierState` | Web modifier state를 semantic selection operation으로 번역하는 책임이 일치 |
| keep | `textInputFromControl`, `WebTextControl`, `WebTextControlEvent`, `WebTextInput` | Native text control을 관찰하되 selection ownership을 취하지 않는 책임이 일치 |

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

Editing package
├─ EditingPlan
├─ EditingResult
├─ EditingSession
├─ EditingSnapshot
├─ EditingIntent
├─ EditingDispatch
├─ DocumentEditor
├─ DocumentSelection
├─ DocumentClipboard
├─ OrderEditor
├─ OrderSelection
├─ OrderClipboard
├─ SheetEditor
├─ SheetSelection
├─ SheetTopology
├─ SheetClipboard
├─ ObjectEditor
├─ ObjectSelection
├─ ObjectClipboard
├─ TreeEditor
├─ TreeSelection
├─ TreeTopology
├─ TreeClipboard
├─ DatabaseEditor
├─ DatabaseSelection
├─ DatabaseTopology
├─ DatabaseClipboard
├─ LineTopology
└─ GridTopology

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

Connector packages
├─ React
│  ├─ EditingSnapshotSource
│  ├─ useReactConnector
│  ├─ useJSONDocumentValue
│  ├─ useEditingSnapshot
│  └─ useDocumentEditor
├─ React Hook Form
│  ├─ CanonicalFormFailure
│  ├─ UseJSONDocumentFormOptions
│  ├─ JSONDocumentFormBinding
│  ├─ useJSONDocumentForm
│  └─ useReactHookFormConnector
├─ Zod
│  ├─ ZodValidatorOptions
│  ├─ createZodValidator
│  ├─ DatabaseDocumentFromZod
│  ├─ DatabaseDocumentFromZodResult
│  └─ databaseDocumentFromZod
├─ Ajv
│  ├─ AjvValidatorOptions
│  └─ createAjvValidator
├─ TanStack Table
│  ├─ TableDocumentBinding
│  ├─ TableDocumentOptions
│  ├─ createTableDocumentBinding
│  └─ createTanStackTableConnector
└─ Web Platform
   ├─ WebClipboardBinding
   ├─ WebClipboardCodec
   ├─ createWebClipboardBinding
   ├─ documentClipboardCodec
   ├─ sheetClipboardCodec
   ├─ orderClipboardCodec
   ├─ objectClipboardCodec
   ├─ treeClipboardCodec
   ├─ databaseClipboardCodec
   ├─ selectionOperationFromModifiers
   └─ textInputFromControl
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
   reduction과 public/wire 영향을 기록한다.
2. Canonical prose 변경과 code identifier 변경을 분리한다.
3. Public identifier나 wire field 변경은 별도 versioned evolution으로 승인받는다.
4. Overview, API, versioned profile, collaboration/history/text,
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
   Adapter는 외부 platform/model boundary다.
10. `Control`, `Manager`, `Helper`, `Util`, `Common`, `Misc`, vague `Data`,
    vague `Info`를 새 public 이름에 쓰지 않는다.
11. Public boolean은 `is`, `has`, `can`, `should`, `did`로 읽히게 한다.
12. 새 public field를 불필요하게 축약하지 않는다.
13. 같은 validation 책임에는 하나의 동사를 사용한다.
14. Public canonical concept는 JSON Document이며 Projection은 public 또는
    internal identifier로 사용하지 않는다.
15. 이름 변경은 runtime logic, protocol semantics 또는 wire behavior 변경을
    승인하지 않는다.
16. Connector는 외부 생태계 integration package의 분류이며 공통 runtime
    interface가 아니다.
