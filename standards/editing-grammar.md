# 편집 문법의 안정화 설계

상태: Design Draft. 기존 public API와 Stable profile의 의미는 유지한다.
이 문서는 공통 편집 규칙의 소유자, Hands별 해석, 적합성 증거를 설계한다.
대표 binding의 실행 증거는 아래 적합성 표에 연결한다. 전체 제안의 구현 완료,
Stable admission이나 외부 상호운용성을 주장하지 않는다.

## 목표와 범위

오랫동안 정착한 편집 문법을 구현과 제품이 바뀌어도 유지되는 계약으로 만든다.
작은 Core는 장기간 약속할 수 있는 의미만 소유한다. JSON Document의 여섯
member와 편집 문법의 크기는 서로 다른 문제다.

- Outcome: 같은 Hands profile을 소비하는 제품은 선택·편집·복사·복원에서 같은
  관찰 가능한 의미를 얻는다.
- Done: 이 설계에서 공통 규칙과 profile 선택을 구분하고, 각 규칙의 기존 owner,
  현재 구현과의 차이, 이를 판정할 적합성 사례를 연결한다.
- Don't: 이번 설계로 Core API를 늘리거나 기존 동작을 변경하지 않는다. 새로운
  범용 editor, command bus, profile registry나 package hierarchy를 만들지 않는다.

구현 근거의 범위는 JSON Document, Selection, Editing, Affordance, Web과
Document·Sheet·Rich Text의 대표 편집 경로다. Object의 전체 선택과 Database의
cut 미지원은 profile 차이를 판정하는 사례로 포함한다. 모든 Hands의 완성도,
브라우저별 입력 일치, 협업 wire protocol의 수렴은 이 설계의 검증 결과가 아니다.

## 현재 문제와 원인

`EditingSession`은 value·selection·history를 함께 처리하고 Selection family는
대상의 전이를 공유한다. 그러나 `EditingIntent`의 공통 계약은 `type: string`과
`dispatch` 형태이며, 동사의 사전 조건과 결과는 editor별 코드와 문서에 있다.
`Official Hands`도 아직 호환성 약속을 확정하지 않은 후보다.

이 때문에 여러 editor가 같은 API 형태를 제공해도 같은 편집 문법을 따른다는
증거가 되지 않는다. `selectAllAffordance`의 전체 선택 토글처럼 특정 관습이
범용 기본값으로 보이고, `selection.move`처럼 문서 변경과 선택 변경이 이름에서
구별되지 않는 사례도 있다. 동작을 선언하는 규칙과 그 규칙을 검증하는 사례의
연결이 부족한 것이 원인이다.

## 세 종류의 계약과 기존 소유자

다음은 새 runtime 계층이 아니라 기존 책임들이 약속할 내용의 구분이다.

| 계약 | 고정할 의미 | 정본 소유자 |
| --- | --- | --- |
| 공통 편집 규칙 | 선택 전이, 편집의 원자성, 복사와 History의 관계 | Selection·Editing |
| Hands profile | 편집 대상, 범위 해석, 삭제·붙여넣기 결과, 지원 작업 | Document Type과 해당 editor의 기존 owner를 조합한 Hands |
| 입력 매핑 | 키·포인터·IME를 어떤 편집 의도로 해석하는가 | Adapter·Affordance와 framework Connector |

```text
keyboard / pointer / IME ─ Adapter·Affordance ─┐
직접 호출하는 프로그램 ──────────────────────┤
                                             ↓
                         해당 editor의 편집 의도
                         + Selection / Topology
                                             ↓
                         EditingPlan + selectionAfter
                                             ↓
                         EditingSession → JSONDocument.commit
                                             ↓
                         해당 편집의 snapshot / History
```

이는 대표적인 값 변경 흐름이다. Copy는 조회이며, 선택만 바꾸는 작업은 document
commit을 만들지 않고, Undo/Redo는 선택한 History owner를 실행한다. 순수 JSON
소비자에게 Editing이나 Hands 설치를 요구하지 않는다.

