# Object · TBD

> **TBD** — 현재 `ObjectDocument` 구현에서 관찰한 Domain 후보입니다.

## 관찰되는 shape와 의미

```text
Object
└─ objects[]
   ├─ id와 label
   ├─ x와 y
   ├─ width와 height
   └─ color
```

Object 후보는 안정 ID key family, translate, resize와 explicit Selection을
UI 없이 정의합니다. Host는 좌표를 화면에 투영하고 hit-test합니다.

## 열린 질문

- geometry가 Domain 의미인가 Host projection인가?
- rotation, grouping과 z-order의 최소 vocabulary는 무엇인가?
- 크기 제한과 snap policy는 어느 경계에 속하는가?
