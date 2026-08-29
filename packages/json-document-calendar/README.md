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

`/demo/date-controls` exercises the public controls and links their source.
