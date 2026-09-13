# EditingSession 공통 계약

상태: Canonical. ES 규칙은 공통 의미의 기준이고, 아래 binding 정책은 현재
TypeScript API와 local History의 구체적인 호환성 기준이다. 두 범위를 구별한다. Editing package 전체의 Stable
release, 모든 Hands의 admission 또는 독립 Editing 구현 간 상호운용 인증은 아니다.

## 적용 범위와 정본

이 문서는 `@interactive-os/json-document-editing`의 `createEditingSession`,
`EditingSnapshot`, `EditingResult`, `EditingHistory`가 조합될 때 유지할 의미를
소유한다. 아래 **해야 한다 / 안 된다**는 이 계약의 필수 조건이다.

- 문서 값·주소·검증·commit·알림은 [JSONDocument v3](json-document-v3/profile.md)가
  소유한다. 여섯 member의 의미를 그대로 소비하며 객체 reference 동일성을 요구하지 않는다.
- 선택 family의 전이는 [Selection](../packages/json-document-selection/README.md),
  도메인의 유효한 연산과 다음 선택은 각 editor가 소유한다.
- 입력·IME·DOM lease는 [DOM lifecycle](dom-editing-lifecycle.md), 책임의 배치는
  [Implementation Shape](repository-implementation-shape.md)가 소유한다.
- Hands별 대상·Copy/Paste·지원 기능·기본 입력 정책은
  [편집 문법 설계](editing-grammar.md)의 별도 결정이다.

```text
Domain editor -- patch + selectionAfter --> EditingSession
                                               |
                                               +--> JSONDocument.commit
                                               +--> History owner
                                               `--> EditingSnapshot 관찰

