# EditingSession 공통 계약

상태: Canonical. 이 문서의 ES 규칙은 현재 EditingSession의 호환성 기준이다.
구현과 회귀 테스트로 확인한 세션 의미를 확정한다. Editing package 전체의 Stable
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

## 세션 불변 조건

다음 규칙의 실패 불변성은 **진행 중인 외부 동기화를 끝낸 뒤 해당 요청이
시작하는 상태**를 기준으로 한다. 이미 완료된 외부 commit을 거절된 요청의
변경으로 취급하거나 되돌리지 않는다. Consumer는 유효한 JSON selection과 plan,
동일 문서에 속한 History, 부수 효과 없는 mapping/reconciliation을 제공해야 한다.

| ID | 유지할 의미 |
| --- | --- |
| ES-VALUE | 외부 문서 변경은 JSON 값 동등성으로 판단해야 한다. 동일 값의 새 snapshot reference 때문에 revision을 만들거나 local History를 지우면 안 된다. |
| ES-SNAPSHOT | 공개한 snapshot의 value·selection·revision·History 상태는 해당 전이에 속한 일관된 값이어야 한다. 보관한 snapshot이나 입력 selection의 변경으로 현재 상태와 History가 오염되면 안 된다. 내부 clone/freeze 방식은 고정하지 않는다. |
| ES-SELECT | 세션의 일시적 selection만 바꾸는 요청은 문서 값을 바꾸거나 local undo 항목을 만들거나 redo를 지우면 안 된다. 도메인이 문서 내용으로 저장하는 선택 mask 등에는 이 규칙을 일반화하지 않는다. |
| ES-APPLY | plan의 patch는 JSONDocument의 원자적 commit을 사용해야 한다. 예상 가능한 plan/commit 거절은 `ok: false`와 string `code`로 반환하고, 해당 요청의 문서·selection·History 전이나 성공 알림을 만들면 안 된다. |
| ES-OBSERVE | 세션이 확정한 revision은 활성 구독자에게 순서대로 전달해야 한다. 다른 구독자의 선행 snapshot 읽기가 알림을 소모하면 안 된다. 구독자 예외는 완료한 편집의 성공이나 다른 구독자의 전달을 바꾸면 안 된다. 재진입 후에도 반환 result는 자기 전이의 snapshot/change를 보존해야 한다. |
| ES-MAP | 외부 값 변경은 `mapSelection` 후 `reconcileSelection`을 실행하고, 모두 성공한 뒤 value·selection·History 상태·revision을 함께 확정해야 한다. 관찰한 patch가 해당 before/after에 대응하지 않거나 lazy read로 따라잡으면 `change: null`을 전달해야 한다. 도메인 callback은 null을 지원해야 하며, 유효성 복구가 논리적 위치 보존을 뜻한다고 가정하면 안 된다. |
| ES-RECOVER | 외부 mapping/reconciliation 예외는 마지막 일관된 세션 상태를 보존하고 읽기/명령에서 동기화를 재시도해야 한다. 복구 전에는 새 편집이나 오래된 undo를 작성하면 안 된다. callback 예외는 프로그래밍 오류이며 commit 거절 result가 아니다. 이미 완료된 문서 commit이나 자기 편집의 성공을 나중의 동기화 실패로 취소하면 안 된다. |
| ES-LOCAL-HISTORY | 기본 local History는 기록 대상인 실제 값 변경의 순차 patch와 변경 전후 selection을 복원해야 한다. 선택만 변경하거나 값이 같은 no-op은 새 undo 항목을 만들지 않는다. 외부 값 변경의 동기화가 성공하면 local undo/redo를 비워야 한다. `historyGroup`은 묶인 모든 변경을 복원하고, `history: "ignore"`는 기록을 생략하는 기존 선택으로 유지한다. |
| ES-HISTORY-OWNER | 외부 `EditingHistory`는 명시적으로 주입하며 같은 문서에 속해야 한다. undo 단위와 가용성은 그 owner가 결정한다. local `historyGroup`이 외부 step을 합치거나 외부 값 변경이 그 owner의 기록을 지우면 안 된다. 외부 owner를 사용하는 비어 있지 않은 operations의 `history: "ignore"`는 mutation 전에 `history.ignore-unsupported`로 거절해야 한다. |
| ES-HISTORY-RESULT | 성공한 외부 History result는 자기 작업의 `target`, `change`, `status`를 제공해야 한다. 문서가 그대로인 History 전이는 `change: null`이고 status 변경은 관찰 가능해야 한다. 알림 순서나 나중의 live status로 작업 귀속을 추측하면 안 된다. 알려진 target의 selection은 현재 값으로 mapping/reconciliation하며 모르는 target의 과거 선택을 만들어 내지 않는다. |
| ES-HISTORY-RECOVER | 성공한 외부 undo/redo 뒤 selection 복원이 실패하면 이미 실행된 History 결과를 보존해야 한다. 다음 읽기/명령은 selection 복원만 재시도하며, 실패가 지속되는 동안 추가 History 작업을 실행하면 안 된다. |
| ES-LIFETIME | 세션은 구독자가 있는 동안 문서와 주입한 History를 구독하고 마지막 해제에서 연결을 해제해야 한다. 이후 읽기는 최신 상태를 따라잡아야 한다. 해제 함수는 반복 호출해도 같은 callback의 나중 구독을 해제하면 안 된다. |

세션 revision은 문서 commit 횟수가 아니다. selection만 바뀌거나 문서 값이
그대로인 외부 History 상태가 바뀌어도 세션 revision이 생길 수 있다.

```text
외부 변경 --> mapping --> reconciliation --> 일관된 snapshot --> 알림
                   |             |
                   `---- 오류 ---'
                           |
                    이전 세션 상태 보존
                    읽기/명령에서 재시도

외부 undo 성공 --> selection 복원 실패 --> 복원만 재시도
      |
      `-- 이미 확정된 undo를 다시 실행하지 않음
```

## 행동 증거

표의 case는 기존 행동 테스트의 선언 이름이다. `docs:evaluate`가 ID와 파일·case의
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
| ES-LIFETIME | [editing-lifecycle](../packages/json-document-collaboration/tests/editing-lifecycle.test.ts) | `releases both connections across resubscription and editor recreation` |
| ES-LIFETIME | [session-lifecycle](../packages/json-document-editing/tests/session-lifecycle.test.ts) | `an old unsubscribe cannot remove a later subscription with the same callback` |

대표 binding의 [Document·Sheet 적합성](../packages/json-document-editing/tests/conformance/editing-grammar.test.ts)과
[Rich Text 적합성](../packages/json-document-rich-text/tests/conformance/editing-grammar.test.ts)은
서로 다른 도메인 API를 통한 증거다. 같은 EditingSession을 공유하므로 독립 세션
구현의 증거로 세지 않는다. Core의 독립 구현 적합성은 v3 profile의 별도 gate다.
DOM lifecycle의 브라우저 증거도 해당 정본에서 관리한다.

## 공개 계약 발견 경로

- [Editing package](../packages/json-document-editing/README.md)와
  [public entrypoint](../packages/json-document-editing/src/index.ts)
- [Editing API reference](../docs/api-reference/editing.md)와
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