| 기존 owner | 계속 소유할 책임 | 다른 곳으로 넘기지 않을 결정 |
| --- | --- | --- |
| `json-document` | JSON 값·주소·검증·원자적 Patch·변경 알림 | selection, clipboard, undo step을 Core에 넣지 않음 |
| `json-document-selection` | key/range/mask family, transition·map·reconcile·targets | DOM focus와 문서 mutation은 각각의 owner가 처리 |
| `json-document-editing` | `EditingPlan`, snapshot, transaction, local History, external History 연결 | 같은 transaction·History를 각 Hand에서 다시 구현하지 않음 |
| 기존 Document Type/editor 모듈 | 유효한 대상·문서 연산·projection, 의도를 plan으로 변환 | Host가 붙여넣기·삭제의 의미를 다시 결정하지 않음 |
| `json-document-affordance` | 선택·활성화·취소의 입력 의미, gesture lifecycle | 좌표·DOM capture는 Web에 연결 |
| `json-document-web` 및 text Web Adapter | platform event, clipboard 교환, native editing lifecycle | semantic edit는 해당 editor API로 전달 |
| React 등 Connector | framework subscription·render·focus lifecycle | 문서·선택·History의 별도 상태 소유자를 만들지 않음 |

Document Type은 책임 이름이며 이 표로 package 재배치를 승인하지 않는다. 현재
Document·Sheet 등은 Editing에, Rich Text는 자신의 package에 구현돼 있다.
Hands는 기존 공개 API들의 함께 검증된 조합이다. Host는 제품 데이터·권한·copy·
layout·concrete external instance와 조합을 소유한다.

## 공통으로 고정할 편집 규칙

아래 ID는 설계 요구사항이다. 실제 동결은 owner의 versioned 계약과 적합성
증거를 통해 이루어진다. DOM API 모양, JSON 저장 shape, 특정 키 조합은 이
규칙의 전제가 아니다.

| ID | 관찰 가능한 규칙 | Owner |
| --- | --- | --- |
| EG-SELECT | 선택만 바꾸는 작업은 document value와 문서 Undo/Redo 기록을 바꾸지 않는다. 범위 확장은 유효한 기존 anchor를 보존하고 focus를 이동한다. | Selection·Editing |
| EG-TARGET | navigation 위치, 선택된 대상, native text caret을 구별한다. 문서 안에서 대상이 이동했을 때 identity를 유지하는지와 삭제 후 선택의 도착점은 해당 profile이 정한다. | Selection·해당 editor |
| EG-EDIT | 값 변경은 patch와 `selectionAfter`를 한 편집 결과로 발행한다. 실패한 의도는 자신의 partial mutation·selection·History entry를 남기지 않는다. | Editing |
| EG-COPY | Copy는 현재 profile의 선택 대상을 구조화된 payload와 교환 표현으로 읽으며 document·selection·History를 바꾸지 않는다. | 해당 editor |
| EG-CUT | Cut은 복사할 대상을 확정한 뒤 그 대상에 대한 제거 plan을 실행한다. payload 확보 실패 시 제거하지 않는다. 제거 실패 시 문서는 유지되며 성공한 cut으로 보고하지 않는다. | Editing·해당 editor·Web |
| EG-PASTE | Paste는 profile이 정한 위치·대체 범위·identity 규칙으로 한 편집을 실행하고 결과 Selection을 함께 정한다. 호환되지 않는 payload와 범위 초과의 처리를 profile에 명시한다. | 해당 editor·Editing |
| EG-HISTORY | 한 사용자 작업의 Undo 단위를 명시한다. local History는 다른 변경이 개입하지 않은 undo/redo에서 기록된 document와 Selection을 복원한다. selection-only·no-op은 새 문서 History entry를 만들지 않는다. | Editing·선택한 History owner |
| EG-GESTURE | 구조적 gesture의 preview는 아직 확정되지 않은 결과다. commit은 그 preview에 해당하는 작업을 한 번 실행하고 cancel은 이를 실행하지 않는다. | Affordance·해당 editor 연결 |
| EG-RESULT | 각 편집 결과와 발행 snapshot은 그 편집의 value·selection·history 상태를 함께 설명한다. 재진입이나 외부 변경으로 더 최신 상태가 생겨도 이전 결과의 의미를 덮어쓰지 않는다. | Editing |