Selection ------ 선택 표현과 전이
Adapter -------- 플랫폼 입력과 DOM 수명
Connector ------ 외부 시스템과 public contract 연결
Host ----------- 제품 정책 값과 정본 모듈 조립
```

이는 책임 지도다. 모든 소비자가 Editing을 거치거나 Adapter와 Connector를
순서대로 설치해야 한다는 뜻이 아니다. Collaboration은 같은 JSONDocument의
대체 구현이며 Editing의 하위 계층이 아니다. 도메인 연산과 플랫폼 해석을 Host에
재구현하지 않는다. 이 경계는 파일 배치나 export 개수를 고정하지 않는다.

## 공통 의미의 불변 조건

다음 규칙의 실패 불변성은 **진행 중인 외부 동기화를 끝낸 뒤 해당 요청이
시작하는 상태**를 기준으로 한다. 이미 완료된 외부 commit을 거절된 요청의
변경으로 취급하거나 되돌리지 않는다. Consumer는 유효한 JSON selection과 plan,
동일 문서에 속한 History, 부수 효과 없는 mapping/reconciliation을 제공해야 한다.

| ID | 유지할 의미 |
| --- | --- |
| ES-VALUE | 동일한 JSON 값의 새 snapshot reference만으로 문서 변경을 추론하면 안 된다. 실제 변경 통지나 History 상태 변경은 최종 JSON 값이 같더라도 별도 사실로 다뤄야 한다. |
| ES-SNAPSHOT | 공개한 snapshot의 value·selection·revision·History 상태는 해당 전이에 속한 일관된 값이어야 한다. 보관한 snapshot이나 입력 selection의 변경으로 현재 상태와 History가 오염되면 안 된다. 내부 clone/freeze 방식은 고정하지 않는다. |
| ES-SELECT | 세션의 일시적 selection만 바꾸는 요청은 문서 값을 바꾸거나 local undo 항목을 만들거나 redo를 지우면 안 된다. 도메인이 문서 내용으로 저장하는 선택 mask 등에는 이 규칙을 일반화하지 않는다. |
| ES-APPLY | plan의 patch는 JSONDocument의 원자적 commit을 사용해야 한다. 예상 가능한 plan/commit 거절은 `ok: false`와 string `code`로 반환하고, 해당 요청의 문서·selection·History 전이나 성공 알림을 만들면 안 된다. |
| ES-OBSERVE | 세션이 확정한 revision은 활성 구독자에게 순서대로 전달해야 한다. 다른 구독자의 선행 snapshot 읽기가 알림을 소모하면 안 된다. 구독자 예외는 완료한 편집의 성공이나 다른 구독자의 전달을 바꾸면 안 된다. 재진입 후에도 반환 result는 자기 전이의 snapshot/change를 보존해야 한다. |
| ES-MAP | 외부 변경에 맞는 선택을 도메인 규칙으로 계산하고, 성공한 뒤 value·selection·History 상태·revision을 일관되게 확정해야 한다. 변경 경로를 모르면 관찰하지 않은 patch를 만들어 내면 안 된다. 선택의 유효성 복구와 논리적 위치 보존은 구별해야 한다. |
| ES-RECOVER | 외부 변경에 대한 선택 복구가 실패하면 마지막 일관된 세션 상태를 보존해야 한다. 복구 전에는 새 편집이나 오래된 undo를 작성하면 안 된다. 이미 완료된 문서 commit이나 자기 편집의 성공을 나중의 동기화 실패로 취소하면 안 된다. 복구 실패와 mutation 거절은 구별해야 한다. |
| ES-LOCAL-HISTORY | 기록한 작업은 선택한 local History 정책에 따라 문서와 편집 전후 선택을 복원해야 한다. 무효한 역연산을 현재 문서에 적용하면 안 된다. 기록·그룹·외부 변경 처리 정책은 명시되어야 하며 구독 여부만으로 기록의 유효성이 달라지면 안 된다. |
| ES-HISTORY-OWNER | 사용하는 History는 편집하는 문서에 속해야 한다. undo 단위·가용성·기록 정책은 해당 owner의 계약을 따라야 한다. 지원하지 않는 기록 정책을 요청받으면 mutation 전에 명확히 거절하고, 성공한 것처럼 조용히 다른 정책을 적용하면 안 된다. |
| ES-HISTORY-RESULT | 성공한 History 작업은 자기 대상·적용한 변경·결과 상태를 식별할 수 있어야 한다. 문서 값이 같은 History 전이도 관찰 가능해야 한다. 알림 순서나 나중의 live 상태로 작업 귀속을 추측하면 안 된다. 알려진 target의 선택은 복원된 문서에 맞게 보정하며 모르는 target의 과거 선택을 만들어 내지 않는다. |
| ES-HISTORY-RECOVER | 성공한 외부 undo/redo 뒤 selection 복원이 실패하면 이미 실행된 History 결과를 보존해야 한다. 복구 과정에서 완료한 History 작업을 다시 실행하면 안 된다. 복구가 완료되기 전에는 추가 History 작업을 실행하면 안 된다. |
| ES-LIFETIME | 구독 해제는 해당 관찰자의 알림을 중단해야 하며 반복 호출이 나중의 구독을 해제하면 안 된다. 내부 관찰의 연결·해제 전략은 자원 수명이 명확해야 하고 UI 구독 유무만으로 local History의 유효성이 달라지면 안 된다. |

세션 revision은 문서 commit 횟수가 아니다. selection만 바뀌거나 문서 값이
그대로인 외부 History 상태가 바뀌어도 세션 revision이 생길 수 있다.

```text
외부 변경 --> 도메인의 선택 복구 --> 일관된 snapshot --> 알림
                    |
                    `-- 오류 --> 이전 세션 상태 보존
                                 복구 완료까지 새 편집 금지

외부 undo 성공 --> selection 복원 실패 --> 복원만 재시도
      |
      `-- 이미 확정된 undo를 다시 실행하지 않음
```

## 현재 TypeScript binding과 local History 정책

이 표는 현재 API의 동작을 명시한다. 기존 소비자는 이 계약에 의존할 수 있지만,
다른 binding이나 History 구현이 공통 의미를 만족하는 유일한 방식으로 간주하지 않는다.
정책을 바꾸려면 아래 호환성과 변경 기준을 적용한다.

| 경계 | 현재 정책 | 고정하지 않는 일반화 |
| --- | --- | --- |
| 선택 동기화 | 제공된 `mapSelection` 후 `reconcileSelection`을 실행한다. 대응하는 patch가 없으면 `change: null`을 전달한다. | 모든 binding이 두 callback과 null을 사용해야 한다. |
| 복구 | callback 예외를 프로그래밍 오류로 취급하고 다음 읽기/명령에서 복구를 재시도한다. 완료한 undo/redo는 재실행하지 않는다. | 모든 구현이 읽기를 재시도 trigger로 사용해야 한다. |
| local inverse History | 기록 대상인 실제 값 변경의 순차 patch와 전후 selection을 저장한다. 선택만 변경하거나 값이 같은 no-op은 기록하지 않는다. 실제 외부 변경 후에는 undo/redo를 비우며, 값이 다시 돌아와도 기록을 되살리지 않는다. `historyGroup`과 `history: "ignore"`는 기존 기록 정책이다. | 모든 History가 외부 변경 때 전체 기록을 삭제해야 한다. |
| 외부 History | `{ history }`로 주입한다. local `historyGroup`은 그 owner의 step을 합치지 않는다. 현재 API는 기록 생략을 전달할 수 없으므로 비어 있지 않은 operations의 `history: "ignore"`를 `history.ignore-unsupported`로 거절한다. | 기록 생략을 명시적으로 지원하는 다른 History 계약도 이를 금지해야 한다. |
| History result | `target`, `change`, `status`를 제공한다. 문서 변경이 없으면 `change: null`이다. | 모든 언어와 binding이 같은 필드·null 표현을 사용해야 한다. |
| 내부 관찰 | 마지막 UI 구독 해제 시 세션의 문서·외부 History 관찰 연결을 해제한다. local 기록이 있을 때는 별도의 일회성 변경 표시가 다음 실제 변경을 감지하고 스스로 해제한다. 이 표시의 listener는 Session·History stack·UI callback을 보유하지 않는다. 이후 읽기는 그 표시와 현재 문서로 동기화한다. | 구독자가 없으면 모든 내부 관찰을 끊거나, 반대로 모든 Session을 상시 관찰해야 한다. |

```text
local History 생성 --> 일회성 변경 감지
                              |
