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

`@interactive-os/json-document-ui-primitives-react`는 현재 control, selection,
disclosure, menu, select와 surface primitive를 제공합니다. Host는 같은 상태와
event 경계를 만족하는 외부 구현으로 교체할 수 있습니다.

제품의 option 목록, permission, workflow, persistence와 브랜드 디자인은 이
레이어가 소유하지 않습니다.

```sh
npm i @interactive-os/json-document-ui-primitives-react
```

## `useListbox`

```tsx
const listbox = useListbox({
  id: "command-listbox",
  label: "Commands",
  items,
  activeId,
  selectedId,
  onActiveChange: setActiveId,
  onAction: runCommand,
});

<Editor {...listbox.referenceProps} />
<div {...listbox.listboxProps}>
  {items.map((item) => <button {...listbox.optionProps(item)}>{render(item)}</button>)}
</div>
```

`useListbox`는 enabled item의 Arrow/Home/End 이동, `textValue` typeahead,
active-descendant ARIA, pointer active와 Enter/Space activation을 소유합니다.
`activeId`와 `selectedId`는 서로 독립이며 이동만으로 selection을 commit하지
않습니다. `referenceProps`는 Composer처럼 DOM focus를 외부 editor에 유지하는
경로에, `listboxProps`는 Select처럼 listbox 자체가 focus를 받는 경로에 씁니다.
Escape/Tab의 popup close와 focus restore, filtering과 option content는 Host가
합성합니다.

## Control primitives

```tsx
<ActionButton onClick={save}>Save</ActionButton>
<ToggleButton pressed={filtered} onClick={toggleFilter}>Filter</ToggleButton>
<IconButton label="Copy" onClick={copy}>□</IconButton>
<SelectableItem as="li" selected={selected} focus={focused}>Item</SelectableItem>
<DisclosureButton expanded={open} controls="details" onClick={toggle}>
  <span>Details</span>
  <span aria-hidden="true">⌄</span>
</DisclosureButton>
```

모든 button primitive는 기본 `type="button"`을 제공하고 명시적 override를
보존합니다. `ToggleButton`은 `pressed`를 `aria-pressed`에, `IconButton`은
`label`을 accessible name과 기본 tooltip에 투영합니다. `DisclosureButton`은
`expanded`와 `controls`를 disclosure ARIA에 연결하며 표현 markup은 Host가
children으로 구성합니다.

`SelectableItem`은 polymorphic element에 `selected/focus` data state와
`data-ui-control` styling slot을 제공합니다. role, ARIA selection과 roving focus는
해당 widget의 semantic primitive 또는 Web Adapter가 소유합니다. 제품별 kind,
copy와 CSS recipe도 Host 책임입니다.

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