EG-EDIT의 실패 보장은 해당 의도가 만든 효과에 적용한다. 이미 받아들인 외부
document 변경을 실패한 의도 때문에 되돌리지 않는다. 이를 확인할 때 외부
변경 동기화와 새 의도 실행의 관찰 시점을 분리한다.

EG-CUT은 OS clipboard와 문서 사이의 분산 transaction을 약속하지 않는다.
Headless `cut()`은 보존 가능한 payload를 반환하고, Web event binding은 payload를
쓴 뒤 제거를 실행한다. Clipboard 쓰기 실패, 제거 거절, 성공한 후의 Undo를
서로 다른 결과로 검증한다. 브라우저가 custom edit를 다시 실행하지 않도록 하는
event ownership은 Web이 소유한다.

EG-HISTORY에서 외부 변경 이후의 의미는 선택한 History 계약을 따른다. 현재
local inverse History는 이를 비우며, collaboration History는 내 기여를 선택적으로
되돌린다. 둘을 같은 복원 알고리즘으로 고정하지 않는다. 이미 존재하는
`EditingHistory`를 사용하고 여러 Hand가 공유하는 작업 단위도 그 owner가 정한다.

EG-GESTURE는 구조 편집 preview에 대한 규칙이다. IME의 중간 DOM mutation과
composition grouping은 [DOM 편집 lifecycle](dom-editing-lifecycle.md)의 별도
계약을 따른다. `createGestureSession`의 존재만으로 Host의 preview가 문서를
변경하지 않는다고 증명할 수 없으므로 실제 연결까지 검증한다.

## Hands profile이 반드시 결정할 내용

각 profile은 다음 질문에 하나의 답 또는 명시적인 설정별 답을 제공한다. 이는
문서와 적합성 사례의 항목이며 새로운 runtime descriptor type은 아니다.

1. **대상:** 무엇을 편집하며 어떤 identity와 위치 단위를 사용하는가?
2. **선택:** 사용할 family, primary의 의미, 여러 범위 처리, focus와 선택의 관계는?
3. **Topology:** 가시 순서와 전체 대상 집합 중 무엇을 각 작업에 사용하는가?
4. **작업:** Select, Insert, Delete/Clear, Copy, Cut, Paste, Undo/Redo 중 무엇을
   지원하며, 미지원 작업은 왜 해당 profile의 사용 목적과 양립하는가?
5. **결과:** 삭제 후 선택, 붙여넣기 위치·대체 규칙, 범위 초과, 새 identity는?
6. **History:** typing·composition·drag의 작업 경계와 외부 변경의 처리 방식은?
7. **입력:** 선택한 플랫폼 관습, 편집 중인 text field와 구조 탐색의 우선순위는?

`unsupported`와 일시적으로 `unavailable`인 상태를 구별한다. Cut이 없는 editor와
선택이 없어 Cut을 할 수 없는 editor는 같은 계약이 아니다. API나 UI에서 지원을
선언한 작업은 동일한 지원 범위의 적합성 사례를 가져야 한다. 미지원 선언만으로
기대되는 기본 편집 흐름을 생략할 수 없으며, 그 선택의 외부 관습이나 제품 목적을
profile에서 설명한다.

### 현재 구현을 설명하는 대표 매핑

이 표는 현재 동작의 관찰이다. 관찰된 기본값이 곧 영구히 고정할 규칙은 아니다.

| 항목 | Document | Sheet | Rich Text |
| --- | --- | --- | --- |
| 편집 단위 | stable ID를 가진 블록과 text | stable row/column ID의 셀 | stable node ID와 text/child point |
| Copy 대상 | 선택된 블록 전체 | primary rectangle | 선택된 structured slice |
| Paste | 기본적으로 마지막 선택 블록 뒤에 삽입 | focus 셀부터 고정 경계 안에 기록 | 선택 구간과 schema에 맞게 slice 삽입 |
| 제거 | 선택 블록 제거 | Cut은 primary rectangle 값을 `null`로 비움 | 선택 구간 제거·schema 제약 적용 |
| 후속 선택 | 삽입 블록마다 collapsed range, 첫 블록 primary; 삭제 후 남은 이웃 | 붙여넣은 직사각형, Cut은 기존 선택 | transform 후 mapping된 text/child point |