UI 구독 해제 -----------------|--- 세션/UI 관찰 연결만 해제
                              |
외부 변경 --------------------'--- 기록 무효 표시 후 감지 연결 해제
                                      |
값이 원래 값으로 돌아와도 ------------'--- 다음 읽기/명령에서 Undo/Redo 불가
```

이 결정은 local History의 유효성에 관한 것이다. 구독하지 않은 기간의 모든
문서 중간 상태·선택 mapping 경로·revision 수를 재생한다는 보장은 아니다.
그 전이 이력이 필요한 도메인은 별도 계약과 실행 증거가 필요하다.

## 행동 증거

표의 case는 owner 행동 테스트의 선언 이름이다. `docs:evaluate`가 ID와 파일·case의
연결을 검사하며, 행동의 통과 여부는 각 package test가 판정한다. 링크나 문자열의
존재만으로 적합성을 인정하지 않는다. `%s`, `$name`은 parameterized case다.

| 규칙 | 테스트 파일 | case |
| --- | --- | --- |
| ES-VALUE | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `fresh snapshot copies preserve local history until the value changes` |
| ES-SNAPSHOT | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `owns retained snapshot selections independently of state and history` |
| ES-SELECT | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `does not record selection-only or semantic no-op changes` |
| ES-APPLY | [grammar](../packages/json-document-editing/tests/conformance/editing-grammar.ts) | `EG-EDIT / rejection preserves %s and publishes nothing` |
| ES-OBSERVE | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `isolates observer failures from committed results and later observers` |
| ES-OBSERVE | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `queues reentrant notifications in revision order` |
| ES-OBSERVE | [session-lifecycle](../packages/json-document-editing/tests/session-lifecycle.test.ts) | `publishes an external change despite a snapshot reader (%s)` |
| ES-MAP | [session-composition](../packages/json-document-editing/tests/session-composition.test.ts) | `provides before/change/after mapping before reconciliation (observed: %s)` |
| ES-MAP | [session-lifecycle](../packages/json-document-editing/tests/session-lifecycle.test.ts) | `does not reuse an observed patch for a subscriber's equivalent later patch` |
| ES-RECOVER | [session-lifecycle](../packages/json-document-editing/tests/session-lifecycle.test.ts) | `retries %s from the last coherent selection without applying stale history` |
| ES-RECOVER | [session-lifecycle](../packages/json-document-editing/tests/session-lifecycle.test.ts) | `does not reject its completed edit when follow-up external selection mapping fails` |
| ES-LOCAL-HISTORY | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `round trips $name` |
| ES-LOCAL-HISTORY | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `a history group restores changes to every affected path` |
| ES-LOCAL-HISTORY | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `publishes external document changes and invalidates local history` |
| ES-HISTORY-OWNER | [editor-composition](../packages/json-document-collaboration/tests/editor-composition.test.ts) | `external history uses causal commit steps and rejects unsupported ignore before mutation` |
| ES-HISTORY-OWNER | [editor-composition](../packages/json-document-collaboration/tests/editor-composition.test.ts) | `retains remote fields, restores selection and shares runtime history availability` |
| ES-HISTORY-RESULT | [editor-composition](../packages/json-document-collaboration/tests/editor-composition.test.ts) | `retains remote fields, restores selection and shares runtime history availability` |
| ES-HISTORY-RESULT | [editing-lifecycle](../packages/json-document-collaboration/tests/editing-lifecycle.test.ts) | `releases both connections across resubscription and editor recreation` |
| ES-HISTORY-RESULT | [editing-lifecycle](../packages/json-document-collaboration/tests/editing-lifecycle.test.ts) | `separates a replica subscriber write (history-only: %s)` |
| ES-HISTORY-RESULT | [editing-lifecycle](../packages/json-document-collaboration/tests/editing-lifecycle.test.ts) | `history results retain their own immutable change and status before subscriber writes` |
| ES-HISTORY-RESULT | [editing-lifecycle](../packages/json-document-collaboration/tests/editing-lifecycle.test.ts) | `an earlier snapshot reader cannot swallow document or causal-only history notifications` |
| ES-HISTORY-RECOVER | [editing-lifecycle](../packages/json-document-collaboration/tests/editing-lifecycle.test.ts) | `completes a subscriber's pending selection restore before synchronizing later state` |
| ES-LIFETIME | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `invalidates undo and redo after an external value round trip (%s)` |
| ES-LOCAL-HISTORY | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `invalidates undo and redo after an external value round trip (%s)` |
| ES-LOCAL-HISTORY | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `catches an external round trip authored by a commit subscriber` |
| ES-LOCAL-HISTORY | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `retains an editor-authored step during an external notification` |
| ES-LIFETIME | [session-history](../packages/json-document-editing/tests/session-history.test.ts) | `keeps only a one-shot history marker after UI release` |
| ES-LIFETIME | [editing-lifecycle](../packages/json-document-collaboration/tests/editing-lifecycle.test.ts) | `releases both connections across resubscription and editor recreation` |
| ES-LIFETIME | [session-lifecycle](../packages/json-document-editing/tests/session-lifecycle.test.ts) | `an old unsubscribe cannot remove a later subscription with the same callback` |

