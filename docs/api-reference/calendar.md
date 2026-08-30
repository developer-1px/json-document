# @interactive-os/json-document-calendar API

**Owner:** Hands

Calendar React lifecycle와 occurrence interaction 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-calendar/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `addCalendarDays`

```ts
addCalendarDays(date: string, days: number): string
```
## `addCalendarMonths`

```ts
addCalendarMonths(date: string, months: number): string
```
## `addCalendarYears`

```ts
addCalendarYears(date: string, years: number): string
```
## `CalendarCell`

```ts
type CalendarCell = {
  readonly date: string;
  readonly day: number;
  readonly inVisiblePeriod: boolean;
  readonly weekday: number;
};
```
## `calendarCellInterval`

```ts
calendarCellInterval(cells: ReadonlyArray<CalendarCell>): CalendarCellInterval | null
```
## `CalendarCellInterval`

```ts
type CalendarCellInterval = { readonly start: string; readonly end: string };
```
## `calendarCells`

```ts
calendarCells(period: CalendarPeriod, visibleDate: string): ReadonlyArray<CalendarCell>
```
## `calendarEventLabel`

```ts
calendarEventLabel(event: CalendarEventLabelValue): string
```
## `CalendarEventLabelValue`

```ts
type CalendarEventLabelValue = {
  readonly title: string;
  readonly start: string;
  readonly allDay: boolean;
};
```
## `CalendarGrain`

```ts
type CalendarGrain = "week" | "month" | "year";
```
## `CalendarGrid`

```ts
CalendarGrid(props: { readonly label: string; readonly value: string | null; readonly grain: CalendarGrain; readonly visibleDate: string; readonly onValueChange: (value: string) => void; readonly onGrainChange: (grain: CalendarGrain) => void; readonly onVisibleDateChange: (date: string) => void; readonly commitOnArrow?: boolean; }): ReactNode
```
## `CalendarHand`

```ts
interface CalendarHand {
  readonly snapshot: CalendarEditor["snapshot"];
  readonly document: CalendarDocument;
  readonly selectedEvent: CalendarEvent | null;
  readonly selectedOccurrences: ReadonlyArray<CalendarOccurrenceSelection>;
  readonly inspectedInterval: { readonly start: string; readonly end: string } | null;
  readonly occurrence: CalendarOccurrenceRange;
  readonly scope: OccurrenceScope;
  readonly renaming: boolean;
  readonly titleDraft: string;
  readonly paintedEvents: ReadonlyArray<CalendarEvent>;
  readonly timePreview: CalendarTimeGridPointerRelease | null;
  readonly allDayPreview: CalendarAllDayPointerRelease | null;
  readonly monthPreview: CalendarMonthPointerRelease | null;
  readonly selectionDragPreview: CalendarSelectionDragPreview | null;
  setScope(scope: OccurrenceScope): void;
  setOccurrence(occurrence: CalendarOccurrenceRange): void;
  setTitleDraft(title: string): void;
  beginTitleRename(eventId?: string): void;
  commitTitleRename(): void;
  cancelTitleRename(): void;
  handleTitleRenameKey(key: string): boolean;
  setTimePreview(preview: CalendarTimeGridPointerRelease | null): void;
  setAllDayPreview(preview: CalendarAllDayPointerRelease | null): void;
  setMonthPreview(preview: CalendarMonthPointerRelease | null): void;
  prepareSelectionDrag(eventId: string, occurrenceStart: string): CalendarSelectionDragSource | null;
  previewSelectionDrag(preview: CalendarSelectionDragPreview | null): void;
  commitSelectionDrag(preview: CalendarSelectionDragPreview): boolean;
  dispatch(intent: CalendarIntent | null): boolean;
  commitIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange): boolean;
  rememberIntent(intent: CalendarIntent | null, origin: CalendarOccurrenceRange): void;
  applySelectedPatch(patch: CalendarEventPatch): boolean;
  createInterval(start: string, end: string, options?: { readonly allDay?: boolean; readonly title?: string }): boolean;
  isOccurrenceSelected(eventId: string, occurrenceStart: string): boolean;
  isPrimaryOccurrence(eventId: string, occurrenceStart: string): boolean;
  selectOccurrence(
    eventId: string,
    start: string,
    end: string,
    mode?: "replace" | "extend" | "toggle",
    topology?: CalendarOccurrenceTopologySnapshot,
  ): boolean;
  removeSelected(): boolean;
  setCalendarHidden(calendarId: string, hidden: boolean): boolean;
  rememberSelection(): void;
  undo(): void;
  redo(): void;
  copy(): CalendarClipboard | null;
  cut(): EditingResult<CalendarSelection> | null;
  paste(clipboard: CalendarClipboard): EditingResult<CalendarSelection>;
}
```
## `CalendarHandOptions`

