# RFC급 Foundation 게이트

상태: 활성.

이 게이트는 현재 패키지가 릴리스 가능한지를 묻는 것이 아니라, json-document가
편집 도구의 표준 수준 foundation으로 쓰일 수 있는지를 묻는다.

```txt
RFC급 foundation
|-- 규범 표준
|   |-- public semantics가 MUST/SHOULD/MAY로 작성됨
|   |-- 구현 파일 경로를 몰라도 이해 가능함
|   `-- breaking change가 의미론 기준으로 정의됨
|-- conformance
|   |-- 공개 package entrypoint만 import함
|   |-- 성공, 실패, atomicity, JSON boundary를 다룸
|   |-- selection, clipboard, history, schema, capability를 다룸
|   `-- 다른 구현체도 재사용할 수 있음
|-- 상호운용 압력
|   |-- form adapter
|   |-- table/data-grid adapter
|   |-- outliner/tree adapter
|   |-- rich-text/editor bridge
|   `-- storage/collaboration bridge
|-- concept 최소성
|   |-- app command layer를 core에 넣지 않음
|   |-- DOM이나 rendering layer를 core에 넣지 않음
|   |-- remote transport를 core에 넣지 않음
|   `-- adapter gap은 자동 core concept이 아니라 extension 입력으로 다룸
`-- review threshold
    |-- S0 correctness blocker 없음
    |-- S1 foundation-freeze blocker 없음
    `-- 마지막 S1 수정 뒤 from-zero clean review 2회
```

## 현재 산출물

| 게이트 | 산출물 | 상태 |
| --- | --- | --- |
| 규범 표준 | `docs/standard/core-standard.md` | 초안 추가 |
| conformance profile | `docs/standard/conformance-profile.md` | 활성 |
| result/error freeze | `docs/standard/result-contract.md` | 활성 |
| selection freeze | `docs/standard/selection-contract.md` | 활성 |
| schema introspection freeze | `docs/standard/schema-introspection-contract.md` | 활성 |
| extension 위임 표준 | `docs/standard/extension-delegation-standard.md` | 초안 추가 |
| contract pressure register | `docs/standard/contract-pressure-register.md` | 활성 |
| self-improvement loop report | `docs/standard/self-improvement-loop-report.md` | 10회 루프 완료 |
| export lock | `packages/json-document/public-contract.json` | 활성 |
| 의미론 conformance | `packages/json-document/tests/public/standard-conformance.test.ts` | 활성 |
| semantic fixture lock | `packages/json-document/tests/public/semantic-contract.test.ts` | 활성 |
| signature fixture lock | `packages/json-document/tests/public/signature-contract.test-d.ts` | 활성 |
| 표준화 evaluator | `scripts/evaluate-standardization.mjs` | 활성 |
| 릴리스 기계 검증 | `npm run release:check` | 활성 |

## 남은 압력 검증

| adapter 압력 | 필요한 증거 |
| --- | --- |
| form | field read/write, validation, dirty state, selection/focus adapter, undo |
| table/data-grid | row/cell addressing, batch edit, copy/paste, duplicate, undo |
| outliner/tree | hierarchy move, nested insert/remove, multi-select, clipboard |
| rich text/editor bridge | text selection, text patch planning, schema-safe document embedding |
| storage/collaboration | patch stream persistence, metadata, optimistic conflict boundary |

각 압력 spike는 먼저 기존 표준 concept인 document, schema, patch, pointer,
query, selection, clipboard, history, capability로 요구를 표현해 봐야 한다.
새 core concept은 그 표현이 증거와 함께 실패한 뒤에만 허용한다.

반복 압력은 `docs/standard/contract-pressure-register.md`에 먼저 기록한다.
`guard composition`과 `PatchPlan` 같은 후보는 바로 core public API가 아니라
recipe, lab convention, official extension 후보 순서로 검증한다.

## 내부 change 실행 seam

Public document interface와 JSON Patch 의미론은 유지하면서 implementation은
change를 다음 단계로 나눈다.

```txt
prepare(base revision, current state, operations)
|-- operation 검증과 concrete applied patch 계산
|-- private copy-on-write draft 생성
`-- before / next / applied를 prepared change로 고정

publish(prepared change)
|-- base revision과 current revision 일치 확인
|-- state를 한 번 교체
`-- selection / history / subscriber 관찰을 기존 순서로 실행
```

이 seam은 public `PatchPlan`이나 CRDT interface가 아니다. 현재 동기 document는
prepare 직후 publish한다. Internal revision은 오래된 prepared change가 최신 state를
덮지 못하게 하는 local freshness token일 뿐, actor id, Lamport clock, vector clock,
CRDT node identity를 뜻하지 않는다.

Freshness 경계는 state 교체 직전까지다. Schema validation 중 state가 바뀌면 patch는
최신 revision에서 다시 prepare하고, cut/paste/duplicate처럼 payload나 target을 함께
계산하는 action은 patch만 재사용하지 않고 action 전체를 다시 계획한다. 반면 publish
뒤 synchronous subscriber가 다시 mutation하는 순서는 기존 notification 계약이며,
이 revision token이 listener reentrancy나 remote merge policy까지 해결한다고 보지 않는다.

향후 storage/collaboration adapter는 stale prepared change를 그대로 publish하지 않고
자신이 소유한 OT/CRDT/rebase policy로 새 operation을 계산한 뒤 다시 prepare해야 한다.
Remote transport와 conflict policy는 계속 core 밖에 둔다.

성능상 prepare 단계의 private draft는 같은 batch에서 겹치는 ancestor/descendant
replace가 있어도 touched container를 commit당 한 번만 복제한다. 최적화 경로는
순차 RFC 6902 결과, 실패 atomicity, applied order, structural sharing을 reference
경로와 동일하게 유지해야 한다. Plain structural schema의 overlapping replace는 batch를
한 번 적용한 뒤 실제로 남은 final target만 검증한다. 따라서 중간의 invalid value가 뒤의
ancestor/descendant replace로 복구되면 성공할 수 있다. Batch 적용 실패, 지원하지 않는
schema 경로, 기존 진단 순서를 보존해야 하는 형태는 canonical full validation 또는 기존
sequential error-order 경로로 되돌린다.

History inverse 계산도 같은 private sequential-replace COW seam을 재사용한다. 각 write
직전 값을 캡처해 기존 operation별 inverse와 undo 순서를 유지하며, inverse를 상위 path
하나로 압축하거나 public prepared/history 계약을 추가하지 않는다.

Guarded change가 leading RFC 6902 `test` assertion을 붙여도 plain structural schema에서는
assertion을 먼저 평가한 뒤 mutation suffix와 inverse를 같은 fast path에 위임한다. Assertion
실패나 지원하지 않는 suffix는 기존 full validation/error-order 경로가 정본이다.
