# Concepts

Quickstart에서는 JSON을 읽고, 변경을 적용하고, 결과를 구독했습니다. 제품에서는
같은 문서를 로컬에서만 쓰거나 여러 replica가 함께 편집할 수 있고, 그 위에
사용자 작업과 외부 도구를 조합할 수 있습니다.

json-document의 중심은 구현 package가 아니라 `JSONDocument` 계약입니다. Local
implementation과 Collaboration Engine은 같은 계약을 제공하고, Editing은 어느
구현인지 알 필요 없이 그 계약을 사용합니다. Connector와 Adapter는 이 공개
계약을 외부 생태계와 platform 경계에 연결하고 Product Host가 최종 화면과
정책을 조립합니다.

```txt
JSON Standards
└── JSON Document Contract
    ├── Runtime implementations
    │   ├── Local JSON Document
    │   └── Collaboration Engine
    │       ├── Replica & synchronization
    │       ├── Collaborative History
    │       ├── Collaborative Text
    │       └── Lifecycle
    │           └── checkpoint · restore · epoch · compaction
    ├── Editing
    │   ├── Intent & Session
    │   ├── Selection & Topology
    │   ├── Clipboard
    │   ├── Editing History
    │   └── Domain Editors
    │       └── Document · Sheet · Database · Tree · Object · Order
    └── Integration boundaries
        ├── Connectors
        └── Adapters
            └── Collaborative Contenteditable Adapter

Product Host composes these surfaces.
```

## JSON Document가 값을 다룬다

모든 편집은 현재 JSON에서 시작합니다. `JSONDocument`는 값을 읽고, 위치를
찾고, JSON Patch를 검사해 적용합니다. 적용된 변경은 구독자에게 전달합니다.

이 책임을 작게 유지하면 같은 문서를 카드 화면과 표, 저장소가 함께 사용할
수 있습니다. 각 화면은 서로 다른 방식으로 보여 주더라도 변경의 주소와
순서는 같은 형식으로 읽습니다.

`JSONDocument`는 구현을 숨기는 port이기도 합니다. Local implementation은 한
process의 현재 값을 관리하고, Collaboration Engine은 causal Change를
materialize하면서 같은 여섯 member를 제공합니다. 로컬에서 협업으로 바뀌어도
Editing과 Connector가 받는 document 계약은 달라지지 않습니다.

## Collaboration Engine이 같은 계약을 제공한다

Collaboration Engine은 Connector가 아닙니다. Authored Patch를 causal Change로
기록하고 replica 사이에서 bundle을 교환해 같은 JSON document value로
수렴시키는 runtime implementation입니다. `runtime.document`는 일반
`JSONDocument`이고, Change DAG, pending Change, conflict 같은 협업 상태는
`runtime.replica`에 남습니다.

Collaboration의 선택 기능은 같은 축 안에서 확장됩니다.

- **Replica와 synchronization**: Change dependency, bundle export/ingest와
  replica status를 다룹니다.
- **Collaborative History**: 다른 actor의 값을 역으로 덮어쓰지 않고 현재
  actor의 contribution을 선택적으로 undo/redo합니다.
- **Collaborative Text**: string leaf를 text atom과 text splice로 편집하고
  `capture → plan → commit` lifecycle을 제공합니다.
- **Lifecycle**: checkpoint, restore, membership, epoch와 compaction으로 장기
  causal state의 경계를 관리합니다.

[Collaboration](collaboration.md)에서 runtime과 replica의 경계를 이어서 볼 수
있습니다.

## Editing이 사용자 작업을 더한다

Editing을 시작할 때 현재 JSON으로 editor를 만듭니다. 화면은 클릭이나 키
입력을 사용자의 요청인 Intent로 바꾸고 `editor.dispatch`에 넘깁니다. editor는
현재 문서와 편집 상태를 읽어 요청을 처리하고 결과를 돌려줍니다.

