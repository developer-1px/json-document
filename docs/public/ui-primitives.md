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

## `Select`

```tsx
<Select
  label="Model"
  value={modelId}
  options={[{ id: "fast", label: "Fast" }]}
  onValueChange={setModelId}
/>
```

`options`는 `{ id, label, disabled? }` 배열입니다. `Select`는 listbox keyboard,
typeahead, active option과 trigger focus 복원을 소유합니다. Host는 value와 option
목록을 소유하며 `renderValue`, `renderOption`, `classNames`로 표현을 확장합니다.

## `Menu`

```tsx
<Menu label="Add" trigger="Add" items={items} onAction={runAction} />
```

`items`는 `{ id, label, disabled?, content? }` 배열입니다. `Menu`는 menu keyboard,
logical focus와 action 뒤 focus 복원을 소유합니다. `restoreFocusOnAction={false}`로
다음 surface가 focus를 인계받는 흐름을 선언할 수 있습니다.

## `FileDropRegion`

```tsx
<FileDropRegion onFiles={attachFiles} overlay={<DropOverlay />}>…</FileDropRegion>
```

native drag event를 파일 배열로 투영하며 drag-active overlay를 관리합니다. 파일
검증, 업로드, persistence는 `onFiles`를 구현하는 Host 책임입니다.

## `GridCell`

```tsx
<GridCell selected={selected} focus={focused}>…</GridCell>
```

`td` 속성을 그대로 받으며 `gridcell`, `aria-selected`, selection/focus data state를
일관되게 투영합니다. 좌표 topology와 selection 변경 Intent는 Host가 제공합니다.

## `ResizeHandle`

```tsx
<ResizeHandle
  label="Name 열 너비 조절"
  orientation="horizontal"
  onResize={(delta, phase) => resize(delta, phase)}
/>
```

Pointer capture lifecycle과 cursor를 소유하고 시작점 기준 `delta`를
`preview | commit` phase로 전달합니다. 최소·최대 크기와 canonical commit은 Host
정책입니다.
