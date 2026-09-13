# Editing Protocol

Editing은 문서의 변경과 다음 선택을 하나의 작업으로 확정하고 관찰하는 계약입니다.
현재 TypeScript API의 공통 흐름을 설명하며, 모든 Hands를 하나의 editor
interface로 통합하거나 새로운 wire protocol을 정의하지 않습니다.

## 입력에서 관찰까지

```text
플랫폼 입력
  → Adapter: 플랫폼 사실을 해석
  → Affordance: 조작 의미와 진행 상태
  → 장르 editor의 Intent
      + Document Type의 의미 연산
      + Selection / Topology
  → EditingPlan
  → EditingSession.apply
  → JSONDocument.commit
  → EditingResult / EditingSnapshot
  → Connector / UI
```

이 그림은 편집을 실행하는 대표 경로입니다. headless 호출은 입력 Adapter가
필요하지 않고, Connector가 반드시 마지막 단계에만 있는 것도 아닙니다.
문서의 유효한 연산은 Document Type의 책임이며, 현재 각 editor에 놓인 책임의
재배치는 [Document Types · TBD](document-types.md)에서 구분합니다.

## 경계를 건너는 계약

| 계약 | 담는 것 | 소유자 |
| --- | --- | --- |
| Intent | 사용자가 요청한 편집의 의미와 대상 | 장르별 Editing API |
| `EditingPlan` | `operations`, `selectionAfter`, `origin`, 선택적인 `history`·`historyGroup` | Editing |
| `JSONDocument.commit` | JSON Patch의 검증과 원자적 적용 | JSON Document의 로컬 또는 협업 구현 |
| `EditingResult` | 성공한 자기 작업의 snapshot/change 또는 `ok: false`·`code` | Editing |
| `EditingSnapshot` | `value`, `selection`, `revision`, `canUndo`, `canRedo` | Editing |

작업 거절은 해당 요청의 문서·선택·History를 바꾸지 않습니다. 구독 중 재진입해
다음 작업이 실행돼도 반환 결과는 자신의 전이에 속합니다. `revision`은 문서
commit 횟수가 아니라 편집 상태의 전이입니다.

구체 시그니처는 [Editing API](../../packages/json-document-editing/docs/api-reference.md), 사용법은
[Intent guide](intent-guide.md)와 [Intent](intent.md)에서 봅니다.

## 값을 바꾸지 않는 경로

- Selection만 바꾸면 document commit과 local Undo 항목이 생기지 않습니다.
- Copy는 읽기입니다. 원본·선택·History를 바꾸지 않습니다.
- Cut은 표현 쓰기와 제거를, Paste는 표현 해석과 의미 연산을 연결합니다.
  지원 표현과 실패 조건은 해당 [Clipboard](clipboard.md)와 editor의 계약을 따릅니다.
- 외부 변경은 그 문서에 맞는 선택 복구를 거칩니다. 복구 실패를 이미 완료된
  document commit의 취소로 바꾸지 않습니다.

## History의 소유자

| 구성 | 복원 의미 | 안내 |
| --- | --- | --- |
| 로컬 inverse History | 기록한 문서 변경과 전후 선택을 복원하며, 실제 외부 변경 뒤 오래된 기록을 무효화 | [Local History](history.md) |
| actor-local 협업 History | 다른 참여자의 변경을 보존하고 현재 참여자의 기여를 선택적으로 되돌림 | [Collaborative History](collaboration-history.md) |

협업 document를 주입했다고 로컬 inverse History가 협업 History가 되지는 않습니다.
협업 History owner를 연결하고 그 owner의 기록·그룹·복원 정책을 따릅니다.
현재 외부 History API가 지원하지 않는 `history: "ignore"`는 비어 있지 않은
operations에 대해 mutation 전에 거절합니다.

## Hands Profile · TBD

EditingSession의 공통 의미는 현재 계약입니다. 반면 각 Hands의 필수 작업,
여러 선택 범위의 처리, 기본 입력 정책, 중첩 편집의 수신자와 공유 History 단위는
전체 Profile로 아직 동결하지 않았습니다.

목표는 같은 지원 입력과 Intent에서 같은 문서·선택·실패·복원 의미를 얻는 것입니다.
이를 위해 각 Profile에 지원/의도적 미지원/미구현을 나누고, 입력부터 Undo/Redo까지의
적합성 증거를 연결해야 합니다. 현재 API를 호출할 수 있다는 사실만으로 이 목표가
완료되지는 않습니다. [Official Hands · TBD](official-hands.md)에 남은 경계와
완료 조건을 정리합니다.
