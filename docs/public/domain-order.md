# Order · TBD

> **TBD** — 현재 `OrderDocument` 구현에서 관찰한 Domain 후보입니다.

## 관찰되는 shape와 의미

```text
Order
└─ items[]
   ├─ id: stable identity
   └─ label: editable value
```

Order 후보는 한 줄 항목의 순서, range Selection, rename과 Clipboard를 UI 없이
정의합니다.

## 열린 질문

- 단순 순서와 list semantics를 어디서 구분하는가?
- reorder Intent가 Official vocabulary에 포함되어야 하는가?
- item의 부가 데이터는 Domain과 Host 중 누가 소유하는가?