현재 binding은 각각 `json-document-editing/src/document.ts`, `sheet.ts`,
`json-document-rich-text/src/editor.ts`에 있다. Document의 text offset이 블록
Copy를 부분 문자열 Copy로 바꾸지는 않는다. Sheet의 primary rectangle 정책도
여러 범위 전체의 Copy와 구별한다. 이런 차이는 profile 이름과 사용법에서 드러나야
하며, 공통 함수 이름 때문에 사용자가 동일한 대상을 예상하게 해서는 안 된다.

## 구현에서 계약으로 옮길 때의 결정

| 현재 증거 | 설계 결정 | 동결 전 확인할 증거 |
| --- | --- | --- |
| Document `selection.move`는 블록을 옮김 | navigation과 content movement를 의미 어휘에서 구별한다. 현재 identifier 변경은 별도 binding 변경으로 다룬다. | 위치 이동은 document 불변, 블록 이동은 identity 보존·Undo 복원 |
| `selectAllAffordance`는 Mod+A 재입력 시 clear | Select All의 공통 의미는 대상 전체 선택이다. 재입력 토글은 이를 선택한 입력 profile의 매핑으로만 취급한다. | 같은 select-all 의도의 반복은 같은 선택; 토글 profile은 두 번째 키 입력을 clear 의도로 변환 |
| Database `cut` 부재가 테스트에 고정됨 | 현재 binding의 미지원으로 기록한다. 이를 모든 Database의 영구 문법으로 일반화하지 않는다. | Database profile에서 Cut 생략 근거 또는 지원 동작을 정한 뒤 admission 판정 |
| `historyGroup`과 external History가 공존 | 작업 묶음 정책과 기록·복원 메커니즘을 구별한다. external History owner가 step을 결정한다. | 같은 drag/composition 사례를 선택한 History owner에 연결한 결과 |
| `EditingIntent`는 `type: string` | 공통 contract test로 의미를 고정하고 실제 호출은 각 editor의 기존 API로 번역한다. | `dispatch`, `copy`, `cut`, `undo`, `redo`를 각 owner public API로 실행 |

새로운 전역 command union이나 capability registry는 이 문제를 해결하는 전제가
아니다. 이미 다른 의미를 가진 호출들을 한 이름으로 합치면 대상과 결과의 차이가
숨는다. 공통 protocol은 공유하는 규칙에 두고, 문서의 의미는 기존 owner에 둔다.

## 적합성 설계

테스트의 단위는 함수 유무가 아니라 **시작 상태 → 의미 있는 작업 → 관찰 결과**다.
Owner package의 테스트 harness가 public API에 작업을 연결한다. Harness는 자체
편집 로직을 구현하지 않고 호출과 결과의 정규화만 수행한다.

공통 rule의 vector와 runner는 해당 owner의 `tests/conformance/`에 두고, 장르별
fixture와 API binding은 해당 editor owner에 둔다. 기존 Rich Text versioned
vectors와 Core suite는 원래 owner와 경로를 유지한다. 기존 unit test의 기대값을
복사하는 대신 공통 rule에 해당하는 사례를 공용 runner로 승격한다.

| 사례 | 작업 | 관찰할 결과 | 현재 근거와 추가 검증 |
| --- | --- | --- | --- |
| 선택 후 확장 | A 선택 → C까지 확장 | anchor A 유지, profile topology의 대상, document·History 불변 | Selection range tests → 여러 editor의 같은 rule binding |
| Copy의 무변경성 | 선택 → Copy 두 번 | 같은 의미의 payload, value·selection·Undo/Redo 불변 | clipboard surface test의 payload 확인에 상태 불변 관찰 추가 |
| 편집과 복원 | 선택 → 허용된 변경 → Undo → Redo | 각 단계의 value·selection·availability, snapshot 순서 | session history tests → Document·Sheet·Rich Text public binding |
| 거절의 원자성 | 경계 밖 Paste 또는 schema 거절 | 해당 작업의 partial value·selection·History·notification이 남지 않음 | Sheet와 Rich Text rejection 사례를 같은 관찰 계약에 연결 |
| Cut의 실패 경계 | clipboard 쓰기 실패 / 제거 거절 | 전자는 제거 미호출, 후자는 문서 불변·실패 결과 | Web clipboard rejection tests에 쓰기 실패 사례 연결 |
| Gesture 취소 | begin → preview 여러 번 → cancel | 확정 문서·History 불변, gesture 비활성 | gesture unit test와 실제 editor 연결을 함께 검증 |
| 반복 전체 선택 | select-all 두 번 | 같은 범위의 선택 유지 | KeySelection rule과 입력 profile의 토글 매핑을 별도로 검증 |
| 외부 변경 | 선택·편집 후 외부 삭제 → 읽기/구독 | profile의 유효한 선택, 선택한 History owner의 상태 | external-selection/session tests와 History binding 구분 |

