# Schema · TBD

> **TBD** — Schema가 독립 Official Domain인지, 다른 Domain이 사용하는
> capability인지는 아직 결정하지 않았습니다.

## 관찰되는 의미

Schema는 JSON shape와 validation vocabulary를 제공하고, 변경을 채택하기 전에
값이 계약을 만족하는지 판단합니다. 현재 repository에서는 JSON Document의
validation contract와 Ajv·Zod Connector가 이 역할의 일부를 보여 줍니다.

## Domain 후보라면 소유할 것

```text
Schema candidate
├─ schema identity와 version
├─ JSON shape vocabulary
├─ validation result와 issue address
├─ schema-aware operation constraint
└─ schema evolution과 compatibility
```

## 열린 질문

- Schema는 장르인가, 공통 Editing capability인가?
- validator library와 독립적인 canonical vocabulary가 필요한가?
- migration과 compatibility를 Domain이 어디까지 소유하는가?
