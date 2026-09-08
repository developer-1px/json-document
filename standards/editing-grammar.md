# 편집 문법의 안정화 설계

상태: Design Draft. 기존 public API와 Stable profile의 의미는 유지한다.
이 문서는 공통 편집 규칙의 소유자, Hands별 해석, 적합성 증거를 설계한다.
대표 binding의 실행 증거는 아래 적합성 표에 연결한다. 전체 제안의 구현 완료,
Stable admission이나 외부 상호운용성을 주장하지 않는다.

## 목표와 범위

오랫동안 정착한 편집 문법을 구현과 제품이 바뀌어도 유지되는 계약으로 만든다.
작은 Core는 장기간 약속할 수 있는 의미만 소유한다. JSON Document의 여섯
member와 편집 문법의 크기는 서로 다른 문제다.

기반 계약은 여러 편집 정책을 수용하고, **기본 Profile은 사람들이 익숙한 편집
동작을 구체적인 약속으로 제공한다**. 예외의 존재는 기본값의 적용 범위와 변형을
설명하는 근거다. 기본값 자체도 장기간 호환성을 지킬 계약에 포함한다.

- Outcome: 같은 Hands profile을 소비하는 제품은 선택·편집·복사·복원에서 같은
  관찰 가능한 의미를 얻는다.
- Done: 이 설계에서 공통 규칙과 profile 선택을 구분하고, 각 규칙의 기존 owner,
  현재 구현과의 차이, 이를 판정할 적합성 사례를 연결한다.
- Don't: 이번 설계로 Core API를 늘리거나 기존 동작을 변경하지 않는다. 새로운
  범용 editor, command bus, profile registry나 package hierarchy를 만들지 않는다.

아래 도출은 11개 내부 편집 사례의 model·의도·조합과 외부 관습을 비교한다.
실행된 공통 적합성 증거의 범위는 Document·Sheet·Rich Text의 대표 편집 경로와
Selection·Editing·Affordance·Web 연결이다. 사례를 읽은 것과 같은 profile의
독립 구현을 검증한 것은 구별한다. 모든 Hands의 완성도, 브라우저별 입력 일치,
협업 wire protocol의 수렴은 이 설계의 검증 결과가 아니다.

## 현재 문제와 원인

`EditingSession`은 value·selection·history를 함께 처리하고 Selection family는
대상의 전이를 공유한다. 그러나 `EditingIntent`의 공통 계약은 `type: string`과
`dispatch` 형태이며, 동사의 사전 조건과 결과는 editor별 코드와 문서에 있다.
`Official Hands`도 아직 호환성 약속을 확정하지 않은 후보다.

현재 공용 적합성 runner는 대표 editor의 공통 의미를 검증한다. 그 증거를 다른
장르로 확대하려면 규칙의 적용 조건과 profile 차이가 먼저 드러나야 한다.
`selectAllAffordance`의 전체 선택 토글과 선택 의도의 멱등성,
`selection.move`라는 이름 아래의 블록 이동과 선택 위치 이동도 구별해야 한다.
아직 남은 공백은 앱 사례에서 공통 의미를 도출하는 근거, 중첩된 편집 맥락의
계약, 같은 profile의 독립 구현 증거다. 각 owner에 있는 기본 동작을 함께 쓰는
Profile의 약속과, 그 Profile이 허용할 차이도 연결해야 한다.

## 앱 사례에서 최소 문법 도출하기

### 단축키가 드러내는 관습부터 찾는다

핵심 기능을 찾는 출발점은 **단축키로 반복 실행하도록 드러낸 작업**이다.
사용자가 근육기억으로 익힌 조작을 장기 호환성의 대상으로 보고, 여러 제품과
오랜 자료에 반복되는 기능부터 조사한다. 단축키의 존재는 조사 우선순위의 단서이며,
그 기능의 영구 불변성이나 Core 소유권을 단독으로 증명하지는 않는다.