```ts
type CalendarHandOptions = {
  readonly initialOccurrence?: CalendarOccurrenceRange;
  readonly defaultTitle?: string;
};
```
## `CalendarKeyboardOptions`

```ts
interface CalendarKeyboardOptions {
  readonly active: boolean;
  readonly target?: CalendarKeyboardTarget;
  readonly onView: (view: CalendarView) => void;
  readonly onShift: (direction: 1 | -1) => void;
  readonly onToday: () => void;
  readonly onCreate: () => void;
  readonly onRename: () => void;
  readonly onRemove: () => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly onDismiss?: () => boolean;
}
```
## `CalendarKeyboardTarget`

```ts
interface CalendarKeyboardTarget {
  addEventListener(type: "keydown", listener: (event: KeyboardEvent) => void): void;
  removeEventListener(type: "keydown", listener: (event: KeyboardEvent) => void): void;
}
```
## `CalendarMonthGrid`

```ts
CalendarMonthGrid(props: CalendarMonthGridProps & React.RefAttributes<CalendarMonthGridHandle>): ReactNode
```
## `CalendarMonthGridAffordances`

```ts
interface CalendarMonthGridAffordances {
  readonly dateCell: ControlAffordance;
  readonly event: ControlAffordance;
  readonly eventResizeEnd: ControlAffordance;
  readonly moreDisclosure: ControlAffordance;
  readonly overflowDate: ControlAffordance;
  readonly overflowEvent: ControlAffordance;
}
```
## `CalendarMonthGridClassNames`

```ts
interface CalendarMonthGridClassNames {
  readonly root?: string;
  readonly headerRow?: string;
  readonly header?: string;
  readonly week?: string;
  readonly day?: string;
  readonly dayInPeriod?: string;
  readonly dayOutsidePeriod?: string;
  readonly dayOverflow?: string;
  readonly dayNumber?: string;
  readonly today?: string;
  readonly laneSpacer?: string;
  readonly moreDisclosure?: string;
  readonly overflow?: string;
  readonly overflowDate?: string;
  readonly overflowEventContainer?: string;
  readonly eventContainer?: string;
  readonly allDayEvent?: string;
  readonly timedEvent?: string;
  readonly eventTitle?: string;
  readonly eventTime?: string;
  readonly resizeEnd?: string;
}
```
## `CalendarMonthGridHandle`

```ts
interface CalendarMonthGridHandle {
  dismissOverflow(): boolean;
}
```
## `CalendarMonthGridLabels`

```ts
interface CalendarMonthGridLabels {
  readonly grid: string;
  overflow(date: string): string;
  more(count: number): string;
  resizeEnd(event: CalendarEvent): string;
}
```
## `CalendarMonthGridProps`

```ts
interface CalendarMonthGridProps {
  readonly visibleDate: string;
  readonly today: string;
  readonly events: ReadonlyArray<CalendarEvent>;
  readonly weekdays: ReadonlyArray<string>;
  readonly rowLimit: number;
  readonly hand: CalendarHand;
  readonly interactions: CalendarPointerInteractions;
  readonly selectionTopology: CalendarOccurrenceTopologySnapshot;
  readonly affordances: CalendarMonthGridAffordances;
  readonly classNames: CalendarMonthGridClassNames;
  readonly labels: CalendarMonthGridLabels;
  readonly primaryEventRef?: Ref<HTMLDivElement>;
  readonly getEventColor: (event: CalendarEvent) => string;
  readonly onNavigateDate: (date: string) => void;
}
```
## `calendarMonthWeeks`

