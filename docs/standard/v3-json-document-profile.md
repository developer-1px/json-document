# json-document v3 JSON Document Profile

상태: Stable candidate (`3.0.0`). TypeScript root binding, reference implementation,
독립 test implementation, 다섯 pressure vertical이 stable gate를 통과했다.

이 profile은 JSON Document, stateless JSON Patch, validation과 change
notification이라는 canonical vocabulary만 사용한다. Repository 전체의 concept와
naming grammar는
[Concept and Naming Standard](concept-and-naming-standard.md)가 정의한다.

이 profile은 문서, 표, 슬라이드, 캔버스, 노트 편집기가 공통으로 의존할
수 있는 최소 JSON 편집 계약을 정의한다. 구현체는 더 많은 기능을 제공할 수
있지만 portable consumer는 이 계약만으로 동작할 수 있어야 한다.

## 계약의 층위

정본의 우선순위는 외부 표준, 이 profile과 기계 판독 manifest, black-box
conformance vector, 언어별 binding, reference implementation 순서다.
reference implementation의 현재 동작은 상위 계약을 덮어쓸 수 없다.

stateless JSON Patch은 JSON value, JSON Pointer, JSONPath, JSON Patch와 result의
의미만 정의한다. JSON Document은 그 protocol을 현재 문서에 연결하는 stateful
port다. Selection, history, clipboard, DOM과 framework lifecycle은 Host
adapter가 JSON Document과 조합한다.

```txt
stateless JSON Patch -> JSON Document -> host adapter
```

## Canonical 여섯-member JSON Document

아래 TypeScript는 root package가 공개하는 application-owned 구조 계약이다.

```ts
interface JSONDocument {
  readonly value: JSONValue;

  at(pointer: Pointer): ReadResult;
  query(jsonPath: string): QueryResult;
  validatePatch(
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONPatchValidationResult;
  commit(
    operations: ReadonlyArray<JSONPatchOperation>,
    options?: JSONDocumentCommitOptions,
  ): JSONDocumentCommitResult;
  subscribe(listener: (change: JSONAppliedChange) => void): () => void;
}
```

`at`은 정확한 주소 한 곳을 읽고, `query`는 여러 주소를 찾는다.
`validatePatch`는 같은 mutation을 실행하지 않고 검증하며, `commit`만 core
state를 바꾼다.
`subscribe`는 이미 전달된 변경만 전달한다.

아직 result를 돌려줄 document가 없는 construction 단계에서 initial value가
JSON이 아니거나 validation에 거부되면 TypeScript reference binding은
`TypeError`를 throw한다. 생성 이후 validation callback의 예외는
`schema_violation` failure로 바꾸며 state와 change notification을 만들지 않는다.

## 규범 요구사항

`MUST`, `MUST NOT`, `SHOULD`, `MAY`는 RFC 2119의 의미로 사용한다.

