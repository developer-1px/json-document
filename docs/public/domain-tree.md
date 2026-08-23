# Tree · TBD

> **TBD** — 현재 `TreeDocument` 구현에서 관찰한 Domain 후보입니다.

## 관찰되는 shape와 의미

```text
Tree
└─ nodes[]
   ├─ id
   ├─ parentId
   └─ label
```

Tree 후보는 parent 관계, visible line topology, range Selection과 subtree
Clipboard를 UI 없이 정의합니다. 펼침 상태와 visible order는 Host가 제공합니다.

## 열린 질문

- fold state는 Host state인가 저장 가능한 Domain state인가?
- sibling order를 배열 순서로 표현하는 것이 충분한가?
- subtree move의 canonical Intent는 무엇인가?