```ts
calendarMonthWeeks(visibleDate: string): ReadonlyArray<ReadonlyArray<CalendarCell>>
```
## `CalendarPeriod`

```ts
type CalendarPeriod = "day" | CalendarGrain;
```
## `CalendarPointerInteractions`

```ts
interface CalendarPointerInteractions {
  readonly hoveredTime: { readonly day: string; readonly instant: string; readonly minutes: number } | null;
  instantAt(day: string, clientY: number, grid: Element): string | null;
  timePointerDown(event: PointerEvent<HTMLElement>, day: string, id: string | null, start: string | null, end: string | null, handle: CalendarTimeGridHandle | null): void;
  timePointerMove(event: PointerEvent<HTMLElement>): void;
  timePointerUp(event: PointerEvent<HTMLElement>): void;
  clearTimeHover(): void;
  consumeEventClick(): boolean;
  consumeEventDoubleClick(): boolean;
  allDayPointerDown(event: PointerEvent<HTMLElement>, day: string, id: string | null, start: string | null, end: string | null, handle: "body" | "start" | "end" | null): void;
  allDayPointerMove(event: PointerEvent<HTMLElement>): void;
  allDayPointerUp(event: PointerEvent<HTMLElement>): void;
  monthPointerDown(event: PointerEvent<HTMLElement>, day: string, rowDays: ReadonlyArray<string>, id: string | null, start: string | null, end: string | null): void;
  monthPointerMove(event: PointerEvent<HTMLElement>): void;
  monthPointerUp(event: PointerEvent<HTMLElement>): void;
  cancelTimePointer(pointerId: number, reason?: "cancel" | "lost-capture"): void;
  cancelAllDayPointer(pointerId: number, reason?: "cancel" | "lost-capture"): void;
  cancelMonthPointer(pointerId: number, reason?: "cancel" | "lost-capture"): void;
  resizeTimed(id: string, edge: "start" | "end", occurrenceStart: string, origin: string, delta: number, phase: Phase): void;
  resizeAllDay(id: string, edge: "start" | "end", originDay: string, occurrenceStart: string, delta: number, phase: Phase): void;
}
```
## `CalendarPointerPolicy`

```ts
type CalendarPointerPolicy = {
  readonly hourStart: number;
  readonly hourEnd: number;
  readonly stepMinutes: number;
  readonly pixelsPerHour: number;
  readonly onMonthPointerBegin?: () => void;
};
```
## `CalendarRenameInputBinding`

```ts
interface CalendarRenameInputBinding {
  readonly ref: RefObject<HTMLInputElement | null>;
  readonly value: string;
  onFocus(): void;
  onChange(event: ChangeEvent<HTMLInputElement>): void;
  onBlur(event: FocusEvent<HTMLInputElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLInputElement>): void;
}
```
## `CalendarRenameInputOptions`

```ts
interface CalendarRenameInputOptions {
  /** Commit when focus leaves the title. Disable inside a larger contextual editor. */
  readonly commitOnBlur?: boolean;
  /** Retries focus realization when an enclosing positioned editor becomes interactive. */
  readonly realizationKey?: string | number | boolean | null;
}
```
## `CalendarSelectionDragPreview`

```ts
interface CalendarSelectionDragPreview {
  readonly source: CalendarSelectionDragSource;
  readonly target: CalendarSelectionMoveTarget;
}
```
## `calendarTimeLabel`

```ts
calendarTimeLabel(value: string): string
```
## `CalendarViewportPositionOptions`

```ts
interface CalendarViewportPositionOptions {
  readonly viewportRef: RefObject<HTMLElement | null>;
  readonly active: boolean;
  readonly resetKey: string;
  readonly targetHour: number;
  readonly viewportOffset?: number;
}
```
## `calendarYearMonths`

```ts
calendarYearMonths(visibleDate: string): ReadonlyArray<string>
```
## `DateGrid`