| ID | 요구사항 |
| --- | --- |
| JD3-GOV-001 | 구현체와 binding은 외부 표준, versioned normative profile, machine-readable conformance vector의 의미를 MUST 준수해야 한다. reference implementation의 우연한 동작은 이 계약을 변경할 수 없다. |
| JD3-DATA-001 | document state, patch payload, protocol metadata는 RFC 8259 JSON data여야 하며 `undefined`, function, symbol, cyclic reference 같은 host value를 MUST NOT 포함해야 한다. |
| JD3-DATA-002 | 공개 snapshot과 입력 reference는 격리되어야 한다. consumer가 이전 `value`, initial value, patch payload를 변경해 committed state를 바꿀 수 있어서는 안 된다. 같은 revision의 object identity 재사용은 MAY 허용하지만 계약은 아니다. |
| JD3-DOCUMENT-001 | 호환 JSON Document은 `value`, `at`, `query`, `validatePatch`, `commit`, `subscribe`를 정확한 필수 member로 제공해야 한다. 추가 member는 MAY 제공하지만 여섯 member의 의미를 바꾸거나 portable consumer의 전제가 되어서는 안 된다. |
| JD3-ADDRESS-001 | 정확한 주소와 mutation target은 RFC 6901 JSON Pointer여야 한다. JSONPath를 mutation target으로 받아들이면 안 되며 query 결과는 Pointer로 정규화해야 한다. |
| JD3-QUERY-001 | `query`는 RFC 9535 JSONPath를 받아 document를 바꾸지 않고 deterministic한 Pointer 배열 또는 stable error code를 포함한 실패 result를 반환해야 한다. |
| JD3-PATCH-001 | mutation은 RFC 6902 operation의 ordered batch여야 한다. 순수 patch 적용과 `commit`은 전체 batch를 순서대로 적용하거나 아무것도 적용하지 않아야 하며 성공 시 실제 적용된 canonical operation 순서를 보존해야 한다. |
| JD3-PATCH-002 | Pure Patch 연산은 schema provider, UI framework, mutable session 없이 실행 가능해야 한다. validation, history, selection과 change notification은 이 순수 연산과 조합하되 그 의미를 바꾸면 안 된다. |
| JD3-VALIDATION-001 | `validatePatch`는 state와 subscriber를 바꾸지 않고 `commit`과 같은 JSON, Pointer, Patch, validation 의미를 사용해야 한다. state와 validation rule이 사이에 변하지 않았다면 성공한 probe와 같은 입력의 commit이 같은 검증 원인으로 실패하면 안 된다. |
| JD3-COMMIT-001 | `commit`은 JSON Document의 유일한 stateful mutation primitive여야 하고 local operation을 동기적·원자적으로 notify해야 한다. expected input failure는 throw나 rejected Promise가 아니라 result이며 partial state나 partial applied patch를 노출하면 안 된다. |
| JD3-COMMIT-002 | 성공한 `commit`은 `JSONAppliedChange`를 담은 `JSONDocumentCommitResult`를 반환해야 한다. 그 change는 실제 적용된 canonical operation과 JSON-safe metadata만 포함하며 post-commit value는 `value`에서 읽는다. |
| JD3-NOTIFICATION-001 | state-changing commit은 같은 인과 순서의 operation과 metadata를 가진 value-equivalent `JSONAppliedChange`를 subscriber마다 정확히 한 번 전달해야 한다. object identity는 계약이 아니다. 재진입 commit도 모든 subscriber에게 같은 순서로 전달해야 한다. 한 listener의 예외는 다른 listener 전달을 막거나 `commit` 밖으로 전파되거나 성공 result를 바꾸면 안 된다. 실패와 state-equivalent no-op은 notification을 만들면 안 되며 unsubscribe 이후에는 notification을 전달하면 안 된다. |
| JD3-RESULT-001 | public result는 boolean `ok` discriminant를 가져야 하고 실패는 stable string `code`를 가져야 한다. expected read, query, validation, commit failure를 예외로만 표현해서는 안 된다. |
| JD3-RESULT-002 | consumer는 모르는 result field와 error code를 일반적으로 처리할 수 있어야 한다. minor release는 기존 required field나 code의 의미를 바꾸면 안 되지만 optional field와 새 code는 MAY 추가할 수 있으므로 exact `Object.keys` 집합은 계약이 아니다. |
| JD3-SCHEMA-001 | JSON Document이 validation rule을 구성하면 initial state와 commit candidate를 notification 전에 검사해야 한다. 이 boundary는 provider-neutral이어야 하며 `_zod`, provider issue, private schema object를 JSON Document 적합성에 요구하면 안 된다. 제약 없는 validation는 MAY 허용한다. Validation callback은 같은 JSON Document의 `validatePatch`나 `commit`을 재진입해서는 안 되며, binding은 그런 호출을 failure로 차단해 state와 change notification을 보존해야 한다. |
| JD3-SCHEMA-002 | import나 initial parse는 commit 전에 명시적으로 값을 변환할 수 있다. commit-time validation는 candidate를 몰래 변환하면 안 되며 normalization이 필요하면 최종 value를 만드는 operation이 applied change에 명시되어야 한다. |
| JD3-SESSION-001 | insert, replace, delete, move, duplicate, selection, clipboard, history, schema introspection과 그 patch validation는 host 또는 별도 adapter 책임이다. Kernel package의 export나 JSON Document 적합성에 요구하면 안 된다. |
| JD3-HOST-001 | rendering, DOM focus, geometry, keyboard policy, system clipboard, filesystem, network, formula engine, CRDT와 OT는 host 또는 extension이 소유해야 하며 Core JSON Document의 필수 data나 member가 되어서는 안 된다. |
| JD3-CONFORMANCE-001 | conformance는 public factory 또는 injected harness만 사용하는 machine-readable black-box vector로 성공, 실패, atomicity, immutability, probe/commit parity, change notification을 검증해야 한다. private source path, provider object, 특정 dist layout을 요구하면 안 된다. |
| JD3-CONFORMANCE-002 | 이 profile을 stable이라고 선언하려면 같은 suite가 reference implementation과 최소 한 개의 독립 구현을 통과하고 form, table/data-grid, outliner/tree, rich text, storage/collaboration의 다섯 pressure vertical에서 같은 제약이 확인되어야 한다. |
| JD3-BINDING-001 | package export와 TypeScript declaration은 언어별 binding contract이며 보편 protocol과 별도로 versioning해야 한다. v3 package는 root entrypoint와 21개 Kernel symbol만 공개하고 runtime·peer dependency 없이 빌드되어야 한다. public JSON Document declaration은 application-owned structural contract여야 하고 archived session, framework binding, implementation runtime alias나 private declaration path를 노출하면 안 된다. |

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
value의 shape까지 바꿀 수 있으므로 JSON Document snapshot은 거짓 generic을
노출하지 않고 항상 `JSONValue`다. 타입이 보장된 domain model은 validation를
소유하는 host adapter의 책임이다. `JSONChangeMetadata`의 selection과 history
전용 field는 host metadata로 분리하고, core metadata는 JSON object boundary만 정한다. Pure
`applyPatch`는 새 value를 반환하지만 stateful `commit`은
`document.value`가 있으므로 snapshot을 중복 반환하지 않는다. unknown field와
unknown code를 허용하는 forward-compatibility fixture를 포함한다.

