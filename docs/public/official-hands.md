# Official Hands · TBD

> **TBD** — 이 페이지는 Official Hands의 제품 방향을 설명하는 초안입니다.
> 새로운 public contract, package boundary, kit admission 기준 또는
> compatibility 약속을 확정하지 않습니다.

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

문서, 목록, 표, 나무와 캔버스 편집기는 오랫동안 비슷한 행동으로
수렴했습니다. click은 선택하고, modifier-click은 선택을 토글하며, Shift는
범위를 확장합니다. Escape는 진행 중인 행동을 취소하고 undo는 변경 전
상태로 돌아갑니다.

Official은 제품 취향을 임의로 정한다는 뜻이 아닙니다. 여러 편집기에서
반복해서 검증된 기대를 기본 동작으로 제공한다는 뜻입니다.

```text
자의적인 product opinion
└─ "Kanban card에는 반드시 dueDate가 있다"

수렴한 editing opinion
├─ "Shift 선택은 범위를 확장한다"
├─ "Escape는 진행 중인 상호작용을 취소한다"
└─ "undo는 document와 Selection을 함께 복원한다"
```

대부분의 사용자는 Official Hands만으로 편집기를 완성할 수 있어야 합니다.
Custom Hands는 기본 경로가 아니라 제품에만 있는 차이를 위한 escape hatch입니다.

## 하나의 Hands Profile

완성된 Hands는 행동 함수만 모은 package가 아닙니다. 그 행동이 항상 같은
뜻을 갖게 하는 최소 profile을 함께 제공합니다.

```text
Official Hands Profile
├─ minimum schema와 canonical shape
├─ stable identity와 structural invariant
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

## 자유롭게 남겨 두는 것

Official Hands가 최소 profile을 제공해도 완성 제품을 대신 소유하지는 않습니다.

```text
Official Hands가 소유
├─ 장르다운 편집을 성립시키는 최소 shape
├─ identity와 structural invariant
├─ 수렴한 편집 행동
└─ 함께 검증된 기본 조합

Host가 소유
├─ 업무 field와 business rule
├─ permission과 workflow
├─ persistence와 collaboration policy
├─ rendering과 layout
└─ visual design
```

같은 Official Object Hands도 diagram, slide, whiteboard 또는 headless
automation에서 전혀 다르게 보일 수 있습니다. Hands는 object identity,
Selection, translate와 resize의 의미를 유지하고 Host는 표현과 제품 정책을
결정합니다.

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
| Rich Text | versioned schema, native input과 schema-aware transform |

이 후보들은 별도 Official Domain이 아닙니다. 최소 schema, Editing semantics,
Affordance와 Adapter가 사람이 작업을 끝낼 수 있는 하나의 kit로 조합되는
방식을 검토합니다.

## 열린 질문

- Official Hands로 인정할 최소 완료 증거는 무엇인가?
- 수렴한 기본 동작과 제품별 policy를 어떤 기준으로 가르는가?
- profile의 configuration과 extension은 어느 수준까지 compatibility를 약속하는가?
- minimum schema에 Host field를 연결하는 공통 방식은 무엇인가?
- 여러 Official Hands가 같은 document에서 조합될 때 identity와 History를 어떻게 공유하는가?
- Custom Hands로 내려가야 하는 명확한 신호는 무엇인가?

이 질문이 닫히기 전에는 Official Hands 후보를 완성된 SDK contract로
설명하지 않습니다.
