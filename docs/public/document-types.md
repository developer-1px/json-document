# Document Types · TBD

Document Type은 특정 JSON Document가 무엇을 의미하고 어떤 상태와 변경이
유효한지를 정의하는 생태계 위치입니다. 이 페이지는 책임 이름과 경계만
확정합니다. Calendar와 Object는 공개 소유자와 소비 경계를 확정했고, 나머지 후보의 실제
소유권 재배치는 아직 결정하지 않았습니다.

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

## 현재 소유자와 후보

Calendar의 정본 소유자는 `@interactive-os/json-document-calendar-document`입니다.
모델·검증·의미 연산·projection은 이 package에, 선택·Clipboard·History는 Editing에,
입력과 UI 조합은 Calendar Hands에 둡니다. Editing의 기존 문서 관련 export는
동일 구현을 가리키는 호환 경로입니다.

[Calendar Document Type](/docs/document-types/calendar)에서 공개 API, Usage/Source와
책임 감사 증거를 확인할 수 있습니다. 이 소유권 확정은 RC 계약을 Stable wire
프로파일로 승격하거나 나머지 후보의 완료를 선언하지 않습니다.

Object와 단일 슬라이드 Canvas 프로파일의 정본 소유자는
`@interactive-os/json-document-object-document`입니다. 기존 `createObjectEditor`가 이를
소비하며 `@interactive-os/json-document-canvas` Hand가 두 Canvas Host의 입력·UI를
닫습니다. [Object 소유권 감사](/docs/document-types/object)와 [Canvas Usage/Source](/docs/api/canvas)를 참고하세요.

위의 후보별 상태는 저장소의 소유권 감사 등록을 읽습니다.

Markdown은 원문 문자열을 JSONDocument에 저장하는 별도의 실험입니다.
`@interactive-os/json-document-markdown`이 문법의 source 위치 projection을 소유하고,
Editing이 문자열 선택·이력을, Markdown Web과 contenteditable이 DOM·native 입력을
소유합니다. Rich Text 모델로 변환하지 않습니다. [Markdown API](/docs/api/markdown)와
[caret Usage](/demo/markdown-caret)에서 제목·강조·목록·인용·체크 항목의 원문 편집과 커서·선택 범위를 확인합니다.



Calendar·Object 이외의 목록은 분류 후보이지 완료 선언이 아닙니다. 각 후보는 모델, invariant,
operation과 projection의 실제 owner를 감사한 뒤에만 이 위치로 이동할 수
있습니다. 그때까지 기존 package/API 이름, 모듈 배치와 Hands 내비게이션은
유지합니다.

## 현재와 목표 사이

현재 구현의 schema와 API는 후보를 검토할 근거입니다. 목표는 model·invariant·
operation·projection이 한 Document Type owner에서 나오고, Editing과 UI가 그
공개 계약을 소비하는 것입니다. 편집 lifecycle·DOM geometry 관찰·React 구독은
각자의 이웃 책임에 남습니다.

Calendar와 Object는 공개 소유자와 소스 기반 책임 감사를 연결했습니다.
다른 후보도 이름이나 schema 표만으로 소유권 검토를 완료했다고 간주하지 않습니다.

## 완료 조건 · TBD

각 Document Type의 분류를 확정할 때는 다음 증거가 모두 필요합니다.

1. 모델과 의미 규칙을 소유하는 canonical module
2. 안정적인 public API와 owner package의 API reference
3. 공개 API를 직접 사용하는 site Usage
4. Usage와 canonical implementation을 잇는 source registration
5. 같은 책임을 구현하는 Host 또는 Demo local bypass가 없다는 감사 결과

이 증거가 닫히기 전에는 후보를 공식 Document Type으로 표시하지 않습니다.
