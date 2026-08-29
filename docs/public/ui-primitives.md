# UI Primitives

UI Primitives는 수렴한 Hands 행동과 표준 디자인 시스템을 함께 제공하는
minimalist React UI입니다. 여기서 minimalist는 장식을 줄이는 취향이 아니라,
역할·상태·키보드·focus·feedback을 잃지 않는 최소 표현 계약입니다. Host는 제품
데이터, 업무 정책, copy와 배치를 소유하고 Primitive는 키보드, 포인터, focus,
cursor, semantic markup과 안정된 styling hook을 완결합니다.

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
레이어가 소유하지 않습니다. 제품은 `data-ui-*` hook을 token에 연결할 수 있지만
control의 의미·상태·focus·keyboard 계약을 다시 구현하지 않습니다.

정본 구현: `packages/json-document-ui-primitives-react/src/controls.tsx`,
`packages/json-document-ui-primitives-react/src/menu.tsx`

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
<ActionButton kind="primary" onClick={save}>Save</ActionButton>
<ToggleButton label="Filter ready rows" pressed={filtered} onClick={toggleFilter}>◉</ToggleButton>
<IconButton label="Copy" onClick={copy}>⧉</IconButton>
<ChoiceChip selected={density === "compact"} onClick={compact}>Compact</ChoiceChip>
<SegmentedControl
  label="View"
  value={view}
  options={[{ id: "canvas", label: "Canvas" }, { id: "json", label: "JSON" }]}
  onValueChange={setView}
/>
<Tabs
  label="Inspector values"
  value={tab}
  options={[{ id: "document", label: "Document" }, { id: "selection", label: "Selection" }]}
  onValueChange={setTab}
  tabId={(id) => `tab-${id}`}
  panelId={(id) => `panel-${id}`}
/>
<SelectableItem as="li" selected={selected} focus={focused}>Item</SelectableItem>
<DisclosureButton expanded={open} controls="details" onClick={toggle}>
  <span>Details</span>
  <span aria-hidden="true">⌄</span>
</DisclosureButton>
```

모든 button primitive는 기본 `type="button"`을 제공하고 명시적 override를
보존합니다. `ActionButton`은 흐름을 진행하거나 완료하는 text CTA입니다.
`ToggleButton`은 `pressed`를 `aria-pressed`에 투영하며 icon-only인 경우
`label`을 visible tooltip과 accessible name으로 사용합니다. `IconButton`도
`label`을 visible tooltip과 accessible name에 투영합니다. `ChoiceChip`은 선택을
radio chrome 없이 표시하고 `SegmentedControl`과 `Tabs`는 단일 선택 및 roving
keyboard focus를 소유합니다. 두 control은 option ID generic을 callback까지
보존하므로 Host는 선택 값을 다시 cast하지 않습니다. `DisclosureButton`은
`expanded`와 `controls`를 disclosure ARIA에 연결하며 표현 markup은 Host가
children으로 구성합니다.

`SelectableItem`은 polymorphic element에 `selected/focus` data state와
`data-ui-control` styling slot을 제공합니다. role, ARIA selection과 roving focus는
해당 widget의 semantic primitive 또는 Web Adapter가 소유합니다. 제품별 copy와
brand token은 Host 책임이지만 최소 hit target, focus-visible, disabled/pressed와
tooltip 가시성은 UI Primitive styling hook의 불변식입니다.

## Product shell and toolbar

제품 surface는 control을 임의의 flex row에 놓지 않고 같은 shell·toolbar 문법으로
조립합니다. `ProductShell`은 toolbar, canvas, inspector의 위치를 소유하고,
`Toolbar`는 접근 가능한 action collection을 제공합니다. `ToolbarGroup`,
`ToolbarSeparator`, `ToolbarSpacer`는 action의 의미 구역과 정렬을 표현합니다.
제품 command, copy, permission과 구역의 순서는 Host가 정합니다.

```tsx
<ProductShell
  toolbarLabel="Calendar controls"
  toolbar={(
    <>
      <ToolbarGroup label="Period navigation">…</ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup label="View">…</ToolbarGroup>
      <ToolbarSpacer />
      <ContextualControls capabilities={capabilities}>…</ContextualControls>
    </>
  )}
>
  <Calendar />
</ProductShell>
```

영구 탐색은 `ProductToolbar` 흐름에 남고, 콘텐츠 상태에 따라 나타나는 action만
`ContextualControls`가 감쌉니다. Toolbar 전체를 contextual lifecycle에 넣지
않습니다. size·visual variant는 shell API에 두지 않으며 제품 theme은 안정된
`data-ui-component` hook을 semantic token에 연결합니다.

[Toolbar Usage](/widgets/toolbar)는 이 공개 API를 실제 history action collection으로
소비합니다.

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

## Date and time controls

HTML이 이름 붙인 날짜·시간 값과 APG 캘린더 격자를 Primitive가 닫습니다.
필드는 유효한 문자열만 commit하고, 잘못된 draft는 이전 값으로 돌아갑니다.

```ts
<HtmlDateField type="date" label="Date" value={date} onValueChange={setDate} />
<HtmlDateField type="time" label="Time" value={time} onValueChange={setTime} />
<HtmlDateField type="datetime-local" label="DateTime" value={dateTime} onValueChange={setDateTime} />
<HtmlDateField type="month" label="Month" value={month} onValueChange={setMonth} />
<HtmlDateField type="week" label="Week" value={week} onValueChange={setWeek} />
<CalendarGrid label="Calendar" value={date} grain={grain} visibleDate={date} onValueChange={setDate} onGrainChange={setGrain} onVisibleDateChange={setDate} />
<RangeCalendar label="Range" value={range} grain={grain} visibleDate={range.start} onValueChange={setRange} onGrainChange={setGrain} onVisibleDateChange={setVisible} />
<DatePicker label="Event date" value={date} onValueChange={setDate} />
<DateRangePicker label="Trip" value={range} onValueChange={setRange} />
```

`date`는 `YYYY-MM-DD`, `time`은 `HH:mm`, `datetime-local`은 `YYYY-MM-DDTHH:mm`,
`month`는 `YYYY-MM`, `week`는 `YYYY-Www`입니다. Calendar와 RangeCalendar는
주·월·연 입자를 바꾸고 화살표로 날을 옮깁니다. DatePicker와 DateRangePicker는
필드와 격자가 같은 commit 값을 쓰며 Escape는 확정하지 않은 선택을 버립니다.

```live-demo
/demo/date-controls
```

생성 대기의 시각 언어는 [Animation](animation.md)이 소유합니다.