각 사례는 document, selection, History availability/대상, 발행 snapshot, clipboard
결과를 관찰한다. JSON-equal value, profile의 논리적 대상과 작업 순서를 비교한다.
Object identity, 내부 cache, snapshot 객체의 정확한 key 집합은 적합성 기준으로
추가하지 않는다. Failure code와 optional field는 owning contract의 규칙을 따른다.

새 identity를 생성하는 작업은 ID 문자열 자체의 일치를 요구하지 않는다. 입력에
이미 있던 ID는 정확히 보존하고, 새 ID만 결과 사이의 일대일 대응으로 비교하며
문서·Selection·clipboard 내부 참조에도 같은 대응을 적용한다. Harness의 이 정규화는
잘못된 대상 선택, identity 재사용, 순서·내용 손실을 숨겨서는 안 된다.

통과 보고서는 `rule → profile → public binding → vector → 결과`를 추적할 수 있어야
한다. 공용 runner가 한 구현의 내부 model을 요구하거나 Host가 기대 결과를 만들기
위해 edit를 재구현하면 이 설계가 실패한 것이다. 여러 장르의 구현을 통과한 결과는
규칙의 적용 가능성 증거이며 같은 profile의 독립 구현 간 상호운용 증거와 구별한다.

### 실행 가능한 대표 증거

Calendar는 [materialized occurrence binding](../packages/json-document-editing/tests/conformance/calendar-grammar.test.ts)을
같은 공용 runner에 연결한다. 반복 회차 범위 선택·copy/cut·primary 회차 기본 paste·
거절·외부 삭제·local Undo/Redo를 검사한다. 아래 기존 세 editor의 대표 표와 함께
읽으며, Calendar의 문서 규칙은 독립 Document Type 공개 API를 소비한다.
Hand와 직접 호출의 선택 대상 일치는 [Calendar 경로 회귀](../packages/json-document-calendar/tests/calendar-protocol.test.tsx)로
검증한다. 이는 Calendar profile의 Stable 또는 독립 구현 간 conformance 선언이 아니다.

[Editing의 공용 runner](../packages/json-document-editing/tests/conformance/editing-grammar.ts)는
각 editor의 공개 entrypoint만 호출한다. [Document·Sheet binding](../packages/json-document-editing/tests/conformance/editing-grammar.test.ts)과
[Rich Text binding](../packages/json-document-rich-text/tests/conformance/editing-grammar.test.ts)은
fixture와 기대 결과를 해당 owner에 둔다. 공통 관찰 규칙에는 domain별 분기가 없다.

