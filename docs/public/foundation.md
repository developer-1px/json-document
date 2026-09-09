# Foundation

Foundation은 Application, Artifact와 Hands가 공유하는 기반 계약입니다.
값의 변경, 문서의 의미, 편집 작업과 협업을 서로 다른 책임으로 구분합니다.

## JSON Document Protocol

`JSONDocument`는 `value`, `at`, `query`, `validatePatch`, `commit`,
`subscribe`의 여섯 member를 제공합니다. 주소는 JSON Pointer, 검색은 JSONPath,
변경은 JSON Patch로 표현합니다. Core v3의 Stable 계약이며 화면과 장르별
편집 기능을 포함하지 않습니다. [JSON Document Protocol](api.md)에서 호출과
실패·관찰 의미를 봅니다.

## Document Types · TBD

Document Type은 문서 고유의 모델·schema·invariant·의미 연산·Projection을
소유합니다. 예를 들어 Calendar의 recurrence와 occurrence는 제품의 layout이나
일시적인 selection과 다른 책임입니다.

[Document Types · TBD](document-types.md)는 목표 위치와 후보를 드러냅니다.
현재 package에서 이 책임을 어디가 소유하는지 확인하고 API·Usage·Source와
소비자를 닫기 전에는 재배치 완료를 선언하지 않습니다.

## Editing Protocol

[Editing Protocol](editing.md)은 Intent에서 변경 계획과 다음 선택을 만들고
`EditingSession.apply`로 적용한 뒤 `EditingSnapshot`을 관찰하는 경계입니다.
Selection, Topology, Clipboard와 History는 문서의 의미 모델과 구별합니다.

현재 EditingSession의 공통 의미와 모든 Hands Profile의 완성은 다릅니다.
지원 행동·기본 입력·조합 적합성이 아직 닫히지 않은 범위는
[Official Hands · TBD](official-hands.md)로 남습니다.

## Collaboration

[Collaboration](collaboration.md)은 같은 `JSONDocument` 계약의 다른 구현입니다.
base, History, Text는 선택적인 profile 포함 관계이며 새로운 UI 계층이 아닙니다.
협업 document를 Editing에 주입할 때도 actor-local History의 소유권과 복원 의미를
유지해야 합니다.

플랫폼과 생태계 연결은 [Building Blocks](building-blocks.md), 전체 목표와 현재
상태의 차이는 [Concept Map](concepts.md)에서 이어집니다.