대표 binding의 [Document·Sheet 적합성](../packages/json-document-editing/tests/conformance/editing-grammar.test.ts)과
[Rich Text 적합성](../packages/json-document-rich-text/tests/conformance/editing-grammar.test.ts)은
서로 다른 도메인 API를 통한 증거다. 같은 EditingSession을 공유하므로 독립 세션
구현의 증거로 세지 않는다. 테스트 통과는 현재 구현의 회귀 증거이며 공통 규칙의
영구성 증명이 아니다. 독립 Session 구현과 다른 관찰·복구·History 전략의 적합성은
아직 확인하지 않았다. Core의 독립 구현 적합성은 v3 profile의 별도 gate다.
DOM lifecycle의 브라우저 증거도 해당 정본에서 관리한다.

## 공개 계약 발견 경로

- [Editing package](../packages/json-document-editing/README.md)와
  [public entrypoint](../packages/json-document-editing/src/index.ts)
- [Editing API reference](../packages/json-document-editing/docs/api-reference.md)와
  [History 사용법](../docs/public/history.md)
- [Editing Usage](../site/src/routes/editing-demos/HistoryDemoRoute.tsx)와
  [source registration](../site/src/shared/demo-workbench/demo-sources.ts)

이 문서는 기존 API의 의미를 규정한다. 시그니처와 실행 예제는 기존 owner에
유지하며 별도의 API catalog나 새 runtime interface를 만들지 않는다.

## 호환성과 변경 기준

후속 구현·리팩터링은 적용되는 ES 규칙과 행동 증거를 유지해야 한다. 최적화,
새 문서 구현, 새 Connector를 이유로 의미를 조용히 바꾸면 안 된다.

- 같은 의미의 구현 교체는 기존 case를 그대로 통과해야 한다.
- 검증 누락을 찾으면 해당 owner에 반례를 재현하고, 규칙과 연결된 행동 검증을
  보완한다. 현재 구현의 우연한 동작을 새 필수 조건으로 승격하지 않는다.
- 기존 규칙과 양립하지 않는 의미는 동일 계약의 보완으로 취급하지 않는다.
  영향 규칙, 소비자의 이전/이후 관찰, 버전·이행 경계와 검증을 별도로 결정해야 한다.
  테스트 기대값만 바꾸어 회귀를 승인하지 않는다.
- 새로운 domain/profile은 대상·입력·History 정책과 적용 규칙을 명시하고 그
  owner에서 검증한다. 이 세션 계약 준수만으로 모든 Hands의 지원 기능이나
  기본 입력 정책이 완성됐다고 선언하지 않는다.
