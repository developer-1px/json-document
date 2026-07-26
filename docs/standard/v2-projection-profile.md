# json-document v2 Projection Profile

상태: Candidate (`2.0.0-rc.0`). TypeScript root binding과 reference
implementation은 구현됐지만 stable gate는 아직 통과하지 않았다.

이 profile은 문서, 표, 슬라이드, 캔버스, 노트 편집기가 공통으로 의존할
수 있는 최소 JSON 편집 계약을 정의한다. 구현체는 더 많은 기능을 제공할 수
있지만 portable consumer는 이 계약만으로 동작할 수 있어야 한다.

## 계약의 층위

정본의 우선순위는 외부 표준, 이 profile과 기계 판독 manifest, black-box
conformance vector, 언어별 binding, reference implementation 순서다.
reference implementation의 현재 동작은 상위 계약을 덮어쓸 수 없다.

Pure Protocol은 JSON value, JSON Pointer, JSONPath, JSON Patch와 result의
의미만 정의한다. Projection은 그 protocol을 현재 문서에 연결하는 stateful
port다. Host adapter는 Projection과 조합한다. Candidate Editing Session은
같은 protocol을 쓰는 별도 선택 표면이며 Projection 대입 가능성을 아직 약속하지
않는다.

```txt
Pure Protocol
  |-> Projection -> host adapter
  `-> Candidate Editing Session -> React / rich host adapter
```

## 여섯 member

아래 TypeScript는 root package가 공개하는 application-owned 구조 계약이다.

```ts
interface Projection {
  readonly value: JSONValue;

