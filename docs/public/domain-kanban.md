# Kanban · TBD

> **TBD** — 현재 `KanbanDocument` 구현에서 관찰한 Domain 후보입니다.

## 관찰되는 shape와 의미

```text
Kanban
├─ columns[]: id, title, cardIds[]
└─ cards[]: id, title
```

Kanban 후보는 column과 card identity, column 안의 순서와 card move를 UI 없이
정의합니다.

## 열린 질문

- Kanban은 독립 Domain인가 Order와 Object의 조합인가?
- card가 한 column에만 속한다는 무결성을 누가 보장하는가?
- swimlane과 WIP limit는 Domain인가 product policy인가?
