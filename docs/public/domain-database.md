# Database · TBD

> **TBD** — 현재 `DatabaseDocument` 구현에서 관찰한 Domain 후보입니다.

## 관찰되는 shape와 의미

```text
Database
├─ schema.properties[]
├─ records[]
└─ views[]
```

Database 후보는 typed property, record identity, cell edit와 저장된 view
topology를 UI 없이 정의합니다.

## 열린 질문

- Database의 `schema`와 Schema Domain 후보의 관계는 무엇인가?
- 저장된 view와 Host의 일시적 projection을 어디서 가르는가?
- relation, rollup과 formula는 최소 Domain에 포함되는가?
