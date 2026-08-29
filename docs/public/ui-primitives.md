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

`@interactive-os/json-document-ui-primitives-react`는 command, toggle, choice,
navigation, disclosure, menu와 direct-manipulation primitive를 제공합니다. Host는 같은 상태와
event 경계를 만족하는 외부 구현으로 교체할 수 있습니다.

제품의 option 목록, permission, workflow, persistence와 브랜드 디자인은 이
레이어가 소유하지 않습니다. 제품은 `data-ui-*` hook을 token에 연결할 수 있지만
control의 의미·상태·focus·keyboard 계약을 다시 구현하지 않습니다.

정본 구현: `packages/json-document-ui-primitives-react/src/controls.tsx`,
`packages/json-document-ui-primitives-react/src/choice.tsx`,
`packages/json-document-ui-primitives-react/src/menu.tsx`

```sh
npm i @interactive-os/json-document-ui-primitives-react
```

## Catalog

토큰, 역할 control, shell composition, presentation, surface를 한 페이지에서
소비합니다.

```live-demo
/demo/ui-primitives
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
경로에, `listboxProps`는 Choice처럼 listbox 자체가 focus를 받는 경로에 씁니다.
Escape/Tab의 popup close와 focus restore, filtering과 option content는 Host가
합성합니다.

## Control primitives

공개 표면은 시각 형태가 아니라 사용자 역할로 고정합니다.

| 역할 | 정본 primitive | 허용 presentation |
| --- | --- | --- |
| 명령 실행 | `Command` | label, icon |
| 이진 상태 | `Toggle` | button, chip |
| 단일 값 선택 | `Choice` | inline, popup |
| 다중 포함 여부 | `Check` | checkbox |
| surface 이동 | `Tabs` | tab list |
| 내용 공개 | `DisclosureButton` | disclosure trigger |
| 값 입력 | `Field`, `ValueInput` | text/multiline, continuous/stepped |
| 검색 | `Search` | query + results |
| 일시적 제시 | `Popover`, `Dialog` | anchored, modal/sheet |

새로운 모양이 필요해도 같은 역할이면 이 표에 primitive를 추가하지 않고 기존
primitive의 presentation을 확장합니다. Radio, segmented control, select, chip,
icon button은 독립 역할이 아니므로 공개 primitive가 아닙니다.

```tsx
<Command kind="primary" onClick={save}>Save</Command>
<Toggle label="Filter ready rows" pressed={filtered} onClick={toggleFilter}>◉</Toggle>
<Command label="Copy" onClick={copy}>⧉</Command>
<Toggle pressed={compact} presentation="chip" onClick={toggleCompact}>Compact</Toggle>
<Choice presentation="inline"
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
보존합니다. `Command`는 명령 실행 역할 하나를 소유하며 label과 icon은 presentation입니다.
`Toggle`은 `pressed`를 `aria-pressed`에 투영하며 icon-only인 경우
`label`을 visible tooltip과 accessible name으로 사용합니다. `Command`도
`label`을 visible tooltip과 accessible name에 투영합니다. `Toggle`은 binary state를,
`Choice`는 single choice를, `Tabs`는 navigation surface 전환을 소유합니다.
`Choice`와 `Tabs`는 option ID generic을 callback까지
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
`ToolbarSeparator`, `ToolbarSpacer`는 action의 의미 구역과 흐름 정렬을 표현합니다.
`ToolbarLayout`과 `ToolbarRegion`은 toolbar를 start / center / end의 세 축으로
나눕니다. center는 양쪽 콘텐츠 폭과 독립된 중앙 축에 놓이므로 기간 label이나
contextual action의 폭이 변해도 핵심 탭의 위치가 이동하지 않습니다.
제품 command, copy, permission과 구역의 순서는 Host가 정합니다.

```tsx
<ProductShell
  toolbarLabel="Calendar controls"
  toolbar={(
    <ToolbarLayout>
      <ToolbarRegion placement="start" label="Navigation">…</ToolbarRegion>
      <ToolbarRegion placement="center" label="View">…</ToolbarRegion>
      <ToolbarRegion placement="end" label="Actions">
        <ContextualControls capabilities={capabilities}>…</ContextualControls>
      </ToolbarRegion>
    </ToolbarLayout>
  )}
>
  <Calendar />
</ProductShell>
```

영구 탐색은 `Toolbar` 흐름에 남고, 콘텐츠 상태에 따라 나타나는 action만
`ContextualControls`가 감쌉니다. Toolbar 전체를 contextual lifecycle에 넣지
않습니다. 순차 action 모음은 기본 `Toolbar` 흐름을, 위치가 변하면 안 되는 제품
navigation은 `ToolbarLayout`의 세 region을 사용합니다. 고정 폭 placeholder나
absolute positioning을 Host에 만들지 않습니다. size·visual variant는 shell API에 두지 않으며 제품 theme은 안정된
`data-ui-component` hook을 semantic token에 연결합니다.

[Toolbar Usage](/widgets/toolbar)는 이 공개 API를 실제 history action collection으로
소비합니다.

## `Choice`

```tsx
<Choice presentation="popup"
  label="Model"
  value={modelId}
  options={[{ id: "fast", label: "Fast" }]}
  onValueChange={setModelId}
/>
```

`options`는 `{ id, label, disabled? }` 배열입니다. `Choice`는 listbox keyboard,
typeahead, active option과 trigger focus 복원을 소유합니다. Host는 value와 option
목록을 소유하며 `renderValue`, `renderOption`, `classNames`로 표현을 확장합니다.

## `Menu`

```tsx
<Menu label="Add" trigger="Add" items={items} onAction={runAction} />
```

`items`는 `{ id, label, disabled?, content? }` 배열입니다. `Menu`는 menu keyboard,
logical focus와 action 뒤 focus 복원을 소유합니다. `restoreFocusOnAction={false}`로
다음 surface가 focus를 인계받는 흐름을 선언할 수 있습니다.

## Input and presentation roles

```tsx
<Check label="Select row" checked={selected} onCheckedChange={setSelected} />
<Field label="Title" value={title} onValueChange={setTitle} />
<Field label="Cell value" value={cell} presentation="seamless" onValueChange={setCell} />
<Search label="Search documents" query={query} onQueryChange={setQuery} results={<Results />} />
<ValueInput label="Zoom" value={zoom} min={25} max={200} presentation="continuous" onValueChange={setZoom} />
<Popover label="Formatting" open={open} onOpenChange={setOpen} trigger="Format">…</Popover>
<Dialog label="Delete document" open={confirming} onOpenChange={setConfirming}>…</Dialog>
```

`Check`는 desktop 표·목록의 다중 선택 예외, `Field`는 같은 값 입력 역할의
standard/seamless presentation, `Search`는
query와 result surface, `ValueInput`은 continuous/stepped value 역할을 각각
소유합니다. `Popover`와 `Dialog`는 anchored/modal presentation lifecycle을
소유하며 제품 copy와 contents는 Host가 제공합니다.

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

Calendar field·grid·picker와 날짜 projection은
[`@interactive-os/json-document-calendar` API](/docs/api/calendar)가 소유합니다.

생성 대기의 시각 언어는 [Animation](animation.md)이 소유합니다.
