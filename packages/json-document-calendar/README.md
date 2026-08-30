# @interactive-os/json-document-calendar

React lifecycle for Calendar Hands over the canonical interval editor. The
package owns editor subscription, occurrence focus, normalized gesture preview,
canonical Rename and keyboard composition, and series-scope command binding. The Editing package owns
Calendar document and intent semantics, Affordance owns the input-independent
gesture lifecycle, and Web owns Pointer Events capture and coordinate
translation. Hosts keep fixtures, URL state, product copy, layout, colors, and
time-grid policy.

```tsx
const editor = createCalendarEditor(document);
const calendar = useCalendarHand(editor);

calendar.dispatch({ type: "selection.set", eventIds: [eventId] });
calendar.applySelectedPatch({ title: "Planning" });
const payload = calendar.copy();
calendar.paste(payload);
const titleInput = useCalendarRenameInput(calendar);
useCalendarKeyboard({ active: true, onView, onShift, onToday, onCreate, onRemove });
```

The Hand resolves the currently focused occurrence as the copy/cut source and
paste target. The Host selects Web representations; Calendar schema,
occurrence projection, temporal placement, selection, and history remain in
their canonical owners.

Date and time controls belong to this Calendar owner rather than the generic UI
Primitive package:

```tsx
<HtmlDateField type="date" label="Date" value={date} onValueChange={setDate} />
<CalendarGrid label="Calendar" value={date} grain={grain} visibleDate={date} onValueChange={setDate} onGrainChange={setGrain} onVisibleDateChange={setDate} />
<RangeCalendar label="Range" value={range} grain={grain} visibleDate={range.start} onValueChange={setRange} onGrainChange={setGrain} onVisibleDateChange={setVisible} />
<DatePicker label="Event date" value={date} onValueChange={setDate} />
<DateRangePicker label="Trip" value={range} onValueChange={setRange} />
```

`DateGrid` is the reusable date-cell boundary underneath complete Calendar
controls and product navigators. It keeps grid semantics, focus movement, and
selection binding canonical while allowing product-owned cell decoration:

```tsx
<DateGrid
  label="Available dates"
  cells={calendarCells("month", visibleDate)}
  grain="month"
  focusDate={value}
  today={today}
  isDateSelected={(date) => date === value}
  onDateSelect={setValue}
  onFocusDateChange={setVisibleDate}
  renderCellDecoration={({ cell }) => busyDates.has(cell.date) ? <span>•</span> : null}
/>
```

`/demo/date-controls` exercises the public controls and links their source.

`CalendarMonthGrid` is the canonical occurrence-bearing month surface. It owns
month cells, occurrence lanes, overflow, selection, creation, move, and resize
bindings. Hosts provide document state, policy values, product copy, colors,
styles, and navigation without rebuilding the month interaction surface:

```tsx
<CalendarMonthGrid
  visibleDate={visibleDate}
  today={today}
  events={hand.paintedEvents}
  weekdays={weekdays}
  rowLimit={3}
  hand={hand}
  interactions={pointerInteractions}
  selectionTopology={topology}
  affordances={affordances}
  classNames={classNames}
  labels={labels}
  getEventColor={getEventColor}
  onNavigateDate={setVisibleDate}
/>
```

`CalendarTimeGrid` is the canonical day/week interaction surface. It owns the
all-day lane, time columns, occurrence layout, selection, creation, move and
resize bindings, now marker, and creation-time hint. Hosts supply time policy,
copy, colors, classes, and the concrete Hand and pointer interactions:

```tsx
<CalendarTimeGrid
  cells={calendarCells("week", visibleDate)}
  weekdays={weekdays}
  events={hand.paintedEvents}
  today={today}
  nowInstant={nowInstant}
  hourStart={0}
  hourEnd={24}
  workHourStart={7}
  stepMinutes={15}
  defaultTimedDurationMinutes={60}
  pixelsPerHour={72}
  fillViewport
  hand={hand}
  interactions={pointerInteractions}
  selectionTopology={topology}
  affordances={affordances}
  classNames={classNames}
  labels={labels}
  getEventColor={getEventColor}
/>
```

`CalendarEventInspector` is the canonical selected-event editing surface. It
owns the summary, rename and delete lifecycle, detail fields, recurrence, and
occurrence-scope bindings. Hosts supply anchored placement and product copy,
icons, affordances, and classes through finite presentation slots:

```tsx
<CalendarEventInspector
  hand={hand}
  calendars={calendars}
  rootRef={floating.floatingRef}
  style={floating.style}
  placement={floating.position?.placement}
  fits={floating.position?.fits}
  affordances={affordances}
  classNames={classNames}
  labels={labels}
  icons={icons}
/>
```