  at(pointer: Pointer): ReadResult;
  query(jsonPath: string): QueryResult;
  canPatch(
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONCapabilityResult;
  commit(
    operations: ReadonlyArray<JSONPatchOperation>,
    options?: JSONDocumentCommitOptions,
  ): JSONDocumentCommitResult;
  subscribe(listener: (change: JSONAppliedChange) => void): () => void;
}
```

`at`은 정확한 주소 한 곳을 읽고, `query`는 여러 주소를 찾는다. `canPatch`는
같은 mutation을 실행하지 않고 검증하며, `commit`만 core state를 바꾼다.
`subscribe`는 이미 publish된 변경만 전달한다.

아직 result를 돌려줄 document가 없는 construction 단계에서 initial value가
JSON이 아니거나 acceptance에 거부되면 TypeScript reference binding은
`TypeError`를 throw한다. 생성 이후 acceptance callback의 예외는
`schema_violation` failure로 바꾸며 state와 publication을 만들지 않는다.

## 규범 요구사항

`MUST`, `MUST NOT`, `SHOULD`, `MAY`는 RFC 2119의 의미로 사용한다.

| ID | 요구사항 |
| --- | --- |
| JD2-GOV-001 | 구현체와 binding은 외부 표준, versioned normative profile, machine-readable conformance vector의 의미를 MUST 준수해야 한다. reference implementation의 우연한 동작은 이 계약을 변경할 수 없다. |
| JD2-DATA-001 | document state, patch payload, protocol metadata는 RFC 8259 JSON data여야 하며 `undefined`, function, symbol, cyclic reference 같은 host value를 MUST NOT 포함해야 한다. |
| JD2-DATA-002 | 공개 snapshot과 입력 reference는 격리되어야 한다. consumer가 이전 `value`, initial value, patch payload를 변경해 committed state를 바꿀 수 있어서는 안 된다. 같은 revision의 object identity 재사용은 MAY 허용하지만 계약은 아니다. |
| JD2-PROJECTION-001 | 호환 Projection은 `value`, `at`, `query`, `canPatch`, `commit`, `subscribe`를 정확한 필수 member로 제공해야 한다. 추가 member는 MAY 제공하지만 여섯 member의 의미를 바꾸거나 portable consumer의 전제가 되어서는 안 된다. |
| JD2-ADDRESS-001 | 정확한 주소와 mutation target은 RFC 6901 JSON Pointer여야 한다. JSONPath를 mutation target으로 받아들이면 안 되며 query 결과는 Pointer로 정규화해야 한다. |
| JD2-QUERY-001 | `query`는 RFC 9535 JSONPath를 받아 document를 바꾸지 않고 deterministic한 Pointer 배열 또는 stable error code를 포함한 실패 result를 반환해야 한다. |
| JD2-PATCH-001 | mutation은 RFC 6902 operation의 ordered batch여야 한다. 순수 patch 적용과 `commit`은 전체 batch를 순서대로 적용하거나 아무것도 적용하지 않아야 하며 성공 시 실제 적용된 canonical operation 순서를 보존해야 한다. |
| JD2-PATCH-002 | Pure Patch 연산은 schema provider, UI framework, mutable session 없이 실행 가능해야 한다. schema acceptance, history, selection과 publication은 이 순수 연산과 조합하되 그 의미를 바꾸면 안 된다. |
| JD2-CAPABILITY-001 | `canPatch`는 state와 subscriber를 바꾸지 않고 `commit`과 같은 JSON, Pointer, Patch, schema acceptance 의미를 사용해야 한다. state와 acceptance rule이 사이에 변하지 않았다면 성공한 probe와 같은 입력의 commit이 같은 검증 원인으로 실패하면 안 된다. |
| JD2-COMMIT-001 | `commit`은 Projection의 유일한 stateful mutation primitive여야 하고 local operation을 동기적·원자적으로 publish해야 한다. expected input failure는 throw나 rejected Promise가 아니라 result이며 partial state나 partial applied patch를 노출하면 안 된다. |
| JD2-COMMIT-002 | 성공한 `commit`은 `JSONAppliedChange`를 담은 `JSONDocumentCommitResult`를 반환해야 한다. 그 change는 실제 적용된 canonical operation과 JSON-safe metadata만 포함하며 post-commit value는 `value`에서 읽는다. |
| JD2-PUBLISH-001 | state-changing commit은 같은 인과 순서의 operation과 metadata를 가진 value-equivalent `JSONAppliedChange`를 subscriber마다 정확히 한 번 전달해야 한다. object identity는 계약이 아니다. 재진입 commit도 모든 subscriber에게 같은 순서로 전달해야 하며 한 listener의 예외가 다른 listener 전달을 막으면 안 된다. 실패와 state-equivalent no-op은 notification을 만들면 안 되며 unsubscribe 이후에는 notification을 전달하면 안 된다. |
| JD2-RESULT-001 | public result는 boolean `ok` discriminant를 가져야 하고 실패는 stable string `code`를 가져야 한다. expected read, query, capability, commit failure를 예외로만 표현해서는 안 된다. |
| JD2-RESULT-002 | consumer는 모르는 result field와 error code를 일반적으로 처리할 수 있어야 한다. minor release는 기존 required field나 code의 의미를 바꾸면 안 되지만 optional field와 새 code는 MAY 추가할 수 있으므로 exact `Object.keys` 집합은 계약이 아니다. |
| JD2-SCHEMA-001 | Projection이 acceptance rule을 구성하면 initial state와 commit candidate를 publish 전에 검사해야 한다. 이 boundary는 provider-neutral이어야 하며 `_zod`, provider issue, private schema object를 Projection 적합성에 요구하면 안 된다. 제약 없는 acceptance는 MAY 허용한다. Acceptance callback은 같은 Projection의 `canPatch`나 `commit`을 재진입해서는 안 되며, binding은 그런 호출을 failure로 차단해 state와 publication을 보존해야 한다. |
| JD2-SCHEMA-002 | import나 initial parse는 commit 전에 명시적으로 값을 변환할 수 있다. commit-time acceptance는 candidate를 몰래 변환하면 안 되며 normalization이 필요하면 최종 value를 만드는 operation이 applied change에 명시되어야 한다. |
| JD2-SESSION-001 | insert, replace, delete, move, duplicate, selection, clipboard, history, schema introspection과 그 capability probe는 optional Editing Session profile이다. 이름을 유지할 수 있지만 Projection 적합성에는 요구하면 안 된다. |
| JD2-HOST-001 | rendering, DOM focus, geometry, keyboard policy, system clipboard, filesystem, network, formula engine, CRDT와 OT는 host 또는 extension이 소유해야 하며 Core Projection의 필수 data나 member가 되어서는 안 된다. |
| JD2-CONFORMANCE-001 | conformance는 public factory 또는 injected harness만 사용하는 machine-readable black-box vector로 성공, 실패, atomicity, immutability, probe/commit parity, publication을 검증해야 한다. private source path, provider object, 특정 dist layout을 요구하면 안 된다. |
| JD2-CONFORMANCE-002 | 이 profile을 stable이라고 선언하려면 같은 suite가 reference implementation과 최소 한 개의 독립 구현을 통과하고 form, table/data-grid, outliner/tree, rich text, storage/collaboration의 다섯 pressure vertical에서 같은 제약이 확인되어야 한다. |
| JD2-BINDING-001 | package export, TypeScript overload, React hook은 언어별 binding contract이며 보편 protocol과 별도로 versioning해야 한다. public Projection declaration은 application-owned structural contract여야 하고 implementation runtime alias나 private declaration path를 노출하면 안 된다. |

## Result 초안

중복 snapshot을 mutation result마다 싣지 않고 commit result와 subscriber가 같은
change payload를 공유한다.

```ts
type JSONValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JSONValue>
  | { readonly [key: string]: JSONValue };

type JSONChangeMetadata = Readonly<Record<string, JSONValue>>;

interface JSONDocumentCommitOptions {
  readonly metadata?: JSONChangeMetadata;
}

interface JSONAppliedChange {
  readonly applied: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: JSONChangeMetadata;
}

type JSONPatchResult =
  | {
      readonly ok: true;
      readonly value: JSONValue;
      readonly change: JSONAppliedChange;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
      readonly pointer?: Pointer;
    };

type JSONDocumentCommitResult =
  | { readonly ok: true; readonly change: JSONAppliedChange }
  | Extract<JSONPatchResult, { readonly ok: false }>;

declare function applyPatch(
  value: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
): JSONPatchResult;
```

TypeScript binding은 non-JSON input도 expected failure result로 돌려주기 위해
`createJSONDocument`와 `applyPatch`의 입력을 `unknown`으로
받으며 runtime에서 RFC 8259 boundary를 검사한다. 임의 JSON Patch는 root
value의 shape까지 바꿀 수 있으므로 Projection snapshot은 거짓 generic을
노출하지 않고 항상 `JSONValue`다. 타입이 보장된 domain model은 acceptance를
소유하는 Editing Session의 책임이다. `JSONChangeMetadata`의 selection과 history 전용 field는 Session
metadata로 분리하고, core metadata는 JSON object boundary만 정한다. Pure
`applyPatch`는 새 value를 반환하지만 stateful `commit`은
`document.value`가 있으므로 snapshot을 중복 반환하지 않는다. unknown field와
unknown code를 허용하는 forward-compatibility fixture를 포함한다.

## Conformance artifact

black-box suite는 Protocol과 Projection을 각각 세 책임으로 나눈다.

| Artifact | 책임 |
| --- | --- |
| `packages/json-document/tests/conformance/v2/projection-vectors.json` | provider object가 없는 machine-readable 입력과 기대값 |
| `packages/json-document/tests/conformance/v2/projection-suite.ts` | 여섯 member만 아는 injected harness runner |
| `packages/json-document/tests/public/v2-projection-standard-conformance.test.ts` | public root factory reference binding |
| `packages/json-document/tests/conformance/v2/protocol-vectors.json` | schema-free pure Patch 입력과 기대값 |
| `packages/json-document/tests/conformance/v2/protocol-suite.ts` | `applyPatch`만 아는 injected harness runner |
| `packages/json-document/tests/public/v2-protocol-standard-conformance.test.ts` | public root pure Protocol binding |

suite가 export하는 structural type은 test harness 내부 계약이며 package public
export가 아니다.

21개 요구사항의 현재 증거 상태는 runtime 13개, static 6개, deferred 2개다.
schema-free `applyPatch`는 구현됐다. transform identity의 two-provider 검증,
독립 구현과 다섯 pressure vertical 통과는 아직 deferred이므로 Candidate를
stable이라고 선언할 수 없다.

## 공개 심볼 disposition

아래 disposition은 1.x surface를 보존한 `/session` baseline의 migration
기록이다. `Kernel`은 v2 root 정본에 남긴 이름, `Session`은 optional profile,
`Compat`은 migration 이름, `Remove`는 root 정본에서 제거한 이름이다.
`Remove`는 기능 삭제를 뜻하지
않으며 adapter, extension, provider package 또는 internal helper로 이동할 수
있다. 이 disposition은 이름의 행선지이며 1.x signature 보존 여부가 아니다.
`Kernel` 이름도 v2 의미에 맞추는 major-version signature 변경은 허용한다.

| Disposition | 현재 심볼 | 판단 |
| --- | ---: | --- |
| Kernel | 16 | protocol primitive와 여섯-member reference binding |
| Session | 20 | 검증된 편집 동사, controller, React와 sibling-range helper |
| Compat | 14 | 중복 이름, legacy alias, provider가 샌 schema boundary |
| Remove | 89 | 파생 alias, component result, 고급 selection, schema introspection, TextSurface |

139개 이름의 유일한 분류와 replacement는
[`v2-public-surface.json`](./v2-public-surface.json)이 정본이다.

도입 이름은 `JSONValue`, `JSONAppliedChange`, `JSONPatchResult`,
`JSONDocumentCommitResult`, `JSONDocumentPlacementTarget`,
`SelectionSnapshot` 여섯 개다. 앞의 네 Kernel 이름은 root에 구현됐고, 뒤의
두 Session 이름은 Session 안정화 전까지 미구현으로 남는다. 별도 `Projection`
public type은 외부 구현에서 같은 structural port가 반복되기 전에는 추가하지
않는다.

## family별 이동

| Family | 왜 생겼나 | v2 위치 |
| --- | --- | --- |
| JSON, Pointer, Patch, query, result | 주소·변경 의미의 구현 간 일치 | Kernel |
| derived Pointer helper와 exception | escaping, parent/index 계산의 실수 방지 | canonical Pointer 조합으로 대체하거나 Compat |
| familiar edit verb와 `can*` | 제품 코드가 patch plan을 반복하지 않게 함 | optional Editing Session |
| selection·clipboard·history controller | 30년간 수렴한 사용자 편집 상태와 동사 | optional Editing Session |
| component Ok/Error와 option alias | union narrowing과 method parameter 재사용 | canonical Result에서 `Extract`하거나 parameter에 inline |
| `entries`와 entry alias | outline·schema form의 traversal 편의 | `at` 위의 consumer traversal |
| schema acceptance | 잘못된 document publication 방지 | provider-neutral Projection construction boundary |
| schema introspection | schema-driven form과 insertion UI 생성 | provider adapter 또는 extension |
| advanced selection ordering·span·text edit | caret 이동, 범위 정렬, 문자열 편집 알고리즘 공유 | selection helper package |
| sibling-range 세부 alias | 여러 선택을 공통 parent/index run으로 정규화 | helper와 최종 Result만 Session에 유지하고 세부 type은 파생 |
| TextSurface | contenteditable 문자열과 atom/range sidecar 동기화 | rich-text adapter |
| React hook | component lifecycle과 document 연결 | React binding |
| trusted-state fast path | 검증·clone 생략 성능 최적화 | internal optimization |
| DOM·geometry·formula·persistence·collaboration | host와 제품마다 다른 실행 환경 | host 또는 extension |

## 1.x migration

| 1.x | v2 방향 |
| --- | --- |
| 39-member `JSONDocument` type | 여섯 member만 필수인 structural contract |
| `subscribe(applied, metadata)` | `subscribe(change)` |
| flat `JSONChangeMetadata` | JSON object boundary; selection/history key는 Session 소유 |
| `JSONDocumentCommitOptions.selectionAfter` | core metadata와 Session final-selection option 분리 |
| `JSONPatchOperation.value: unknown` | `JSONValue` |
| `patch` | `commit` wrapper로 한 migration window 유지 |
| `lastPatch` | commit result의 `change` 또는 subscribed change |
| `find`, `canFind`, `canQuery` | `query` result |
| `applyOperation` | one-element batch를 받는 `applyPatch` |
| `applyPatch(schema, value, operations)` | `applyPatch(value, operations)` 뒤 Session acceptance와 조합 |
| `JSONPatchInput` | `ReadonlyArray<JSONPatchOperation>` |
| `JSONResult` | context에 따라 `JSONPatchResult` 또는 `JSONDocumentCommitResult` |
| insert/move target alias | `JSONDocumentPlacementTarget` |
| exact result key fixture | required field + unknown-field 허용 fixture |
| Zod-shaped schema boundary | provider-neutral acceptance adapter |

v2 major 변경은 여섯 member black-box suite와 pure Protocol suite를 먼저
고정한 뒤 root를 20개 Kernel symbol로 교체했다. 풍부한 1.x runtime은
`/session` 변경 경계로 이동해 기능을 보존하되 portable Core 계약과 분리했다.
