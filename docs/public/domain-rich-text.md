# Rich Text · TBD

> **TBD** — 현재 versioned Rich Text 구현에서 관찰한 Domain 후보이며 Official
> Domain 승인을 뜻하지 않습니다.

## 관찰되는 shape와 의미

```text
Rich Text
├─ profile
├─ doc node identity
└─ content tree
   ├─ block nodes
   ├─ inline nodes
   └─ marks
```

Rich Text 후보는 versioned vocabulary, stable node identity, structural
Selection, schema-aware transform과 Clipboard slice를 UI 없이 정의합니다.

## 열린 질문

- profile과 Schema Domain 후보의 관계는 무엇인가?
- extension node·mark의 compatibility를 어디까지 약속하는가?
- DOM normalization과 canonical transform의 경계는 어디인가?