## Conformance artifact

black-box suite는 여섯-member JSON Document, pure Patch, Pointer, 외부 RFC
conformance corpus의 public-root binding을 서로 분리한다.

| Artifact | 책임 |
| --- | --- |
| `packages/json-document/tests/conformance/v3/json-document-vectors.json` | provider object가 없는 machine-readable 입력과 기대값 |
| `packages/json-document/tests/conformance/v3/json-document-suite.ts` | 여섯 member만 아는 injected harness runner |
| `packages/json-document/tests/public/v3-json-document-standard-conformance.test.ts` | public root factory reference binding |
| `packages/json-document/tests/conformance/v3/protocol-vectors.json` | schema-free pure Patch 입력과 기대값 |
| `packages/json-document/tests/conformance/v3/protocol-suite.ts` | `applyPatch`만 아는 injected harness runner |
| `packages/json-document/tests/public/v3-protocol-standard-conformance.test.ts` | public root pure Protocol binding |
| `packages/json-document/tests/conformance/v3/pointer-vectors.json` | RFC 6901 조합과 applied Patch 기반 pointer tracking 기대값 |
| `packages/json-document/tests/conformance/v3/pointer-suite.ts` | Pointer helper만 아는 injected harness runner |
| `packages/json-document/tests/public/v3-pointer-standard-conformance.test.ts` | 여섯 public Pointer helper의 root binding |
| `packages/json-document/tests/conformance/v3/rfc6902-suite.ts` | vendored RFC 6902 corpus를 실행하는 provider-neutral runner |
| `packages/json-document/tests/public/v3-rfc6902-standard-conformance.test.ts` | public root `applyPatch`의 전체 RFC 6902 corpus binding |
| `packages/json-document/tests/conformance/v3/jsonpath-suite.ts` | vendored RFC 9535 CTS를 `query`와 `at`으로 검증하는 runner |
| `packages/json-document/tests/public/v3-jsonpath-standard-conformance.test.ts` | public root JSON Document의 전체 RFC 9535 CTS binding |
| `packages/json-document/tests/conformance/v3/foundation-vectors.json` | Core와 collaboration package-local primitive의 array index·equality parity 및 JSON boundary fixture |
| `packages/json-document/tests/conformance/v3/pressure-vectors.json` | form, table/data-grid, outliner/tree, rich text, storage/collaboration 시나리오 |
| `packages/json-document/tests/conformance/v3/pressure-suite.ts` | 여섯 member만으로 다섯 vertical을 실행하는 injected runner |
| `packages/json-document/tests/independent/v3-json-document.ts` | reference runtime을 import하지 않는 독립 6-member test implementation |
| `packages/json-document/tests/independent/v3-json-document-independent-conformance.test.ts` | 독립 구현에 JSON Document과 pressure suite를 함께 주입하는 binding |
| `packages/json-document-collaboration/tests/json-document-conformance.test.ts` | collaboration public root에 같은 두 suite를 주입하는 추가 binding |