[Mac 단축키](https://support.apple.com/en-us/102650)와
[Excel 단축키](https://support.microsoft.com/en-us/accessibility/excel/keyboard-shortcuts-in-excel)는
Undo·Copy·선택 확장을 반복해서 제공한다. 반면 문자와 셀의 선택 단위는 다르고,
Excel의 `F2`는 셀 내부 편집으로 들어가는 맥락을 드러낸다. 현재 제품의 공개
동작과 아래 역사적 지침을 대조하며, 현재 목록만으로 30년의 연속성을 주장하지 않는다.

| 먼저 살펴볼 입력·기능 | 추출할 의미와 차이 | 기존 책임에 연결할 후보 |
| --- | --- | --- |
| Undo·Redo 단축키 | 되돌릴 작업의 단위, 전후 내용·선택, 실행할 History | Editing·History와 입력 계약 |
| Copy·Cut·Paste 단축키 | 대상 확보, 교환 표현, 제거·삽입 결과 | Editing·domain codec·Web |
| 방향키·Shift 확장·Select All | 탐색과 선택 확장, 전체의 범위와 반복 입력 결과 | Selection family·topology·입력 계약 |
| Delete·Backspace | 선택 대상 제거와 삽입점 주변 삭제, 값 비우기와 구조 제거 | 대상별 Editing 계약 |
| Enter·F2·Escape | 내부 편집 진입, 확정·취소·복귀의 맥락 | Affordance lifecycle·domain·Web |
| 서식·채우기 등 대상별 단축키 | 같은 입력 계열에서도 다른 대상의 속성·내용 변경 | 해당 domain 계약 |
| Save·Print | 저장·출력처럼 문서 편집 밖의 효과 | Application 계약 |

이 표는 기능을 모두 추가하라는 목록이 아니다. 발견한 작업을 **시작 맥락·대상 →
의도 → 결과·선택·History**로 풀고, 여러 대상에서 유지되는 의미를 공통 문법으로,
대상별 차이를 domain 계약으로, 키와 수신 조건을 입력 계약으로 구체화한다.
기본 Hands profile은 이를 익숙한 동작으로 조합한다. 단축키에 직접 드러나지 않는
선택 mapping·원자성·gesture 취소도 그 작업을 성립시키는 데 필요하면 남긴다.

### 명령 이름보다 대상과 결과를 먼저 비교한다

Apple의 [1992년 Macintosh Human Interface Guidelines](https://www.vintageapple.org/inside_r/pdf/Human_Interface_Guidelines_1992.pdf)
인쇄 쪽수 286–300은 선택 후 작업하는 관습과 텍스트·배열·그래픽 선택을 구분하고,
필드 전체 선택과 내부 텍스트 편집의 차이도 설명한다. Windows의
[표준 Edit 메뉴](https://learn.microsoft.com/en-us/windows/win32/uxguide/cmd-menus#standard-menus)에도
같은 명령 어휘가 반복된다. 전자는 역사적 제품 지침, 후자는 Windows 7 시대의
플랫폼 지침이다. 오래된 공통 어휘의 근거이며 모든 동작이 30년간 동일했다는
증명은 아니다. 사람의 편집 관습에서 도출하는 것은 관찰 가능한 의미다. Core의
여섯 member, JSON Patch 표현, package 구조가 그 관습의 유일한 구현이라는
결론은 나오지 않는다.

다음 표는 현재 구현의 표본이다. 링크는 각 책임의 구현으로 연결된다. 마지막
열의 중첩 가능성이 모두 구현·검증됐다는 뜻은 아니며 현재 지원과 분리해 읽는다.

| 사례 | 대상·위치·선택 | 현재 대표 작업 | 도출에 필요한 차이 또는 중첩 |
| --- | --- | --- | --- |
| [Document](../packages/json-document-editing/src/document.ts) | block ID + text offset, 여러 범위 | 블록 이동·삭제·복사, 블록 text 교체 | Copy는 전체 블록. native 내부 문자열 선택과 대상이 다름 |
| [Rich Text](../packages/json-document-rich-text/src/editor.ts) | node ID + text/child point + affinity, 여러 범위 | text 삽입, structured slice 대체, mark 변경 | collapsed point에서도 삽입 가능. schema가 허용하는 구간·구조를 함께 판단 |
| [Order](../packages/json-document-editing/src/order.ts) | item ID, 선형 순서의 범위 | 이름 변경, 항목 제거·복사·삽입 | 항목 선택과 이름 입력 중 문자열 선택을 구별 |
| [Tree](../packages/json-document-editing/src/tree.ts) | node ID + parent 관계, visible topology의 범위 | 노드 선택·제거·복사·삽입 | Copy·제거는 선택한 노드의 후손까지 포함. 보이는 선택과 실제 영향 집합이 다름 |
| [Sheet](../packages/json-document-editing/src/sheet.ts) | row/column ID, 셀 직사각형과 primary | 셀 commit, fill, Cut·Paste | Cut은 primary 값을 비움. 셀 구조를 제거하거나 내부 문자열을 잘라내는 작업과 다름 |
| [Database](../packages/json-document-editing/src/database.ts) | record/property ID, view가 제공하는 표 topology | cell commit, record 추가·삭제, view configure, Paste | 셀 값과 record 구조, 저장되는 view 설정을 구별. 현재 Cut 부재는 보편 규칙이 아님 |
| [Object](../packages/json-document-editing/src/object.ts) | object ID 집합, x/y/width/height | translate, resize, fill, Copy·Paste | 선택 위치의 이동과 객체 좌표 변경은 다름. 현재 객체 model이 완전한 중첩 text editor는 아님 |
| [Kanban](../packages/json-document-editing/src/kanban.ts) | card ID 집합, column ID + beforeCardId | 카드 이동·제거 | 이동은 소속과 순서를 바꿈. 보드 모양만으로 새 공통 선택 family를 요구하지 않음 |
| [Calendar](../packages/json-document-editing/src/calendar.ts) | event ID + occurrenceStart, 구체화된 occurrence 범위 | 생성·이동·resize, Copy·Paste | 선택한 occurrence와 반복 일정 변경 범위는 다름. 시간·반복 규칙은 domain 의미 |
| [Annotation](../packages/json-document-editing/src/annotation.ts) | annotation ID 집합, source ID + selector | 생성·본문 변경·이동·resize·삭제 | 편집되는 annotation과 가리키는 source 영역을 구별. 원본 이미지 픽셀 편집 사례가 아님 |
| [Composer](../packages/json-document-composer/src/commands.ts) | Rich Text point, reference atom, attachment ID | text·reference 삽입, attachment·model 변경 | 여러 편집 대상을 한 draft에서 조합. 제출·외부 실행의 효과는 별도 Application 계약 |

11개 사례는 같은 레포의 구현이며 다수가 같은 EditingSession을 쓴다. 그 반복은
내부 재사용 가능성의 증거다. 서로 다른 생태계가 독립적으로 같은 의미를 채택했다는
증거로 11번 세지 않는다. Raster·파일 이동은 아래 외부 반례로만 사용한다.

### 하나의 편집을 설명하는 최소 질문

의미를 설명하는 단위는 **작업을 받을 편집 맥락 + 대상·위치 + 의도 → 결과**다.
API 인자에 모두 넣으라는 뜻은 아니다. 상태나 명시 인자로 이미 정해지는 것은
그 계약에서 읽으면 된다. 한 범용 state 객체나 command envelope를 추가하지 않는다.

```text
편집의 의미
├─ 대상: 무엇의 내용·속성·구조를 다루는가
│  ├─ identity: 같은 대상을 어떻게 알아보는가
│  └─ position / topology: 어디이며 어떤 순서·관계로 해석하는가
├─ 작업 맥락: 어느 편집기가 무엇을 대상으로 받는가
│  ├─ selection: 대상 집합·범위·영역 또는 삽입점
│  ├─ 입력 focus: 현재 입력을 받는 곳
│  └─ 중첩: 객체 / 셀 / 그 안의 텍스트 사이의 진입·복귀
├─ 의도: 탐색·선택 / 내용·구조 변경 / 교환 / 복원
└─ 결과와 작업 경계
   ├─ 진행 중인 draft·preview / 확정 / 취소·거절
   ├─ 변경된 내용과 후속 선택·위치, 교환 payload
   └─ 관찰 시점과 Undo/Redo의 대상·단위
```

이 트리는 질문의 분류다. 상속 관계나 새 runtime 모듈 목록이 아니다. 다음 구별을
없애면 실제 사례의 결과를 설명할 수 없다.

| 구별 | 없애면 설명할 수 없는 사례 | 남길 계약 / 기존 연결 |
| --- | --- | --- |
| Identity와 position | 같은 블록의 offset 변경, 이동한 같은 카드, 같은 event의 여러 occurrence | Point 단위·동등성·mapping은 해당 editor와 Selection. EG-TARGET |
| Selection과 실제 작업 대상 | `annotation.create`의 새 대상, `record.delete(recordId)`의 명시 대상, Tree의 선택된 부모와 숨은 후손 | 대상은 selection·명시 인자·삽입 위치와 의도로 정한다. 모든 작업에 non-empty selection을 강제하거나 효과를 보이는 선택에만 제한하지 않음 |
| 입력 focus와 range의 `focus` | 표 셀 입력 중 문자열의 역방향 선택 | 전자는 입력을 받는 곳, 후자는 범위의 한 endpoint. 이름이 같아도 같은 상태가 아님. EG-SELECT·EG-TARGET |
| 저장 내용과 보이는 topology | 접힌 Tree, 정렬된 Database, 저장되는 `view.configure` | 가시 순서를 읽는 것과 view 설정을 수정하는 것은 다른 작업. EG-TARGET·EG-EDIT |
| 요청·진행 중 작업과 확정된 편집 | 여러 pointer preview, IME composition, 여러 입력을 묶는 History | 사건 하나·dispatch 하나·commit 하나·Undo 한 step은 일대일이 아님. EG-GESTURE·EG-HISTORY·DOM lifecycle |
| 작업 결과와 이후 현재 상태 | 구독 중 재진입, 외부 변경 이후 Undo | 결과의 관찰 시점과 선택한 History owner의 복원 의미를 보존. EG-RESULT·EG-HISTORY |

문자마다 stable ID가 있어야 한다거나 모든 위치를 숫자 하나로 표현해야 한다는
결론은 나오지 않는다. [Rich Text point](../packages/json-document-rich-text/src/model.ts)의
text/child 구별·affinity와 [Selection family](../packages/json-document-selection/src/core/family.ts)의
transition·map·reconcile·targets가 이미 이 차이의 정본 경계를 제공한다.

### 중첩은 입력을 받을 곳의 계약이다

[W3C APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/#keyboardinteraction-settingfocusandnavigatinginsidecells)는
셀 탐색에 쓰는 화살표와 셀 안의 caret·widget 조작을 구분한다.
[Keynote의 텍스트 상자](https://support.apple.com/en-ca/guide/keynote/tan4fd6ee725/mac)는
객체 자체와 그 안의 텍스트를 따로 선택한다. 두 자료는 지침·제품 관습의 근거이며
범용 editing scope API를 규정하지 않는다.

```text
Application
└─ 표를 다루는 Hand
   ├─ 셀 선택: Copy → 셀 payload, Delete 입력 → 선택한 셀 정책
   └─ 셀 내부 편집
      └─ 텍스트 선택: Copy → 문자열, Delete 입력 → 문자 편집

Canvas Hand
└─ 텍스트 객체 선택
   └─ 내부 텍스트 편집
```

중첩을 조합하는 profile은 진입·복귀, 입력 수신자, 지원하지 않거나 거절한 의도의
전달 여부, 후속 선택을 결정해야 한다. 내부 편집기가 삭제를 거절했다는 이유만으로
바깥 객체 삭제가 실행되는 해석을 허용할지 명시해야 한다. 이 설계의 후보는
**해당 맥락이 맡은 편집의 거절을 바깥의 다른 편집으로 암묵 변환하지 않는 것**이다.
처리하지 않은 입력의 명시적 위임과 실패를 구별하며, 정확한 키·진입 방법은 입력
profile이 정한다. 아직 전체 Hands에 실행 검증된 새 규칙은 아니다.

명령 후보를 찾는 단계의 미적용과 실행한 편집의 거절도 구별한다.
[ProseMirror Commands](https://prosemirror.net/docs/guide/#commands)는 적용할 수 없는
명령의 `false`와 다음 후보 탐색을 정의한다. 이를 이 레포의 `EditingResult.ok: false`와
같은 뜻으로 연결하지 않는다. [DOM Event](https://dom.spec.whatwg.org/#interface-event)의
기본 동작 취소·전파 중단도 편집 성공과 별개의 관찰이며, 어떤 입력을 맡았는지는
해당 binding의 계약으로 판단한다.

여기서 편집 맥락은 HTML `editing host`, DOM element, JSON subtree, History
instance와 일대일 대응하지 않는다. Toolbar로 focus가 옮겨져도 편집 명령은 저장된
선택을 대상으로 할 수 있다. Headless 호출은 DOM focus 없이 대상을 지정할 수 있다.
Calendar intent의 `scope: "this" | "this-and-following" | "all"`은 반복 일정의
**변경 범위**이며 이 입력 맥락과 다른 개념이다.

현재 [DocumentTextControl](../packages/json-document-react/src/use-document-text-control.ts)은
native range의 방향을 투영하고, [Web virtual selection scope](../packages/json-document-web/src/virtual-selection-scope.ts)는
자신의 영역에서 전체 텍스트 선택·Copy와 editable target 우선 처리를 맡는다.
이는 기존 소유자의 증거이며 둘 중 하나를 모든 편집 맥락의 정본이라고 선언할
근거는 아니다. 범용 scope registry나 Host별 dispatcher를 새로 만들지 않는다.

### 반례가 정하는 공통 규칙의 경계

| 과도한 일반화 | 근거 있는 반례 | 이 설계의 처리 |
| --- | --- | --- |
| 선택만 바꾼 작업은 어떤 경우에도 Undo 기록이 아님 | [GIMP Undoing](https://docs.gimp.org/3.0/en/gimp-concepts-undo.html)의 선택 도구 작업과 [AppKit Undo](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/UndoArchitecture/Articles/AppKitUndo.html)의 저장되지 않는 view selection 기록 | 편집 전 선택 복원과 selection-only 기록을 구별. 현재 EG-SELECT·EG-HISTORY의 기본 정책을 다른 profile 전체에 강제하지 않음 |
| 이동은 항상 Copy 후 즉시 제거한 뒤 Paste | [Finder 이동](https://support.apple.com/en-gb/102650)은 Clipboard의 파일을 목적지에 옮기는 동작을 제공 | EG-CUT은 현재 즉시 제거하는 cut 계약. 지연 이동은 같은 계약의 이름만 다른 구현이 아님 |
| 복사한 저장 값을 그대로 넣으면 의미도 보존 | [Excel 수식 이동·복사](https://support.microsoft.com/en-us/excel/move-or-copy-a-formula-in-excel)는 복사 시 상대 참조 변경, 수식 이동 시 참조 유지를 구별 | payload의 참조·identity·배치 변환은 profile 계약. JSON 모양이나 text 일치만으로 교환 호환성을 판정하지 않음 |
| Shift-click 확장은 항상 같은 anchor를 고정 | Apple HIG 1992 인쇄 쪽수 290–291은 addition과 fixed-point 두 방식을 설명 | 현재 EG-SELECT의 고정 anchor 전이를 유지. 다른 입력 관습을 같은 전이로 일반화하지 않음 |
| Selection은 항상 문자열의 시작과 끝 | 레포의 Sheet rectangle, Calendar materialized occurrences와 Selection mask 확장 | 대상별 family를 유지. mask algebra의 존재는 raster Hand 완성의 증거가 아님 |
| 입력이 끝나면 Undo 한 step | 여러 preview와 typing/composition grouping, GIMP의 선택 도구 작업 | 작업의 확정·취소와 History grouping을 따로 명시 |

공통 의미로 남는 것은 대상과 위치의 구별, 같은 의도의 명시된 결과, 효과의
관찰·실패 경계다. 구체적인 선택 모양, 복사할 내용, 붙여넣기 위치, 영향을 받는
참조, 기록할 상태와 작업 묶음은 profile이 채운다. Copy의 source 내용 보존과
clipboard 자체의 변경도 별개의 효과다. 원자적 문서 편집은 이 레포가 제공하는
강한 계약이며 모든 제품이 이미 같은 실패 보장을 구현했다는 역사적 주장은 아니다.

## 하이라키: 구체화와 조합

고정할 공통 의미와 profile이 결정할 내용을 먼저 나눈다. 그 다음 기존 모듈이
어떤 부분을 실현하는지 연결한다. 앱 이름과 package 폴더 순서에서 의미의 상속
관계를 역으로 추정하지 않는다.

```text
편집 계약
├─ 공통 규칙: 대상·선택·효과·관찰·실패의 의미
├─ 대상별 구체화
│  └─ model / 유효한 position / selection·topology / 연산·교환·복원 정책
└─ 입력 관습별 구체화
   └─ key·pointer·IME / focus·중첩 / gesture·native lifecycle

대상별 계약 + 선택한 입력 계약
                │ 조합하고 함께 검증
                v
           Hands profile
                │ Host가 여러 Hand와 외부 서비스를 조합
                v
           Application
```

대상별 계약과 입력 계약은 서로 다른 축이다. Sheet가 Rich Text를 상속하는 것이
아니며 Windows·macOS 관습 때문에 문서 model을 복제할 이유도 없다. Hands profile은
함께 약속하는 조합이다. 위의 구분을 새 package나 public descriptor type으로
등록하지 않는다. 실제 문서·API·Usage는 아래의 기존 정본 owner에 둔다.

의미를 실현하는 책임 지도는 다음과 같다. 화살표는 이 설계의 책임 연결이며
현재 package import graph의 모든 edge를 표현하지 않는다.

```text
Headless API                   Keyboard / Pointer / IME
     |                                   |
     |                          Adapter / Affordance
     +-------------------+---------------+
                         v
                   Domain editor
                    /         \
          Selection·Topology   EditingPlan + selectionAfter
                    \         /
                     v       v
                    EditingSession
                 관찰·작업·History 연결
                         |
                         v
                    JSONDocument
                  값·원자적 commit
              local / collaboration 구현

Connector: 이 책임들을 framework의 구독·render·focus lifecycle에 연결
Host: 정본 API의 조합 순서·제품 정책·데이터·layout·외부 instance 주입
```

Selection의 수학적 전이는 JSONDocument mutation 없이 사용할 수 있고, 순수 JSON
소비자는 Editing 없이 Core를 사용할 수 있다. Collaboration은 같은 JSONDocument
계약의 다른 구현이며 `EditingHistory` 연결은 별도 선택이다. 입력 맥락 하나마다
History를 하나씩 생성하거나 Application 전체에 단일 History를 강제하지 않는다.
같은 문서를 여러 view에서 편집할 때의 History 귀속은 선택한 owner의 계약이다.

### 기존 소유자와 연결

Copy는 조회이며, 선택만 바꾸는 작업은 document commit을 만들지 않고,
Undo/Redo는 선택한 History owner를 실행한다. 위의 흐름을 모든 요청이
Core commit으로 향하는 단일 경로로 해석하지 않는다.

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

## 기본 Profile이 제공할 편집 동작

이 설계에서 기본 Hands profile은 **선택한 대상·입력·History 계약과 그 조합의
적합성 기준**을 묶는다.
기본 Profile은 해당 편집 대상을 사용할 때 추가 정책 선택 없이 기대할 동작을 정한다.
Text·Sheet·Object가 같은 저장 model이나 선택 모양을 사용할 필요는 없다.
공통 기본 규칙을 각 대상별 계약과 조합하며, 같은 책임은 기존 정본 모듈에서 구현한다.

| 층위 | 약속하는 것 | 변형의 경계 |
| --- | --- | --- |
| Core와 기반 모듈 | JSONDocument의 원자적 commit·관찰, Selection·Editing 등 각 owner의 공개 계약 | 어떤 Profile도 소비하는 기반 계약의 보장을 약화하지 않음 |
| 기본 Hands profile | 대상별 의미와 정착한 기본 입력·편집 결과·선택·복원 | 설정을 생략했을 때의 동작까지 명시하고 검증 |
| 허용된 설정 또는 다른 Profile | 다른 입력 관습·기록 범위·교환 정책이 필요한 경우의 선언된 차이 | 같은 Profile 안에서 허용한 선택인지, 별도 Profile/revision인지 식별 |

기존 [JSON Document v3 profile](json-document-v3/profile.md)은 기반 계약을,
[Rich Text v1 profile](json-document-rich-text-v1/profile.md)은 대상별 계약을 정의한다.
[Official Hands Profile](../docs/public/official-hands.md)은 입력까지 조합하는 위치다.
기본 편집 동작을 묶는다는 이유로 이 계약들을 하나의 runtime 객체로 합치지 않는다.

### 채택할 기본 의미와 구체화할 조건

다음은 이 초안이 기본으로 제공하려는 의미다. 기존 동작·EG 규칙과 연결하며,
뒤에 적은 조합 검증이 끝나기 전까지 모든 Hands의 구현 완료로 표시하지 않는다.

| 동작 | 기본 Profile의 약속 | 구체화할 조건 / 연결 |
| --- | --- | --- |
| Undo 입력 | macOS `Cmd+Z`, Windows `Ctrl+Z`를 Undo 의도로 해석 | 편집 맥락의 수신 History, 실행 가능 여부와 조합 중 입력 처리. Web·Affordance |
| 편집 Undo/Redo | 외부 변경이 개입하지 않은 Undo는 편집 전 내용·선택을, Redo는 편집 후 내용·선택을 함께 복원 | 선택 범위와 방향, 여러 view의 귀속, 외부 변경 후 유효한 위치 복원. EG-HISTORY·EG-RESULT |
| 선택만 변경 | document와 문서 Undo/Redo 기록을 유지 | 선택 변경을 별도 Undo 대상으로 제공하는 정책과 구별. EG-SELECT |
| Copy | 현재 편집 맥락의 대상을 읽고 document·selection·History를 유지 | 셀 전체와 내부 문자열, 구조 표현과 교환 표현. EG-TARGET·EG-COPY |
| Cut/Paste | 확보한 대상에 대한 제거 또는 목적지에 맞는 삽입을 편집 결과와 후속 선택으로 설명 | 표현 선택·변환·거절·native 위임의 경계. EG-CUT·EG-PASTE |
| 작업 단위 | typing·composition·drag를 사용자에게 의미 있는 Undo 단위로 제공 | grouping의 경계와 취소 결과는 대상·입력·History 계약의 조합에서 명시. EG-GESTURE·EG-HISTORY |

[CKEditor Undo](https://ckeditor.com/docs/ckeditor5/latest/api/module_undo_undo-Undo.html)는
batch와 편집 전 selection을 함께 기록하며,
[UndoCommand](https://ckeditor.com/docs/ckeditor5/latest/api/module_undo_undocommand-UndoCommand.html)는
그 selection을 복원한다. [CodeMirror History](https://codemirror.net/docs/ref/#commands.history)는
일반 Undo와 selection 변경도 되돌리는 `undoSelection`을 구별한다. 해당 editor의
공개 계약은 기본 복원의 근거가 되며, 특정 내부 알고리즘을 Core에 요구하지 않는다.

특히 **편집과 함께 선택을 복원하는 것**과 **선택만 바꾼 작업을 새 Undo step으로
기록하는 것**은 별개의 결정이다. 기본 Profile은 전자를 약속하고 현재 EG-SELECT의
selection-only 정책을 유지한다. 후자의 변형이 필요하면 History owner의 지원과
그 Profile의 적합성을 별도로 확인한다.

### 기본값과 설정의 호환성

설정을 생략하는 것도 Profile의 유효한 사용이다. 따라서 기본값만 바꾸는 변경도
기존 소비자의 결과를 바꾸면 호환성 변경이다. 사용자가 근육기억으로 익힌 조작은
키 조합뿐 아니라 어느 맥락의 무엇을 어떻게 바꾸는지까지 포함한다. 기본 키가
같아도 Undo 수신자나 선택 복원을 바꾸면 그 약속을 바꾼 것이다.
문서와 검증 사례에는 Profile revision, 대상·입력 계약, 선택한 설정과 생략 시
기본값을 식별할 수 있게 남긴다.
모든 payload에 새 식별 필드를 추가하라는 요구는 아니다.

| 변경 | 같은 Profile을 유지할 조건 |
| --- | --- |
| 내부 구현·캐시 교체 | 같은 입력·설정에서 대상·결과·선택·History·실패 의미가 보존됨 |
| 사용자의 단축키 재설정 | Profile이 허용한 입력 설정이며 Undo 의도와 복원 결과는 유지됨 |
| 기본 단축키·selection-only 기록·Paste 우선순위 변경 | 기존 revision의 생략된 설정과 명시된 설정 모두 기존 의미를 유지해야 함. 보존하지 못하면 별도 Profile/revision으로 제공 |

허용할 설정의 목록은 각 Profile에 둔다. keymap을 재정의할 수 있는 API가 있다고
모든 재정의를 같은 기본 Profile의 적합한 동작으로 인정하지 않는다. 선택지는
열어 두되, 기본 경로를 사용하는 제품이 반복해서 정책을 설계할 필요가 없게 한다.

## 공통으로 고정할 편집 규칙

아래 ID는 설계 요구사항이다. 실제 동결은 owner의 versioned 계약과 적합성
증거를 통해 이루어진다. DOM API 모양, JSON 저장 shape, 특정 키 조합은 이
규칙의 전제가 아니다.

이 표의 적용 범위는 현재 구조·텍스트 편집 profile의 계약이다. EG-SELECT의
selection-only 기록 정책과 EG-CUT의 즉시 제거를 다른 장르의 모든 관습으로
일반화하지 않는다. 범위 확장의 anchor 규칙은 고정 anchor로 확장하는 현재
range 전이에 적용한다. 다른 family나 raster·지연 이동 profile을 동결하려면 해당 상태와
History·transfer 의미를 먼저 명시해야 하며, 기존 profile의 규칙을 느슨하게
바꾸어 같은 profile이라고 부르지 않는다.

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

Web의 메모리 Clipboard 테스트가 확인하는 것은 표현 쓰기와 editor callback의
결과다. 쓰기 실패 시 제거 callback이 호출되지 않았더라도 실제 브라우저의 후속
기본 동작까지 차단됐다고 단정할 수 없다. [Clipboard API 초안의 cut 처리](https://www.w3.org/TR/2026/WD-clipboard-apis-20260624/#cut-action)와
연결해 event 취소 상태·후속 native 편집·OS Clipboard 반영을 별도로 관찰해야 한다.
이것은 기본 Cut 보장의 검증 범위이며 확정된 브라우저 결함이나 OS transaction
보장으로 해석하지 않는다.

EG-HISTORY에서 외부 변경 이후의 의미는 선택한 History 계약을 따른다. 현재
local inverse History는 이를 비우며, collaboration History는 내 기여를 선택적으로
되돌린다. 둘을 같은 복원 알고리즘으로 고정하지 않는다. 이미 존재하는
`EditingHistory`를 사용하고 여러 Hand가 공유하는 작업 단위도 그 owner가 정한다.

EG-GESTURE는 구조 편집 preview에 대한 규칙이다. IME의 중간 DOM mutation과
composition grouping은 [DOM 편집 lifecycle](dom-editing-lifecycle.md)의 별도
계약을 따른다. `createGestureSession`의 존재만으로 Host의 preview가 문서를
변경하지 않는다고 증명할 수 없으므로 실제 연결까지 검증한다.

입력 중 native 표시와 확정된 document, History step도 구별한다.
[Input Events Level 2 초안](https://www.w3.org/TR/2026/WD-input-events-2-20260501/#input-event-order-during-composition)은
취소할 수 없는 IME 조합 갱신을 설명한다. 기본 Profile의 입력 결과·취소·Undo
의미를 고정하고, 실제 입력 trace가 그 결과로 귀결되는지는 Web binding에서
검증한다. Working Draft의 특정 이벤트 순서나 지연 시간을 Core에 고정하지 않는다.

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

### 기본 Profile의 코드 연결을 설계할 위치

다음 표는 후속 구현에서 확인할 정본과 공백을 연결한다. 이 문서 변경은 해당 API를
확장하지 않으며, 기존 API로 조합할 수 있는지 확인한 뒤 부족한 owner만 확장한다.

| 책임 | 기존 코드와 API | 다음 설계에서 닫을 공백 |
| --- | --- | --- |
| 기본 입력 해석·실행 가능 표시 | Web [keyboard.ts](../packages/json-document-web/src/keyboard.ts)의 `defaultWebKeymap`, `createWebKeyboardAdapter`; Affordance의 `historyAffordance` | 설정 생략·허용된 재설정에서 Undo 의도가 보존되는지 확인. 기본 keymap을 Host마다 복제하지 않음 |
| 편집·선택·History 연결 | Editing의 `createEditingSession`, [EditingHistory](../packages/json-document-editing/src/history.ts) | 모델의 전후 선택과 native 선택 투영을 구별하고, 여러 view에서 실행할 History와 복원 대상 명시 |
| 중첩 진입·복귀와 입력 수신 | Affordance의 rename/gesture lifecycle, Web의 `isWebEditingHostTarget`, 각 domain의 Web binding | 후보 미적용·맡은 편집 거절·명시적 위임을 구별하는 연결. 유효한 조합을 지원하지 못하면 정본 API에서 해결 |
| 표현 교환과 Paste | Web의 `createWebClipboardBinding`, domain의 codec·표현·paste API | 표현 선택 실패와 선택한 payload의 편집 거절을 구별. 실제 native 후속 처리까지 관찰 |

먼저 아래의 기본 Undo 사례를 공개 API 조합에 연결하고, 같은 기대 결과를 입력
binding까지 확장한다. 중첩·여러 view·외부 표현의 차이는 해당 계약에서 별도로
구체화한다. 구현을 바꿀 때 필요한 owner reference·Usage·source 등록은 각 owning
package의 기존 위치에서 함께 갱신한다.

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

## 새 도출의 검증 질문

다음은 실행할 수 있도록 시작 상태와 판정 결과를 적은 **후보 사례**다. 앞의
기존 적합성 표의 통과 항목과 합산하지 않는다. 이 문서 변경은 새 behavior vector나
구현을 추가하지 않는다.

| 사례 | 시작 상태 → 작업 → 판정할 결과 | 연결·현재 증거의 한계 |
| --- | --- | --- |
| 셀과 내부 문자열 | `Alpha` 셀 선택 / 내부 `ph` 선택 각각에서 Copy → 셀 payload / `ph` | EG-TARGET·EG-COPY. 기존 Sheet·native selection 증거는 각각 있으며 이 중첩 전체의 공통 binding은 없음 |
| 기본 Undo와 선택 복원 | 아래의 `Alpha` 범위 교체 → Undo → Redo; 정방향·역방향 각각 실행 | EG-HISTORY·EG-RESULT. 전후 model selection 증거와 실제 native range 복원 증거를 구별 |
| 선택만 변경한 뒤 Redo | 편집 → Undo → 선택만 이동 → Redo → 기록된 편집 후 내용·선택 | EG-SELECT·EG-HISTORY. 기본 Profile에서 선택 이동이 새 문서 History entry를 만들거나 Redo를 지우지 않음 |
| 거절 시 바깥으로 전이 금지 | 선택한 객체 안의 text editor가 Delete 거절 → 객체 제거·외부 History entry가 생기지 않음 | EG-EDIT·입력 계약 후보. [Web clipboard ownership](../packages/json-document-web/tests/clipboard-rejection.test.ts)은 한 binding의 거절 처리 증거이며 일반적인 중첩 거절 vector는 없음 |
| Toolbar 대상 보존 | editor A에서 범위 선택 → Toolbar에 focus → Copy 실행 → A의 선택 payload | 입력 focus와 Selection 구별. 전체 Hands에 대한 공통 실행 증거 없음 |
| 셀 값과 행 구조 | 값이 있는 셀을 비움 / 해당 record 삭제 → 전자는 구조 유지, 후자는 record 제거 | EG-EDIT·profile 대상. 현재 Sheet Cut과 Database `record.delete`는 서로 다른 계약 |
| 반복 일정 영향 범위 | 같은 occurrence에 `this` / `all` 이동 → profile이 정한 반복 일정 집합만 영향 | EG-TARGET·EG-EDIT. Calendar domain 사례이며 입력 맥락 전환으로 해석하지 않음 |
| Draft 취소와 Undo | 미확정 rename draft 수정 → cancel → 확정 label 불변; 확정 rename → Undo → 이전 label | EG-GESTURE·EG-HISTORY. 구조 gesture runner가 모든 rename·IME 취소를 증명하지 않음 |
| 외부 참조·다른 profile로 Paste | 수식 또는 reference를 다른 위치·profile에 Paste → 변환·보존·거절 중 선언한 결과 | EG-PASTE. 현재 세 editor의 내부 round trip만으로 cross-profile 교환을 인증할 수 없음 |
| 공유 문서의 두 편집 맥락 | A에서 편집 → B로 입력 focus 전환 → Undo → 선택한 History owner가 명시한 기여·선택 복원 | EG-HISTORY·EG-RESULT. 외부 History 연결 증거와 모든 Hand의 입력 routing 증거는 다름 |
| Cut 쓰기 실패 후 native 처리 | editable selection에서 지원하는 Cut의 표현 쓰기 실패 → 해당 작업의 원본 제거 없음 | EG-CUT·Web. 제거 callback 미호출 외에 event 취소·후속 beforeinput/input·document·History를 관찰. 브라우저 재현 전 검증 공백 |
| IME와 Undo 수신 | 조합 완료 / 취소 / 조합 중 Undo·focus 이동 → 선언된 내용·선택·History·입력 상태 | EG-HISTORY·Web lifecycle. 합성 composition fixture와 OS IME 검증을 구별 |

기본 Undo 사례는 Rich Text에서 다른 변경이 끼어들지 않고 `ph`를 `X`로 교체하는
상황으로 구체화한다. offset은 같은 text node 안의 위치다.

| 단계 | 내용 | 선택과 History의 기대 결과 |
| --- | --- | --- |
| 시작 | `Alpha` | 정방향 `(anchor: 2, focus: 4)` 또는 역방향 `(anchor: 4, focus: 2)`으로 `ph` 선택. History 비어 있음 |
| 교체 | `AlXa` | offset 3의 collapsed caret. 한 번의 Undo 가능 |
| Undo | `Alpha` | 시작 때의 범위와 방향 복원. Undo 불가·Redo 가능 |
| Redo | `AlXa` | offset 3의 collapsed caret 복원. Undo 가능·Redo 불가 |

선택만 바꾼 뒤 Redo하는 후보는 Undo 행과 Redo 행 사이에서 caret을 옮겨 실행한다.
이 선택 이동은 별도 step이 아니며, Redo는 기록된 교체 후 선택을 복원해야 한다.
이 표는 공개 동작에 대한 기대 결과다. 새 테스트의 통과를 주장하지 않으며,
Document의 offset 하나만으로 과거 native range 전체를 복원할 수 있다고 가정하지 않는다.

기본 Profile의 역할과 Undo·선택 복원의 기본 의미는 설계에 채택한다. 입력 수신,
중첩의 진입·거절·복귀, profile 간 payload 변환과 여러 view의 History 귀속은
위 사례로 더 구체화한다. 기본값을 정하는 것과 동결을 인증하는 것은 다른 단계다.
같은 profile을 독립적으로 구현했을 때 결과가 일치하고 실제 입력 경로에서도
약속이 유지되어야 장기 호환성 증거로 승격할 수 있다.

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
