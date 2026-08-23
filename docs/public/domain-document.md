# Document · TBD

> **TBD** — 현재 `BlockDocument` 구현에서 관찰한 Domain 후보입니다.

## 관찰되는 shape와 의미

```text
Document
└─ blocks[]
   ├─ id: stable identity
   └─ text: editable value
```

Document 후보는 block identity, text point, line-range Selection, block 단위
Intent와 Clipboard를 UI 없이 정의합니다.

## 열린 질문

- block의 최소 속성은 `id`와 `text`로 충분한가?
- inline structure는 Document인가 Rich Text인가?
- block 종류와 product metadata는 Host가 소유하는가?
