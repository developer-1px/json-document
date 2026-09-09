# Document Types · TBD

Document Type은 특정 JSON Document가 무엇을 의미하고 어떤 상태와 변경이
유효한지를 정의하는 생태계 위치입니다. 이 페이지는 책임 이름과 경계만
확정하며, 기존 package와 Hands의 실제 소유권 재배치는 아직 결정하지 않습니다.

```text
Document Type
├── Profile
├── Document Model
├── Schema / invariants
├── Document Operations
└── Projections
```

## 책임

Document Type은 문서 안에 존재하는 값과 관계의 어휘, 유효한 구조와 상태,
그 의미를 보존하는 변경, 다른 책임이 소비할 수 있는 projection을 소유합니다.
입력 장치와 UI를 제거해도 남는 문서 고유 규칙이 이 경계에 속합니다.

예를 들어 Calendar Document Type이라면 event와 recurrence의 모델, 시간 범위와
참조 무결성, event 이동의 의미, occurrence projection이 여기에 해당합니다.

## 이웃 책임과의 경계

```text
JSON Document
  값·주소·JSON Patch 적용과 구독

Document Type
  문서의 의미·모델·유효성·의미 연산·projection

Editing
  selection·Intent 실행·Clipboard·History 같은 편집 lifecycle

Hand
  Document Type을 사람이 실제로 편집할 수 있도록
  Editing·Adapter·Affordance·UI를 닫은 조합

Artifact
  Hand를 통해 사람이 보고 수정할 수 있는 구체적인 결과
```

Document Type은 DOM event, pointer gesture, React lifecycle, 화면 layout과 제품별
권한을 소유하지 않습니다. 각각 Adapter, Affordance, Connector, UI 또는 Host의
책임입니다.

## 정본 용어

- **Document Model**은 Document Type이 정의하는 값·entity·관계 구조입니다.
- **Schema**는 Document Model의 구조적 유효 조건입니다.
- **Profile**은 문서 인스턴스가 따르는 Document Type 계약을 식별합니다.
- **Document Operation**은 Document Type의 의미를 보존하는 변경입니다.
- **Projection**은 정본 문서를 조회나 표현에 필요한 파생 형태로 읽는 계약입니다.

`Domain`은 business bounded context와 혼동되고, `Genre`는 제품 설명과 기술 계약의
경계를 드러내지 않으므로 이 생태계 위치의 정본 이름으로 사용하지 않습니다.

## 후보 · TBD

현재 사이트에서 다음 후보의 관찰된 schema와 목표 책임을 미리 볼 수 있습니다.

| 후보 | 닫으려는 문서 의미 |
| --- | --- |
| [Rich Text · TBD](/docs/document-types/rich-text) | node·mark·text 구조와 schema-aware 연산 |
| [Order · TBD](/docs/document-types/order) | 항목 identity와 순서·이름 변경 |
| [Object · TBD](/docs/document-types/object) | 객체 identity·geometry와 의미 연산 |
| [Tree · TBD](/docs/document-types/tree) | parent/child 관계·subtree 연산·visible projection |
| [Database · TBD](/docs/document-types/database) | property·record·saved view와 projection |
| [Calendar · TBD](/docs/document-types/calendar) | event·recurrence·interval·occurrence projection |
| [Sheet · TBD](/docs/document-types/sheet) | row·column·cell identity와 구조 연산 |
| [Kanban · TBD](/docs/document-types/kanban) | column·card 관계와 이동 |
| [Annotation · TBD](/docs/document-types/annotation) | annotation shape와 geometry 연산 |

이 목록은 분류 후보이지 완료 선언이 아닙니다. 각 후보는 모델, invariant,
operation과 projection의 실제 owner를 감사한 뒤에만 이 위치로 이동할 수
있습니다. 그때까지 기존 package/API 이름, 모듈 배치와 Hands 내비게이션은
유지합니다.

## 현재와 목표 사이

현재 구현의 schema와 API는 후보를 검토할 근거입니다. 목표는 model·invariant·
operation·projection이 한 Document Type owner에서 나오고, Editing과 UI가 그
공개 계약을 소비하는 것입니다. 편집 lifecycle·DOM geometry 관찰·React 구독은
각자의 이웃 책임에 남습니다.

Calendar에는 소스 기반 책임 감사가 있으며 아직 canonical move가 남아 있습니다.
다른 후보도 이름이나 schema 표만으로 소유권 검토를 완료했다고 간주하지 않습니다.

## 완료 조건 · TBD

각 Document Type의 분류를 확정할 때는 다음 증거가 모두 필요합니다.

1. 모델과 의미 규칙을 소유하는 canonical module
2. 안정적인 public API와 owner package의 API reference
3. 공개 API를 직접 사용하는 site Usage
4. Usage와 canonical implementation을 잇는 source registration
5. 같은 책임을 구현하는 Host 또는 Demo local bypass가 없다는 감사 결과

이 증거가 닫히기 전에는 후보를 공식 Document Type으로 표시하지 않습니다.