사용자가 블록이나 셀을 고르는 Intent를 보내면 editor는 현재 대상을
Selection에 기억합니다. Selection은 JSON 옆에 있으므로 위치를 옮기는
것만으로는 문서 변경이나 실행 취소 기록이 생기지 않습니다.

Shift 키로 범위를 늘리거나 표의 여러 셀을 복사하려면 화면에 보이는 순서도
알아야 합니다. 정렬과 필터를 거친 행·열의 순서를 나타내는 값이
Topology입니다. Selection과 복사 기능은 같은 Topology를 읽어 같은 범위를
사용합니다.

선택한 내용을 다른 위치로 옮기려면 JSON과 사람이 읽을 수 있는 텍스트를
함께 보관합니다. 이 구조화된 값이 Clipboard payload입니다. 복사는 payload만
만들고, 잘라내기와 붙여넣기는 문서에 변경을 적용합니다.

문서 값이 바뀌면 Editing은 적용된 patch와 그때의 Selection을 기록합니다.
Editing History는 이 기록을 사용해 값과 선택을 함께 되돌리거나 다시
적용합니다. 이는 actor contribution을 다루는 Collaborative History와 다른
개념입니다.

Editing은 여섯 domain editor를 같은 lifecycle 위에 둡니다.

| Domain Editor | 주된 구조 |
| --- | --- |
| Document | 순서가 있는 block |
| Sheet | 행과 열의 cell |
| Database | typed property, record와 saved view |
| Tree | 계층 node와 visible order |
| Object | stable ID를 가진 자유 배치 object |
| Order | 순서가 있는 item |

## Connector와 Adapter가 외부 경계를 연결한다

Editing까지 조합하면 화면과 독립된 편집 동작이 완성됩니다. 제품에서는 이
동작을 React로 렌더링하거나 Zod와 Ajv로 값을 검사할 수 있습니다.

Connector는 외부 도구의 입력과 출력을 json-document의 공개 API에 맞게
번역합니다. 예를 들어 React Connector는 document 변경을 React의 구독
방식으로 전달합니다. TanStack Table Connector는 화면에 보이는 행과 열을
Sheet의 Topology로 바꿉니다. Web Connector는 브라우저의 복사와 붙여넣기를
Editing의 copy, cut, paste에 연결합니다.

Connector가 외부 의존성을 맡으면 JSON Document와 Editing의 API는 사용하는
UI 도구나 실행 환경이 달라져도 유지됩니다. 제품은 필요한 Connector만
골라 기존 도구와 조합할 수 있습니다.

Adapter는 특정 platform/model 경계를 번역합니다. 예를 들어 collaborative
contenteditable adapter는 Collaborative Text와 한 DOM root를 연결하고 native
input 동안 model-to-DOM rendering만 유예합니다. 외부 생태계의 공식 package
분류인 Connector와 DOM Adapter는 같은 개념이 아니므로 공개 site에서도
Connectors와 Adapters를 별도 섹션으로 탐색합니다.

마지막으로 Product Host가 rendering, focus, keyboard, transport, persistence,
presence와 제품별 의미를 선택해 이 표면들을 조립합니다.

이제 Editing의 각 개념을 실제 입력과 결과로 연결합니다.

- [Intent guide](intent-guide.md): editor를 만들고 요청을 보내는 진입점
- [Selection](selection.md): 편집 대상과 선택 상태
- [Topology](topology.md): 화면에 보이는 순서와 범위
- [Clipboard](clipboard.md): 선택한 데이터의 복사, 잘라내기와 붙여넣기
- [History](history.md): 값과 선택을 함께 되돌리는 기록
- [Collaboration](collaboration.md): 같은 JSON Document 계약을 제공하는 causal runtime
- [Connectors](connectors.md): 외부 생태계와 공개 계약의 연결
- [Collaborative Contenteditable Adapter](adapter-contenteditable.md): Collaborative Text와 DOM input lifecycle의 연결