| 규칙 | Profile / public binding | 실행 vector와 추가 owner 증거 |
| --- | --- | --- |
| EG-SELECT | Document·Sheet `dispatch(selection.set)`; Rich Text는 RangeSelection 전이 후 `dispatch(selection.set)` | 공용 runner `extend preserves targets`: 빈 History·Undo 가능·Redo 가능 상태에서 anchor·focus·대상과 기록 보존 |
| EG-TARGET | 세 editor의 선택 및 external `JSONDocument.commit` | 공용 runner `external deletion`: 구독 유무 모두 missing endpoint 정리·local history 초기화; [Affordance 연결](../packages/json-document-affordance/tests/conformance/editing-grammar.test.ts)은 위치 선택과 블록 이동을 구별 |
| EG-EDIT | 세 editor `dispatch` | 공용 runner `rejection preserves`: 없는 블록, Sheet overflow, Rich Text 중복 ID를 거절하고 value·selection·publication·기존 undo/redo 대상 보존 |
| EG-COPY | 세 editor `copy` | 공용 runner `repeated structured copy`: 두 번의 payload와 전체 상태 불변, 기존 Redo 실행 결과 확인 |
| EG-CUT | 세 editor `cut`; Web `createWebClipboardBinding` | 공용 runner `capture target`; [Web clipboard failure](../packages/json-document-web/tests/clipboard-rejection.test.ts)는 첫/두 번째 표현 쓰기 실패·실제 validator 거절·성공 후 Undo를 검증 |
| EG-PASTE | 세 editor `dispatch(clipboard.paste)` | 공용 runner `profile paste`: 블록 뒤 삽입 / focus 셀 기록 / inline 구간 대체의 값·ID·후속 선택 및 한 step 복원 |
| EG-HISTORY | 세 editor의 기본 local `undo`, `redo` | 공용 runner `edit`, `profile paste`, `capture target`, `no-op`; 외부 owner와 grouping은 기존 [session-history](../packages/json-document-editing/tests/session-history.test.ts) 증거 유지 |
| EG-GESTURE | `createGestureSession` → Document `dispatch(selection.move)` | [Affordance 연결](../packages/json-document-affordance/tests/conformance/editing-grammar.test.ts): 여러 preview·cancel/pointer-cancel/lost-capture·중복 commit에서 실제 편집 횟수와 Undo 단위 |
| EG-RESULT | 세 editor `subscribe`와 각 결과의 snapshot | 공용 round trip은 편집·Undo·Redo의 publication 순서와 이전 결과 보존; 재진입은 기존 [session-composition](../packages/json-document-editing/tests/session-composition.test.ts) 증거 유지 |

반복 전체 선택은 [Selection의 의미 vector](../packages/json-document-selection/tests/conformance/select-all.test.ts)가
같은 universe에 대한 멱등성을 검사한다. Affordance 연결은 두 번째 Mod+A를
별도의 `clear`로 해석하는 입력 profile을 검사한다. 기존의 단일 Affordance
토글 테스트와 Rich Text 기본 편집·복원 테스트는 이 공용 관찰 경로로 승격했다.
그 밖의 다중 범위·직사각형 Paste·schema 사례는 더 넓은 입력 증거이므로 유지한다.

```sh
npm run test:projects -- --project json-document-editing --project json-document-rich-text --project json-document-selection --project json-document-affordance --project json-document-web
```

각 test 이름은 규칙 ID·profile·vector를 포함하고 Vitest가 실행 결과를 보고한다.
현재 fixture는 기존 ID를 그대로 비교하며 새 ID가 필요한 사례에는 결정적인
`createId`를 주입한다. 공용 runner가 ID를 지우거나 text projection만 비교하지
않는다. 서로 다른 임의 ID allocator 사이의 일대일 정규화나 같은 profile의 독립
구현 binding은 아직 이 suite의 증거가 아니다.

각 owner의 README가 profile 결정과 해당 테스트를 연결한다. 공개 API와 site
Usage/source 등록은 기존 Editing·Selection·Affordance·Web·Rich Text owner 경로를
유지한다. 감사에서 빠져 있던 Sheet editor source를 기존 Sheet Usage에 연결하고
정본 reference와 실제 source load를 검증한다. 새 runtime API나 Demo-local 편집
구현을 추가하지 않는다.

이 실행 표는 대표 경로의 적용 가능성에 대한 증거다. 모든 profile의 admission,
native caret/IME·브라우저 Clipboard 권한, 모든 Host callback, 협업 History의 전체
수렴을 보증하지 않는다. #719의 세션 관찰·복구·협업 History 보완은 별도 변경이다.

초기 적합성 작업에서 관찰한 Document offset 공백은 별도 수정과 회귀 증거로
연결했다. 초기 Document가
`{ blocks: [{ id: "a", text: "Alpha" }] }`일 때
`dispatch({ type: "selection.set", blockId: "a", offset: 2 })`의 선택이 0에 남던
원인은 point 동등성을 block ID만으로 판단한 것이었다. 현재 replace/extend는
offset도 비교하며 블록 toggle과 전체 블록 Copy의 의미는 유지한다.
[Document 회귀](../packages/json-document-editing/tests/document-editor.test.ts)는
같은 블록의 양방향 확장·collapse·경계 보정·History 보존과 Undo의 범위 복원을
검증한다. [Web 입력 투영](../packages/json-document-web/tests/web-adapters.test.ts),
[React 연결](../packages/json-document-react/tests/react-connector.test.tsx),
[Document 브라우저 경로](../site/tests/browser/document-demo.spec.ts)는 네이티브
방향을 anchor/focus로 전달하고 model이 focus를 발행할 때 기존 native range를
유지하는 증거다. offset 하나로 과거 native range 전체를 복원한다는 계약이나
profile 동결로 확대하지 않는다.

