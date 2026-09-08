# Foundation

Foundation은 Application, Artifact와 Hands가 공유하는 기반 계약입니다. 화면이나
제품 장르보다 먼저 값의 의미, 변경, 편집 상태와 협업 방식을 정의합니다.

## JSON Document

표의 셀과 문서의 블록은 생김새가 달라도 JSON 안에서 주소를 가집니다. 한 위치는
JSON Pointer로 가리키고 여러 위치는 JSONPath로 찾으며, 변경은 JSON Patch로
표현합니다. `JSONDocument`는 현재 값을 읽고, 찾고, 검증하고, 원자적으로 적용하고,
실제로 달라진 결과를 구독자에게 전달하는 공통 계약입니다.

## Document Types

Rich Text, Calendar, Database 같은 Document Type은 Foundation 위에서 데이터의
의미와 유효한 구조를 정의합니다. 같은 이름을 쓰는 Hand나 Application과는 별도
책임이며, 제품 화면이나 navigation을 소유하지 않습니다.

## Editing

선택, 보이는 순서, clipboard와 history처럼 편집하는 동안만 필요한 상태는 문서 값
옆에 둡니다. 화면 사건은 Intent가 되고 Editing은 현재 문서와 편집 상태를 읽어
처리합니다.

## Collaboration

협업은 다음 UI 계층이 아니라 같은 `JSONDocument` 계약의 다른 구현입니다. 여러
참여자의 변경을 인과 순서로 수렴시키면서도 Foundation의 읽기·변경·구독 진입점을
유지합니다.

다음으로 플랫폼과 생태계 연결을 고르려면 [Building Blocks](adapters.md)를,
전체 개념 관계를 먼저 보려면 [Concept Map](concepts.md)을 읽습니다.
