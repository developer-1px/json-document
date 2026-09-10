# Concept Map

목표는 같은 역할과 책임이 하나의 정본 모듈을 갖고, Application이 그 공개 API를
조합하는 구조입니다. 아래는 읽기 순서와 책임 지도입니다. 모든 package가 차례로
의존하는 직렬 계층은 아닙니다.

```text
Foundation
├─ JSON Document ─ value / at / query / validatePatch / commit / subscribe
│  └─ Local 또는 Collaboration 구현
├─ Document Types ─ model / schema / invariants / operations / projections
│  └─ 후보별 owner 수렴과 계약 확정 · TBD
└─ Editing ─ Selection / Topology / Intent / Clipboard / History

Building Blocks
├─ Adapter ─ 플랫폼 입력·출력
├─ Connector ─ 이름 있는 외부 생태계
├─ Affordance ─ 조작 의미·수명주기
└─ UI Primitives ─ 재사용 UI

Hands ─ 장르별로 함께 검증된 편집 조합
└─ Official Hands Profile의 완성 조건 · TBD

Artifact ─ Application 안에서 사람이 다루는 콘텐츠
└─ 현재 visual prototype의 문서·Hands 계약 연결 · TBD

Applications ─ 조합·실행 순서·제품 정책·layout·외부 인스턴스 주입
```

Adapter와 Connector는 서로의 선행 계층이 아닙니다. 필요한 플랫폼과 생태계를
독립적으로 선택합니다. Collaboration도 Editing 앞이나 뒤의 필수 단계가 아니라
같은 `JSONDocument` 계약의 다른 구현입니다.

## Foundation의 프로토콜

[Foundation](foundation.md)은 값·의미·작업·관찰의 경계를 설명합니다.

| 경계 | 현재 계약 | 목표와 남은 일 |
| --- | --- | --- |
| JSON Document | 여섯 member와 JSON 표준 연산; Core v3 Stable | UI·장르별 edit verb를 Core에 추가하지 않음 |
| Document Type | 의미·모델·유효성·연산·Projection이라는 책임 경계 | 후보별 canonical owner와 공개 계약의 수렴 · TBD |
| Editing | Intent → EditingPlan → Session.apply → commit → EditingSnapshot | Hands별 필수 행동과 조합 적합성의 동결 · TBD |
| Collaboration | 같은 document 계약과 base → History → Text profile | 각 profile의 지원 범위로 사용; 모든 Hands의 협업 보장과 구별 |

[JSON Document Protocol](api.md)과 [Editing Protocol](editing.md)에서 실제 경계를
건너는 값을 봅니다. Copy는 읽기이고 선택만 바꾸는 작업에는 document commit이
필요하지 않습니다. 로컬 inverse History와 actor-local 협업 History는 이름이
같아도 복원 의미와 소유자가 다릅니다.

## Document Types · TBD

Document Type은 특정 JSON Document가 무엇을 의미하고 어떤 상태와 변경이
유효한지를 정의합니다. Profile, Document Model, Schema와 invariant,
Document Operation, Projection이 이 책임에 속합니다.

현재 Rich Text·Order·Object·Tree·Database·Calendar·Sheet·Kanban·Annotation은
분류 후보입니다. [Document Types](document-types.md)에서 현재 관찰된 schema,
소유권 감사와 완료 조건을 봅니다. 이름이 등록됐다고 package 재배치가 완료된
것은 아닙니다. 같은 Calendar라도 Document Type, Hand와 Application은 다른 책임입니다.

## Building Blocks

[Building Blocks](building-blocks.md)는 서로 독립적인 네 책임을 제공합니다.

| 위치 | 소유하는 것 | 안내 |
| --- | --- | --- |
| Adapter | keyboard·clipboard·native input 같은 플랫폼 계약의 번역 | [Adapter](adapters.md) |
| Connector | React·Zod·Ajv·TanStack Table·A2UI 같은 외부 계약의 연결 | [Connector](connectors.md) |
| Affordance | 선택·drag·resize·취소 같은 조작 의미와 수명주기 | [Affordance](affordance.md) |
| UI Primitives | 표준 control·focus·overlay와 반복 UI 행동 | [UI Primitives](ui-primitives.md) |

예를 들어 Contenteditable Adapter는 JSON Document와 DOM lifecycle을 직접
연결할 수 있습니다. 모든 Adapter가 Editing을 거쳐야 한다는 뜻은 아닙니다.
외부 생태계를 교체해도 문서 고유 의미를 Connector에서 다시 정의하지 않습니다.

## Hands

Hands는 장르의 문서와 Intent, Selection/Clipboard/History, 대표 Affordance,
platform lifecycle을 실제 편집 경험으로 닫은 조합입니다. 하나의 공통 superclass나
만능 package 이름이 아닙니다.

[Hands](hands.md)의 Live Demo와 owner API는 현재 구현의 증거입니다.
[Official Hands · TBD](official-hands.md)는 디자인과 제품 정책은 열어 두고
기본 편집을 완성된 SDK로 제공하려는 목표입니다. 구현이 있는 것과 Profile의
지원 입력·실패·선택 복원·호환성 조건이 모두 닫힌 것은 구별합니다.

## Artifact · TBD

Artifact는 navigation과 workflow를 소유하지 않는 Application 내부 콘텐츠입니다.
서로 다른 Hands를 사용해도 같은 문서·편집 계약으로 사람이 보고 고칠 수 있어야 합니다.

현재 [Artifact](/viewer)는 MD·PPT·Sheet surface를 한 Host chrome에 놓는 visual
prototype입니다. JSON Document/Hands 연결, 편집 후 복원과 파일 호환성의 증거는
아직 없습니다. 모양을 전환할 수 있다는 사실을 상호운용이나 완성된 편집의
증거로 세지 않습니다.

## Applications

Application은 Artifact와 Hands를 실제 제품 경험으로 조합합니다. 실행 순서,
URL과 navigation, 권한·copy·fixture·layout과 concrete runtime 연결을 소유합니다.
모델·의미 연산·selection·history·gesture·플랫폼 번역·projection·재사용 UI는
각 canonical module의 책임입니다. 한 제품에서만 쓰여도 이 경계는 같습니다.

[Calendar와 AI Agent](applications.md)는 현재 제품에서 드러난 조합을 보여 줍니다.
읽기 순서는 Foundation에서 Application으로 가지만, 책임을 발견하는 작업은
Application에서 시작해 정본 API를 만들고 제품이 다시 소비하는 순환입니다.
이 과정은 [How We Build](how-we-build.md)에 있습니다.

## Reference vertical: Rich Text

Rich Text는 새 최상위 계층이 아니라 이 책임 지도를 적용한 대표 vertical입니다.
문서 의미와 Editing 위에 Web Adapter, React Connector, 장르별 UI를 조합합니다.
현재 profile·적합성·browser 증거는 다른 Hands가 경계를 판단할 때 참고할 수 있지만
모든 Document Type과 Hands의 완료를 대신하지는 않습니다.