```ts
DateGrid(props: DateGridProps): ReactNode
```
## `DateGridCellRenderProps`

```ts
interface DateGridCellRenderProps {
  readonly cell: CalendarCell;
  readonly selected: boolean;
  readonly focused: boolean;
  readonly today: boolean;
}
```
## `DateGridColumnHeader`

```ts
interface DateGridColumnHeader {
  readonly label: string;
  readonly content: ReactNode;
}
```
## `DateGridProps`

```ts
interface DateGridProps {
  readonly label: string;
  readonly cells: ReadonlyArray<CalendarCell>;
  readonly grain: CalendarGrain;
  readonly focusDate: string;
  readonly today?: string;
  readonly className?: string;
  readonly rowClassName?: string;
  readonly columnHeaders?: ReadonlyArray<DateGridColumnHeader>;
  readonly columnHeaderClassName?: string;
  readonly cellAffordance?: ControlAffordance;
  readonly isDateSelected: (date: string) => boolean;
  readonly onDateSelect: (date: string) => void;
  readonly onFocusDateChange?: (date: string) => void;
  readonly onDateMove?: (date: string) => void;
  readonly getCellClassName?: (props: DateGridCellRenderProps) => string | undefined;
  readonly renderCellDecoration?: (props: DateGridCellRenderProps) => ReactNode;
}
```
## `DatePicker`

```ts
DatePicker(props: { readonly label: string; readonly value: string; readonly onValueChange: (value: string) => void; }): ReactNode
```
## `DateRangePicker`

```ts
DateRangePicker(props: { readonly label: string; readonly value: DateRangeValue; readonly onValueChange: (value: DateRangeValue) => void; }): ReactNode
```
## `DateRangeValue`

```ts
type DateRangeValue = { readonly start: string; readonly end: string };
```
## `HtmlDateField`

```ts
HtmlDateField(props: { readonly type: HtmlDateType; readonly label: string; readonly value: string; readonly onValueChange: (value: string) => void; readonly affordance?: ControlAffordance; }): ReactNode
```
## `HtmlDateType`

```ts
type HtmlDateType = "date" | "time" | "datetime-local" | "month" | "week";
```
## `parseHtmlDateValue`

```ts
parseHtmlDateValue(type: HtmlDateType, value: string): string | null
```
## `RangeCalendar`

```ts
RangeCalendar(props: { readonly label: string; readonly value: DateRangeValue | null; readonly grain: CalendarGrain; readonly visibleDate: string; readonly onValueChange: (value: DateRangeValue) => void; readonly onGrainChange: (grain: CalendarGrain) => void; readonly onVisibleDateChange: (date: string) => void; readonly commitOnArrow?: boolean; }): ReactNode
```
## `shiftVisibleDate`

```ts
shiftVisibleDate(visibleDate: string, period: CalendarPeriod, direction: 1 | -1): string
```
## `startOfIsoWeek`

```ts
startOfIsoWeek(date: string): string
```
## `startOfYear`

```ts
startOfYear(date: string): string
```
## `useCalendarHand`

```ts
useCalendarHand(editor: CalendarEditor, options?: CalendarHandOptions): CalendarHand
```
## `useCalendarKeyboard`

```ts
useCalendarKeyboard(options: CalendarKeyboardOptions): void
```
## `useCalendarPointerInteractions`

```ts
useCalendarPointerInteractions(hand: CalendarHand, policy: CalendarPointerPolicy): CalendarPointerInteractions
```
## `useCalendarRenameInput`

```ts
useCalendarRenameInput(hand: CalendarHand, options?: CalendarRenameInputOptions): CalendarRenameInputBinding
```
## `useCalendarViewportPosition`

```ts
useCalendarViewportPosition(options: CalendarViewportPositionOptions): void
```
## `visiblePeriodLabel`

```ts
visiblePeriodLabel(period: CalendarPeriod, visibleDate: string, options?: VisiblePeriodLabelOptions): string
```
## `VisiblePeriodLabelOptions`

```ts
type VisiblePeriodLabelOptions = {
  readonly monthNames?: ReadonlyArray<string>;
  readonly weekSeparator?: string;
};
```