suite가 export하는 structural type은 test harness 내부 계약이며 package public
export가 아니다. Vendored RFC 6902 corpus 112건 중 110건을 실행한다. 남은 2건은
원본 JSON에 중복 `op` member가 있지만 JSON module parsing 단계에서 마지막
member만 남아 public operation object로는 그 입력을 표현할 수 없어, 각 fixture에
명시적인 `disabledReason`을 기록한다.

21개 요구사항의 현재 증거 상태는 runtime 15개, static 6개, deferred 0개다.
schema-free `applyPatch`와 validation transform identity는 reference와 독립
구현에서 같은 vector로 검증한다. 같은 JSON Document suite와 pressure suite는
reference와 독립 구현을 모두 통과하며, collaboration public binding도 같은
다섯 vertical을 통과한다. collaboration 구현은 Core protocol을 조합하므로
독립 구현 수에는 포함하지 않는다.

## Durability primitive boundary

Core의 JSON equality는 하나의 equality leaf가 소유한다. canonical array index
`[0]|[1-9][0-9]*`와 JavaScript safe-integer 경계도 하나의 Pointer leaf가
소유하며, RFC 6902 append marker `-`는 write 문맥에서만 별도로 처리한다.
collaboration package는 Core private path를 deep import하지 않고 package-local
두 primitive를 유지하며 `foundation-vectors.json`을 함께 실행해 의미 차이를
드러낸다.

JSON validation, owning clone, trusted clone은 하나의 traversal abstraction으로
합치지 않는다. validation은 오류 위치를 설명하고, owning clone은 검증과
reference 격리를 함께 수행하며, trusted clone은 이미 검증된 값만 받는
precondition을 가진다. validation과 owning clone이 공유해야 하는
array-property 분류만 공통 leaf에 두고, parity test가 untrusted boundary의
동일한 성공·실패와 trusted clone의 소유권 분리를 고정한다.

## Package binding

`@interactive-os/json-document`는 root entrypoint 하나와 21개 symbol을
공개한다. `JSONDocument`의 canonical member는 일곱 개이며, 기존 v3 portable
consumer가 의존하는 여섯 member는 그대로 유지된다.

```txt
values  8
types  13
total  21
```

패키지는 runtime dependency와 peer dependency가 없다. `/session`과 `/react`는
export가 아니며, archived 1.x implementation은 production build와 tarball에
포함하지 않는다. 저장소에 남은 archived source와 regression test는 공개 계약이
아니다. 별도 `JSON Document` public type은 외부 구현에서 같은 structural port가
반복되기 전에는 추가하지 않는다.
