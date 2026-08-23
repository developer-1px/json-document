# Sheet · TBD

> **TBD** — 현재 `SheetDocument` 구현에서 관찰한 Domain 후보입니다.

## 관찰되는 shape와 의미

```text
Sheet
├─ columns[]: id와 label
└─ rows[]
   ├─ id
   └─ cells: column id → JSON value
```

Sheet 후보는 row×column topology, rectangular Selection, cell commit과 fill,
JSON·TSV Clipboard를 UI 없이 정의합니다.

## 열린 질문

- formula와 computed cell은 최소 Domain에 포함되는가?
- 정렬·필터 결과는 Host topology인가 저장된 view인가?
- cell type은 Schema와 Sheet 중 누가 소유하는가?
