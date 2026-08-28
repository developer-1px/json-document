# @interactive-os/json-document-ui-primitives-react

Official minimalist React surfaces for common Hands. Primitives own complete
keyboard, pointer, focus, cursor, and semantic markup behavior while hosts own
product data, policy, composition, and visual extension.

Control meaning is intentionally compressed, not removed:

- `ActionButton` keeps text for flow-completing CTAs.
- `IconButton` requires an accessible label and exposes the same label as a
  visible tooltip for contextual actions.
- `ToggleButton`, `ChoiceChip`, and `SegmentedControl` preserve state and
  choice semantics without radio-button chrome.
- `Tabs` owns tab semantics and roving keyboard focus.
- `DisclosureButton` owns expanded and controlled-panel semantics.

The package emits stable `data-ui-*` hooks. Products may map those hooks to
their tokens, but must not recreate semantic, focus, or keyboard behavior.

The other public surfaces include `Select`, `Menu`, `FileDropRegion`,
`GridCell`, `ResizeHandle`, `HtmlDateField`, `CalendarGrid`, `RangeCalendar`,
`DatePicker`, and `DateRangePicker`.

`HtmlDateField` commits HTML `date`, `time`, `datetime-local`, `month`, and
`week` strings. Invalid drafts do not become the committed value. `CalendarGrid`
and `RangeCalendar` select a day or a contiguous `{ start, end }` range and
switch week, month, and year grains with arrow-key movement. `DatePicker` and
`DateRangePicker` compose those fields with a calendar; Escape discards an
uncommitted pick.

`calendarCellInterval(cells)` projects rendered calendar cells to their
exclusive-end date interval so occurrence queries use the exact visible grid.

`formatFileSize(bytes)` provides the canonical compact `B`/`KB`/`MB` display
policy for file metadata rendered by Hands.