## Paste × Image 기본기: TBD 선행 계약

TBD는 구현 여부를 숨기는 이름이 아니다. 먼저 지원하려는 입력·관찰 결과·owner와
판정 사례를 기록하고, 실행 증거를 확보한 범위만 구현으로 바꾼다. 이 표는 기존
EG-COPY/CUT/PASTE/HISTORY의 구체화이며 새로운 Stable profile이나 Core API가 아니다.

| 사례 | 목표 / profile 결정 | owner | 현재 상태와 증거 |
| --- | --- | --- | --- |
| PI-FILE | PNG/JPEG/WebP를 읽고 정책·decode 실패 batch를 원자적으로 거절 | File Intake·Web·각 Hand | 공통 Web batch 구현; [reader 사례](../packages/json-document-web/tests/raster-files.test.ts) |
| PI-CONTENT | 이미지 내용·치수는 문서에 포함하거나 지속 가능한 asset 참조로 보존; metadata만으로 완료를 주장하지 않음 | 각 Document Type | Canvas·Composer embedded content 구현; [Composer JSON·History 사례](../packages/json-document-composer/tests/composer.test.ts) |
| PI-ORDER | 준비 완료 순서가 달라도 요청 순서로 한 batch씩 반영 | Editing | Object·Composer가 공통 queue 소비; [순서·재진입 사례](../packages/json-document-editing/tests/preparation-queue.test.ts) |
| PI-CANCEL | 취소·History 작업·unmount 뒤 늦은 결과는 무효 | Editing·각 Hand | Object 자동 무효화, Composer Escape·binding History·unmount 취소 구현; [취소 사례](../packages/json-document-composer-react/tests/composer-attachments.test.tsx) |
| PI-TYPING | 첨부 준비 중 typing/caret 이동 허용; 완료 시 최신 첨부 목록 뒤에 추가 | Composer·React Connector | 구현; [연속 첨부·typing·caret 사례](../packages/json-document-composer-react/tests/composer-attachments.test.tsx). inline anchor mapping은 아님 |
| PI-HTML | 대체 MIME 선택과 HTML 내부의 글+이미지 순서 보존을 구분 | Web·Rich Text Web·각 Hand | TBD: HTML 이미지, 불가한 source의 실패와 안전한 변환 |
| PI-PLAIN | 명시적인 plain paste와 지원 서식 paste를 분리 | Web·Affordance·각 Hand | TBD: 실제 modifier/native editable 사례 |
| PI-EXPORT | 선택한 Canvas 객체를 PNG로 복사; write 실패는 문서 불변 | Canvas·Web | TBD: 혼합 선택·투명 배경·권한 실패·외부 앱 확인 |
| PI-NATIVE | OS screenshot, 브라우저 Copy Image, Docs/Slides HTML, 외부 앱 왕복 | Web·제품 경로 | TBD: DOM 합성 이벤트를 OS-native 증거로 계산하지 않음 |

첫 이미지 slice는 서버 upload·임의 URL fetch·HTML import를 추가하지 않는다.
TBD를 위해 미동작 public stub이나 범용 registry를 만들지 않는다. Canvas의
외부 문서/선택 변경 시 취소 정책과 Composer의 typing 중 첨부 준비 유지 정책은
서로 다른 profile 선택으로 유지한다. 동일한 준비 queue·raster 검증/읽기 책임만
정본 API로 공유한다. 실제 Usage와 Source는 Canvas·Composer가 각각 소비하는
owner API에 연결하며 이 표로 API catalog를 대체하지 않는다.
Composer 외부의 직접 editor Undo/Redo나 draft 교체는 `cancelAttachments()`를 먼저
호출해야 한다. 이는 binding 바깥의 작업을 자동 감지한다는 보장이 아니다.

## 장기 호환성

