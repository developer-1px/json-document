# Hands

Hands는 사람이 artifact와 agent를 다루는 편집 도구의 최소 완성본입니다.
App도, 화면 component도, 제품 장르의 축소판도 아닙니다. 실제 제품을 끝까지
만져 보며 발견한 전형적인 인간의 손만 남깁니다.

Agent가 값을 생성하고 Viewer가 그 값을 보여 주는 것만으로는 artifact가
도구가 되지 않습니다. 사람이 고르고, 쓰고, 옮기고, 맥락을 건넬 수 있을 때
생성된 결과가 이어서 작업할 수 있는 artifact가 됩니다.

```text
Agent output + Viewer           = 볼 수 있는 결과
Agent output + Viewer + Hands   = 이어서 작업할 수 있는 artifact
```

구현이 없는 Hands는 TBD로 남깁니다. TBD는 빈 화면이 아니라 필요한 상황과
사람의 동사, host와 Hand의 경계를 먼저 적은 사용법 명세입니다. 아직 존재하지
않는 package API를 약속하지 않습니다.

## Agent에게 건네는 Hands

| Hands | 관찰한 표면 | 사람이 하는 일 |
| --- | --- | --- |
| [Composer](composer.md) | Cstar composer | 지시와 구조화된 context를 한 턴으로 구성 |
| [Mention](mention.md) | Cstar mention | 이름으로 보이는 안정적인 entity reference atom을 삽입 |

Transcript, 말풍선, think·stream·tool animation은 표현과 runtime lifecycle입니다.
Hands가 아닙니다.

## Artifact를 다루는 닫힌 Hands

| Hands | 관찰한 표면 | 사람이 하는 일 |
| --- | --- | --- |
| Document | Bear | 줄에 쓰고 옮김. Markdown caret이 전형 |
| [Order](order.md) | Linear | 한 줄 항목을 고르고 옮김 |
| [Object](object.md) | Figma | 안정 ID 객체를 평면에서 고르고 옮김 |
| Sheet | Excel | cell을 고르고 채움 |
| [Tree](tree.md) | Finder | 보이는 가지를 접고 범위를 고름 |
| Kanban | Trello | card를 열 사이로 옮김 |
| [Database](database.md) | Airtable | 같은 record를 저장된 view로 봄 |

Slides, Form, Calendar 같은 App 이름은 먼저 기존 Hands로 분해합니다. 예를 들어
Slides는 Order와 Object의 조합일 수 있습니다. 끝까지 환원되지 않는 인간의
편집 문법이 남을 때만 새 Hands 후보가 됩니다.

전체 흐름은 [Artifact](/viewer) prototype에서 봅니다. Artifact는 적절한
surface를 고르고, Hands는 사람이 만지는 방법을 제공하며, Core는 사람과
agent의 변경을 같은 계약에 남깁니다.

## Live Demo

```live-demo
/demo
```

```live-demo
/demo/sheet
```

```live-demo
/demo/kanban
```
