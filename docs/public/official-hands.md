# Official Hands · TBD

Official Hands의 목표와 남은 경계를 설명하는 초안입니다. 새로운 public contract,
package boundary, kit admission 기준 또는 compatibility 약속을 확정하지 않습니다.

Official Hands는 디자인과 제품 데이터는 자유롭게 바꿀 수 있지만, 사람이
편집을 끝내는 데 필요한 기능은 이미 구현되어 있는 SDK를 지향합니다.

```text
Bring your own
├─ product data
├─ business rule
├─ workflow
└─ visual design

Get from Official Hands
├─ selection
├─ keyboard와 pointer behavior
├─ clipboard
├─ drag와 resize
├─ undo와 redo
└─ 함께 동작하는 편집 계약
```

## 왜 Official인가

문서, 목록, 표, 나무와 캔버스 편집기는 오랫동안 선택, 복사, 붙여넣기,
실행 취소 같은 행동을 공유해 왔습니다. 선택만 바꾸면 내용은 유지되고,
범위 확장은 기준점을 보존하며, 편집은 내용과 다음 작업 위치를 함께 정합니다.

Official은 제품 취향을 임의로 정한다는 뜻이 아닙니다. 여러 편집기에서
반복해서 검증된 기대를 기본 동작으로 제공한다는 뜻입니다.

공통 규칙과 입력 관습은 구별합니다. 범위를 확장한다는 의미는 Selection에
있고, Shift+click을 그 의미에 연결하는 일은 Adapter와 Affordance에 있습니다.
포커스가 이동할 때 선택도 바꿀지, 전체 선택 상태에서 Mod+A를 다시 누르면
선택을 해제할지는 사용하는 편집 방식이 정합니다.

대부분의 사용자는 Official Hands만으로 편집기를 완성할 수 있어야 합니다.
Custom Hands는 기본 경로가 아니라 제품에만 있는 차이를 위한 escape hatch입니다.

## Hands Profile · TBD

완성된 Hands는 행동 함수만 모은 package가 아닙니다. 그 행동이 항상 같은
뜻을 갖게 하는 최소 profile을 함께 제공합니다.

```text
Official Hands Profile
├─ Document Type Profile 참조: schema · identity · invariant
├─ Selection specialization
├─ Topology interpretation
├─ Intent vocabulary
├─ JSON Patch planning
├─ Clipboard representation
├─ History transaction
└─ Affordance composition
```

예를 들어 Official Sheet Hands가 직사각형 선택과 cell commit을 완성하려면
row identity, column identity와 cell addressability를 먼저 정해야 합니다.
이 최소 schema는 특정 업무 제품의 field를 강제하기 위한 것이 아니라,
Sheet다운 편집 행동이 무엇을 대상으로 하는지 안정적으로 정하기 위해
필요합니다.

최소 schema와 의미 연산의 owner는 [Document Type](document-types.md)입니다.
Hands Profile은 이 계약을 참조하고 Editing·Adapter·Affordance·Connector·UI를
함께 선택합니다. Hands가 각 책임을 다시 구현하거나 Host가 빈칸을 메우는 구조가
아닙니다.

### 공통 규칙과 profile의 선택

공통 편집 규칙은 Selection과 Editing이 소유합니다. Profile은 그 규칙이 자신의
문서에서 무엇을 대상으로 하며 어떤 결과를 만드는지 결정합니다. 다음 표는 현재
구현을 이해하기 위한 예입니다.

| 작업 | Document | Sheet | Rich Text |
| --- | --- | --- | --- |
| Copy 대상 | 선택된 블록 전체 | primary 직사각형 | 선택된 텍스트와 구조 |
| Paste 위치 | 기본적으로 마지막 선택 블록 뒤 | focus 셀부터 | 선택 구간에 적용 |
| Cut의 제거 | 선택 블록 제거 | primary 직사각형의 셀 값 비우기 | 선택 구간 제거 |

같은 Copy라도 무엇을 복사하는지는 profile의 약속입니다. 사용자는 각 profile에서
지원하는 작업, 여러 선택 범위의 처리, 붙여넣기 경계, 작업 후 선택 위치와 Undo
단위를 알 수 있어야 합니다. 작업 자체의 미지원과 현재 선택 때문에 실행할 수 없는
상태도 구별합니다.

이 구분은 새로운 공통 editor interface를 요구하지 않습니다. 기존 editor API와
Selection family, EditingSession을 사용하면서 입력부터 편집 결과까지 같은 의미를
유지하는 조합을 지향합니다.

## 자유롭게 남겨 두는 것

Official Hands가 최소 profile을 제공해도 완성 제품을 대신 소유하지는 않습니다.

```text
Official Hands Profile이 연결
├─ Document Type의 shape·identity·invariant
├─ Editing의 Selection·Intent·Clipboard·History
├─ Adapter·Affordance·Connector·UI의 편집 경로
└─ 함께 검증할 지원 범위와 기본 조합

Host가 소유
├─ 제품별 정책 값·권한·copy·fixture
├─ workflow와 실행 순서
├─ persistence·collaboration의 구체 인스턴스 주입
├─ UI composition과 layout
└─ visual design
```

