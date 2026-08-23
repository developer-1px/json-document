# Official Domains · TBD

> **TBD** — 이 페이지는 Official Domain이라는 설계 관점을 이해하기 위한
> 초안입니다. 새로운 public contract, package boundary 또는 Domain admission
> 기준을 확정하지 않습니다.

JSON Document는 값과 주소, 변경, 검증과 구독의 공통 계약을 제공합니다.
그러나 그 계약만으로는 표에서 무엇이 한 칸인지, 나무에서 무엇을 고르는지,
문서에서 어떤 동작이 한 번의 편집인지 알 수 없습니다.

Official Domain은 여러 제품에서 같아야 할 장르의 최소 편집 의미를 UI와
분리해 설계하는 관점입니다. Host마다 이 의미를 다시 만들지 않게 하되,
완성된 제품의 화면과 workflow까지 대신 정의하지 않습니다.

## UI 없이 닫는 의미

Domain은 화면이 없어도 다음 질문에 답할 수 있어야 합니다.

```text
Official Domain
├─ canonical JSON shape
├─ stable identity
├─ Selection specialization
├─ Topology interpretation
├─ Intent vocabulary
├─ JSON Patch planning
├─ Clipboard representation
└─ History integration
```

예를 들어 Sheet는 행과 열의 안정 ID, 직사각형 Selection, 화면의 행·열
순서를 받는 Topology, cell commit과 fill, JSON과 TSV Clipboard를 정의할 수
있습니다. 이 계약은 React table이나 spreadsheet markup이 없어도 검증할 수
있습니다.

Domain이 opinionated하다는 것은 장르의 공통 의미를 Host마다 다시 정하지
않는다는 뜻입니다. 모든 제품 정책을 Domain에 넣는다는 뜻은 아닙니다.

## Host가 계속 소유하는 것

Host는 Domain의 의미를 제품 경험으로 표현합니다.

```text
Host
├─ rendering과 layout
├─ DOM focus와 accessibility projection
├─ geometry와 hit-test
├─ pointer·keyboard listener의 시점
├─ workflow와 business rule
├─ permission과 remote behavior
└─ product-specific command
```

같은 Object Domain도 Canvas, Slides, Diagram 또는 headless automation에서
다르게 보일 수 있습니다. Domain은 object ID와 selection, translate 같은
편집 의미를 유지하고, Host는 상자를 어떻게 그리고 어느 좌표가 눌렸는지
결정합니다.

경계의 기준은 UI의 존재 여부만이 아닙니다. UI가 바뀌어도 같은 뜻이어야
하는 것은 Domain 후보이고, 특정 제품의 화면·workflow와 함께 바뀌는 것은
Host 책임입니다.

## 제품 표면까지 조합하기

Domain은 단독으로 완성된 편집 도구가 아닙니다. 실제 제품 표면은 필요한
책임을 선택해 조합합니다.

```text
JSON Document implementation
+ Editing capabilities
+ Official Domain
+ 필요한 Adapter
+ 필요한 Connector
+ 필요한 Affordance
+ Host UI
= 사람이 작업을 끝낼 수 있는 vertical
```

이 관점에서 Hands는 새 runtime layer라기보다 한 vertical에서 선택, 변경,
Clipboard, History와 익숙한 입력이 함께 동작한다는 완료 상태에 가깝습니다.
Artifact는 그 조합이 사람이 보고 고치는 결과입니다. 이 해석도 아직 TBD이며
현재 [Hands](hands.md)와 [Concept Map](concepts.md)을 재분류하지 않습니다.

## 현재 관찰되는 후보 · 모두 TBD

현재 repository에는 다음 headless 편집 의미가 있습니다. 각 항목은 검토를
위해 이름을 붙인 후보일 뿐 Official Domain catalog로 승인되지 않았습니다.

| 후보 | UI 없이 정의하는 중심 의미 |
| --- | --- |
| Schema · TBD | JSON shape, validation vocabulary와 schema-aware operation |
| Document · TBD | 안정된 block, text point와 line-range Selection |
| Order · TBD | 한 줄 항목의 range Selection과 순서 변경 |
| Object · TBD | 안정 ID key family와 translate·resize |
| Sheet · TBD | row×column topology와 rectangular Selection |
| Tree · TBD | visible line topology와 subtree Clipboard |
| Kanban · TBD | column과 card identity, card move |
| Database · TBD | typed property, record와 저장된 view topology |
| Rich Text · TBD | versioned schema, stable node identity와 schema-aware transform |

각 후보의 상세 페이지도 같은 `TBD` 상태를 유지합니다. 후보가 공통 최소
의미를 충분히 증명했는지, package와 문서에서 어디에 위치해야 하는지는
아직 열려 있습니다.

## 열린 질문

- 어떤 장르가 Official Domain으로 들어올 수 있는가?
- Schema는 독립 Domain인가, 다른 Domain이 사용하는 capability인가?
- 여러 제품에 공통인 최소 의미와 product policy를 어디서 가르는가?
- 공통 Editing capability와 장르별 Domain의 package 배치는 어떻게 구분하는가?
- 기존 Domain 후보 중 어느 범위까지 compatibility를 약속하는가?
- Hands-complete vertical은 어떤 증거를 만족해야 하는가?
- Rich Text처럼 완성된 vertical을 Domain과 Hands 문서에서 어떻게 보여 주는가?

이 질문이 닫히기 전에는 Official Domain을 새 canonical layer나 필수 dependency로
설명하지 않습니다.
