# UI Primitives

UI Primitives는 수렴한 Hands 행동과 표준 디자인 시스템을 함께 제공하는
minimalist React UI입니다. Host는 제품 데이터, 업무 정책, 배치와 시각적
확장을 소유하고 Primitive는 키보드, 포인터, focus, cursor와 semantic markup을
완결합니다.

```text
Affordance
    ↓
UI Primitives
    ↓
Hands
    ↓
Host
```

`@interactive-os/json-document-ui-primitives-react`는 현재 `Select`, `Menu`,
`FileDropRegion`, `GridCell`, `ResizeHandle`을 제공합니다. Host는 같은 상태와
event 경계를 만족하는 외부 구현으로 교체할 수 있습니다.

제품의 option 목록, permission, workflow, persistence와 브랜드 디자인은 이
레이어가 소유하지 않습니다.

```sh
npm i @interactive-os/json-document-ui-primitives-react
```