같은 Official Object Hands도 diagram, slide, whiteboard 또는 headless
automation에서 전혀 다르게 보일 수 있습니다. Hands는 object identity,
Selection, translate와 resize의 의미를 유지하고 Host는 표현과 제품 정책을
결정합니다.

재사용 가능한 업무 모델·규칙과 rendering 행동은 각각 문서 의미와 UI의 정본
모듈에 둡니다. 제품에서 선택하는 정책 값과 모듈 자체의 의미를 구별합니다.

## Affordance까지 닫기

Editing capability만으로는 사람이 작업을 끝낼 수 없습니다. Official Hands는
수렴한 Affordance와 platform Adapter가 실제 Intent로 이어지는 경로까지
검증해야 합니다.

```text
Host data와 UI
      │
      ▼
Official Hands Profile
├─ Editing capability
├─ Affordance vocabulary
└─ 필요한 Adapter contract
      │
      ▼
JSON Document transaction
```

Affordance는 제품 타입을 직접 알지 않습니다. `DragAffordance`가
`KanbanCard`를 이동하는 대신, 선택된 대상을 Host와 Hands가 합의한 move
Intent로 연결합니다. 따라서 같은 drag timing과 cancellation을 여러 Hands가
공유할 수 있습니다.

## 도입과 확장의 순서

사용자가 처음부터 모든 capability를 조립하도록 요구하지 않습니다.

```text
Official Hands
      │ 대부분은 그대로 사용
      ▼
configure
      │ optional behavior와 policy 연결
      ▼
extend
      │ product-specific Intent와 field 추가
      ▼
Custom Hands
      └─ Official profile로 표현할 수 없는 고유 편집 문법
```

Core는 어떤 Hands도 강제하지 않습니다. 사용자가 Official Hands를 선택하는
순간에만 해당 profile의 opinion을 채택합니다.

## 관찰되는 kit 후보

현재 repository의 구현은 다음 Official Hands 후보가 어느 정도까지 닫힐 수
있는지 보여 주는 증거입니다. 이 목록은 catalog 승인이나 완성도 선언이
아닙니다.

| 후보 | 닫으려는 기본 편집 경험 |
| --- | --- |
| Document | block identity, text edit, move, Clipboard와 History |
| Order | line topology, range Selection, rename과 reorder |
| Object | key Selection, translate, resize와 structured Clipboard |
| Sheet | grid topology, rectangular Selection, commit과 fill |
| Tree | visible topology, fold, range Selection과 subtree Clipboard |
| Kanban | column·card identity와 card move |
| Database | typed property, record edit와 saved view projection |
| Calendar | interval events, day/week timed span, all-day band, month day-move, year overview |
| Rich Text | versioned schema, native input과 schema-aware transform |

이 후보들은 별도 Official Domain이 아닙니다. 최소 schema, Editing semantics,
Affordance와 Adapter가 사람이 작업을 끝낼 수 있는 하나의 kit로 조합되는
방식을 검토합니다.

## 사용자가 기대할 계약

Official profile의 지향점은 구현이 바뀌어도 같은 지원 입력에서 같은 편집 의미를
얻는 것입니다. 선택하고, 편집하고, 복사하고, 되돌리는 전체 흐름이 그 약속에
포함됩니다. Keyboard나 pointer로 실행해도 해당 editor를 직접 호출해도 같은
편집 의도는 같은 문서와 Selection의 결과로 이어져야 합니다.

구체적인 profile별 필수 작업, Host field 연결, 여러 Hand가 공유하는 History
단위는 아직 확정하지 않았습니다. 현재 후보 목록과 위 동작 예시는 완성된 SDK의
호환성 보장이 아닙니다.

## 현재 증거와 완료 조건 · TBD

| 경계 | 현재 있는 것 | 완료에 필요한 것 |
| --- | --- | --- |
| 문서 의미 | 각 editor와 package의 모델·연산 | Document Type owner와 Profile 참조의 수렴 |
| 편집 작업 | 기존 Intent와 EditingSession 공통 의미 | Profile별 지원/의도적 미지원/미구현 및 결과·실패 조건 |
| 실제 입력 | Hands Live Demo와 platform binding | keyboard·pointer·Clipboard·취소·Undo/Redo가 이어지는 적합성 증거 |
| 공개 사용 | package API와 Usage·Source | Host의 같은 책임 우회 구현 없이 조합되는 완료 경로 |
| 호환성 | 개별 구현과 Profile의 증거 | 기본값·중첩 맥락·공유 History와 변경 정책의 명시 |

이 조건을 닫기 전에는 Official Hands를 완성된 SDK나 모든 장르가 상호운용하는
Stable 계약으로 표시하지 않습니다. 목표를 미리 드러내되 현재 동작의 증거와
미확정 설계를 섞지 않습니다.