약속하는 것은 **고정된 profile의 지원 입력과 관찰 가능한 결과**다. 같은 profile
revision 아래에서 target·selection·Undo 경계·failure/fallback 의미를 바꾸지 않는다.
새 API나 기능이 필요하면 기존 소비자의 결과를 보존하는 추가 계약으로 제공한다.

- Profile 식별과 version은 정본 문서에 우선 둔다. 모든 JSON payload에 공통
  envelope나 version field를 추가하지 않는다. 기존 Rich Text profile URI 같은
  저장 계약은 그 owner가 유지한다.
- 지원 입력을 넓혀 기존의 거절·fallback을 성공 처리로 바꾸는 것도 호환성 검토
  대상이다. 의미를 보존하지 못하면 별도 profile revision으로 제공한다.
- 모호함이 발견되면 서로 다른 해석의 반례를 먼저 남긴다. 명확한 기존 규칙 위반은
  구현 수정으로, 기존 규칙이 여러 동작을 허용했다면 profile 변경으로 판단한다.
- 이전 profile의 vectors와 실제 소비자 binding을 보존해 새 구현에서도 실행한다.
  Current tests를 새 동작에 맞춰 일괄 수정한 것은 호환성 증거가 아니다.
- 구현 알고리즘·cache·DOM rendering은 이 결과를 보존하는 범위에서 바꿀 수 있다.

Stable admission에는 공통 rule과 profile의 필수 작업이 모두 실행되고, 각 책임의
public API·owner reference·site Usage·source registration이 연결돼야 한다. 같은
profile의 독립 구현, 특히 명세 작성자 밖의 구현 경험에서 생긴 해석 차이를 해결해야
장기 상호운용성의 근거가 된다. 사이트의 한 Demo나 내부 테스트 통과로 이를 대체하지
않는다.

## 비용과 재검토 조건

이 설계는 profile별 선택과 compatibility corpus를 유지하는 비용을 만든다.
그 비용을 줄이기 위해 실행 구조를 하나로 통일하는 대신 현재 owner의 runner를
공유하고, 실제 지원하는 profile만 약속한다. 모든 장르에 한 Selection shape를
강제하는 대안은 text range·grid rectangle·object set의 의미를 잃으므로 채택하지
않는다.

다음 관찰은 설계를 다시 검토할 근거다.

- 공통 rule이 기존의 타당한 편집 관습을 표현하지 못하면 해당 rule을 profile
  선택으로 내리거나 사전 조건을 바로잡는다.
- 한 역할의 구현이 여러 Host에 남으면 기존 owner API의 부족 여부부터 확인한다.
- 규칙을 검증하려고 Core에 편집 상태를 넣어야 한다면 owner 분리가 잘못된 것이다.
- 같은 profile의 두 구현이 모두 suite를 통과해도 소비자 결과가 다르면 누락된
  관찰 항목을 반례로 추가한다.

## 외부 근거

- [Microsoft 표준 Edit 메뉴](https://learn.microsoft.com/en-us/windows/win32/uxguide/cmd-menus#standard-menus):
  Undo/Redo·Cut/Copy/Paste·Select All·Delete의 정착된 명령 어휘. 모든 장르의
  정확한 selection·paste·history 알고리즘을 규정하는 자료는 아니다.
- [W3C APG Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/):
  focus와 selection의 구별, 예측 가능한 navigation. APG는 구현 지침이다.
- [W3C APG Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/):
  복수 selection model과 선택 가능한 Ctrl+A 토글은 입력 관습이 하나가 아님을 보여준다.
- [Input Events Level 2](https://www.w3.org/TR/input-events-2/):
  물리 입력과 편집 의도의 구분을 참고한다. Working Draft의 event API를 영구 계약으로
  채택하지 않으며 구조 편집 전체의 의미로 확대하지 않는다.
- [RFC 9413](https://www.rfc-editor.org/rfc/rfc9413.html#section-2.2):
  확장과 오류 처리를 명확히 규정하고 해석 차이를 유지보수로 해결하는 근거다.
- [W3C Implementation Experience](https://www.w3.org/policies/process/#implementation-experience):
  명세 작성자 이외의 구현과 실제 상호운용 경험을 별도 증거로 요구하는 근거다.
