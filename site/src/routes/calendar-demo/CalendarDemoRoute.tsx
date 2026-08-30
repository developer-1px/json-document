import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, CalendarDays, ChevronLeft, ChevronRight, Clock3, Pencil, Repeat2, Sparkles, Trash2 } from "lucide-react";
import { Temporal } from "@js-temporal/polyfill";

import {
  calendarAllDaySpan,
  calendarBusyDates,
  calendarDatePart,
  calendarDocumentCalendar,
  calendarDocumentCalendars,
  calendarInstantAt,
  calendarIntervalLastDate,
  calendarOccurrenceTopology,
  calendarRecurrenceWithFrequency,
  calendarRecurrenceWithInterval,
  calendarRecurrenceWithUntil,
  calendarShiftInstant,
  calendarVisibleEvents,
  calendarClipboardFormat,
  createCalendarEditor,
  formatCalendarInstant,
  type CalendarDocument,
  type CalendarEvent,
  type CalendarRecurrence,
  type CalendarView,
} from "@interactive-os/json-document-editing";
import { useAnchoredFloatingPosition } from "@interactive-os/json-document-react";
import { createWebClipboardSurface, createWebJSONClipboardRepresentation, isWebEditableTarget } from "@interactive-os/json-document-web";
import {
  useCalendarHand,
  useCalendarKeyboard,
  useCalendarPointerInteractions,
  useCalendarRenameInput,
  useCalendarViewportPosition,
  HtmlDateField,
  calendarCellInterval,
  calendarCells,
  calendarTimeLabel,
  calendarYearMonths,
  DateGrid,
  CalendarMonthGrid,
  CalendarTimeGrid,
  type CalendarMonthGridHandle,
  shiftVisibleDate,
  visiblePeriodLabel,
} from "@interactive-os/json-document-calendar";
import {
  Command,
  ContextualControls,
  Choice,
  ToolbarGroup,
  ToolbarLayout,
  ToolbarRegion,
  ToolbarSeparator,
  Toggle,
} from "@interactive-os/json-document-ui-primitives-react";
import { useDemoEmbed } from "../../shared/demo-workbench/DemoPage";
import { DemoSurface } from "../../shared/demo-workbench/DemoSurface";
import { ProductShell } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../shared/ui/styles";
import { CalendarDemoNavigator } from "./calendar-demo-navigator";
import { calendarSearchDefaults } from "./calendar-search";
import { calendarDemoRecipe } from "./calendar-demo-styles";
import { calendarControlAffordance } from "./calendar-control-affordances";

function event(fields: {
  readonly id: string;
  readonly title: string;
  readonly start: string;
  readonly end: string;
  readonly allDay?: boolean;
  readonly calendarId?: string;
  readonly recurrence?: CalendarRecurrence | null;
  readonly excludeDates?: ReadonlyArray<string>;
}): CalendarEvent {
  return {
    id: fields.id,
    title: fields.title,
    start: fields.start,
    end: fields.end,
    allDay: fields.allDay === true,
    calendarId: fields.calendarId ?? "work",
    recurrence: fields.recurrence ?? null,
    excludeDates: fields.excludeDates ?? [],
  };
}

const initial: CalendarDocument = {
  calendars: [
    { id: "home", title: "Home", hidden: false, color: "accent" },
    { id: "work", title: "Work", hidden: false, color: "subtle" },
  ],
  events: [
    event({
      id: "daily-news",
      title: "매일 뉴스 브리핑",
      start: "2026-05-25T09:00",
      end: "2026-05-25T09:30",
      recurrence: { freq: "daily", interval: 1, until: "2026-05-29" },
    }),
    event({ id: "weekly-usage", title: "주간 사용량 리포트 요약", start: "2026-05-25T10:00", end: "2026-05-25T10:30" }),
    event({ id: "customer-sync", title: "고객사 싱크", start: "2026-05-25T11:00", end: "2026-05-25T11:30" }),
    event({ id: "lunch-25", title: "점심", start: "2026-05-25T12:00", end: "2026-05-25T13:00" }),
    event({ id: "price-monitoring-25", title: "경쟁사 가격 모니터링", start: "2026-05-25T07:00", end: "2026-05-25T07:30" }),
    event({ id: "quarterly-sales", title: "2분기 영업 데이터 분석 리포트", start: "2026-05-26T09:30", end: "2026-05-26T10:30" }),
    event({ id: "monthly-cost", title: "월말 비용 정리", start: "2026-05-31T18:00", end: "2026-05-31T18:30", calendarId: "home" }),
    event({
      id: "holiday",
      title: "휴일",
      start: "2026-05-31",
      end: "2026-06-01",
      allDay: true,
      calendarId: "home",
    }),
  ],
};

const hourStart = 0;
const hourEnd = 24;
const workHourStart = 7;
const pxPerHour = 72;
const monthDayRows = 3;
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CalendarDemoRoute(props: {
  readonly view?: CalendarView;
  readonly visibleDate?: string;
  readonly onLocationChange?: (next: { readonly view: CalendarView; readonly date: string }) => void;
} = {}) {
  const styles = calendarDemoRecipe();
  const embedded = useDemoEmbed();
  const hoursRef = useRef<HTMLDivElement>(null);
  const monthGridRef = useRef<CalendarMonthGridHandle>(null);
  const [editor] = useState(() => {
    let sequence = 0;
    return createCalendarEditor(initial, {
      createId: () => `event-${++sequence}`,
      initialEventIds: [],
    });
  });
  const hand = useCalendarHand(editor, {
    initialOccurrence: { start: null, end: null },
    defaultTitle: "Event",
  });
  const clipboard = createWebClipboardSurface({
    codec: createWebJSONClipboardRepresentation(calendarClipboardFormat),
    read: hand.copy,
    cut: hand.cut,
    paste: hand.paste,
    onResult: () => {},
  });
  const [viewState, setViewState] = useState<CalendarView>(calendarSearchDefaults.view);
  const [visibleDateState, setVisibleDateState] = useState(calendarSearchDefaults.date);
  const scope = hand.scope;
  const setScope = hand.setScope;
  const [detailsEditing, setDetailsEditing] = useState(false);
  const pointerInteractions = useCalendarPointerInteractions(hand, {
    hourStart,
    hourEnd,
    stepMinutes: 15,
    pixelsPerHour: pxPerHour,
    onMonthPointerBegin: () => monthGridRef.current?.dismissOverflow(),
  });
  const view = props.view ?? viewState;
  const visibleDate = props.visibleDate ?? visibleDateState;
  useCalendarViewportPosition({
    viewportRef: hoursRef,
    active: !embedded && (view === "day" || view === "week"),
    resetKey: `${view}:${visibleDate}`,
    targetHour: workHourStart,
  });

  function setLocation(nextView: CalendarView, nextDate: string): void {
    props.onLocationChange?.({ view: nextView, date: nextDate });
    if (props.view === undefined) setViewState(nextView);
    if (props.visibleDate === undefined) setVisibleDateState(nextDate);
  }

  function setView(next: CalendarView): void {
    setLocation(next, visibleDate);
  }

  function setVisibleDate(next: string): void {
    setLocation(view, next);
  }

  const document = hand.document;
  const calendars = calendarDocumentCalendars(document);
  const selectedEvent = hand.selectedEvent;
  useEffect(() => setDetailsEditing(hand.renaming), [hand.renaming, selectedEvent?.id, selectedEvent?.start]);
  const eventDetailsPosition = useAnchoredFloatingPosition<HTMLDivElement, HTMLElement>({
    active: selectedEvent !== null,
    policy: {
      type: "preferred",
      placement: "right-start",
      fallbacks: ["left-start", "bottom-start", "top-start"],
    },
    offset: 8,
    boundaryPadding: 8,
  });
  const titleInput = useCalendarRenameInput(hand, {
    commitOnBlur: false,
    realizationKey: eventDetailsPosition.position?.placement ?? null,
  });
  const inspected = hand.inspectedInterval;
  const inspectedStart = inspected?.start ?? selectedEvent?.start ?? "";
  const inspectedEnd = inspected?.end ?? selectedEvent?.end ?? "";
  const visibleEvents = calendarVisibleEvents(document);
  const paintedEvents = hand.paintedEvents;
  const timeGridCells = calendarCells(view === "day" ? "day" : "week", visibleDate);
  const days = timeGridCells.map((cell) => cell.date);
  const selectionCells = view === "month" ? calendarCells("month", visibleDate) : timeGridCells;
  const selectionInterval = calendarCellInterval(selectionCells);
  const selectionTopology = selectionInterval === null
    ? { points: [] }
    : calendarOccurrenceTopology(document, selectionInterval.start, selectionInterval.end);
  const nowInstant = formatCalendarInstant(Temporal.Now.plainDateTimeISO());
  const today = calendarDatePart(nowInstant);
  const yearMonths = calendarYearMonths(visibleDate);
  const yearCellInterval = view === "year"
    ? calendarCellInterval(yearMonths.flatMap((monthStart) => calendarCells("month", monthStart)))
    : null;
  const yearBusyDates = yearCellInterval === null
    ? null
    : calendarBusyDates(paintedEvents, yearCellInterval.start, yearCellInterval.end);

  useCalendarKeyboard({
    active: !embedded,
    onView: setView,
    onShift: (direction) => setVisibleDate(shiftVisibleDate(visibleDate, view, direction)),
    onToday: () => setLocation(view === "year" ? "month" : view, today),
    onCreate: createOnVisibleDate,
    onRename: hand.beginTitleRename,
    onRemove: removeSelected,
    onUndo: hand.undo,
    onRedo: hand.redo,
    onDismiss: () => {
      return monthGridRef.current?.dismissOverflow() ?? false;
    },
  });

  function createOnVisibleDate(): void {
    const start = calendarInstantAt(calendarDatePart(visibleDate), 10 * 60);
    const end = start === null ? null : calendarShiftInstant(start, 30);
    if (start === null || end === null) return;
    hand.createInterval(start, end);
  }

  function removeSelected(): void {
    hand.removeSelected();
  }

  const applySelectedPatch = hand.applySelectedPatch;

  const timeGrid = (
    <CalendarTimeGrid
      cells={timeGridCells}
      weekdays={weekdays}
      events={paintedEvents}
      today={today}
      nowInstant={nowInstant}
      hourStart={hourStart}
      hourEnd={hourEnd}
      workHourStart={workHourStart}
      stepMinutes={15}
      defaultTimedDurationMinutes={60}
      pixelsPerHour={pxPerHour}
      fillViewport={!embedded}
      hand={hand}
      interactions={pointerInteractions}
      selectionTopology={selectionTopology}
      timeViewportRef={hoursRef}
      primaryEventRef={eventDetailsPosition.anchorRef}
      affordances={{
        allDayCell: calendarControlAffordance("allDayCell"),
        allDayEvent: calendarControlAffordance("eventAllDay"),
        eventResizeEnd: calendarControlAffordance("eventResizeEnd"),
        timeCell: calendarControlAffordance("timeCell"),
        selectedSlot: calendarControlAffordance("selectedSlot"),
        timedEvent: calendarControlAffordance("eventTimed"),
      }}
      classNames={{
        root: "min-w-[36rem]",
        rootFill: "flex min-h-0 flex-1 flex-col",
        stickyHeader: classes("grid", styles.weekSticky()),
        columnHeader: styles.weekHead(),
        weekday: ui.text.meta,
        dayNumber: styles.dayNumber(),
        today: styles.todayMark(),
        allDayLabel: classes("px-1 py-2 text-right", ui.text.meta),
        allDayCell: classes("min-h-10", styles.weekCell()),
        allDayEventContainer: "group/event relative z-10 mx-0.5 my-1",
        allDayEvent: styles.allDayEvent(),
        resizeAllDayEnd: styles.resizeEdgeVertical(),
        timeViewport: "grid",
        timeViewportFill: styles.weekHours(),
        hourGutter: "relative overflow-hidden",
        viewportAnchor: "pointer-events-none absolute left-0 top-0",
        hourLabel: styles.hourLabel(),
        timeCell: classes("overflow-hidden", styles.weekCell()),
        selectedSlot: styles.selectedSlot(),
        hourRule: styles.hourRule(),
        nowLine: styles.nowLine(),
        creationTimeHint: styles.creationTimeHint(),
        timedEventContainer: "group/event absolute z-10",
        timedEvent: styles.timedEvent(),
        eventTitle: "min-w-0 truncate",
        eventTime: styles.eventTime(),
        resizeTimedEnd: styles.resizeEdge(),
      }}
      labels={{
        grid: view === "day" ? "Day" : "Week",
        allDay: "all-day",
        now: "Now",
        resizeEnd: (event) => `Resize ${event.title} end`,
        hour: (hour) => String(hour).padStart(2, "0"),
      }}
      getEventColor={(event) => calendarColor(document, event.calendarId)}
    />
  );

  return (
    <DemoSurface>
      <div
        className="contents"
        onCopy={(event) => { if (!isWebEditableTarget(event.target)) clipboard.onCopy(event); }}
        onCut={(event) => { if (!isWebEditableTarget(event.target)) clipboard.onCut(event); }}
        onPaste={(event) => { if (!isWebEditableTarget(event.target)) clipboard.onPaste(event); }}
      >
      <ProductShell
        className={styles.shell()}
        fill={!embedded}
        canvasClassName={embedded ? "overflow-x-auto" : "overflow-hidden"}
        toolbarLabel="Calendar controls"
        toolbar={(
          <ToolbarLayout>
            <ToolbarRegion placement="start" label="Calendar navigation">
              <ToolbarGroup label="Period navigation">
                <span className={styles.period()}>{visiblePeriodLabel(view, visibleDate, {
                  monthNames: months,
                  weekSeparator: " – ",
                })}</span>
                <Command affordance={calendarControlAffordance("periodPrevious")} label="Previous" onClick={() => setVisibleDate(shiftVisibleDate(visibleDate, view, -1))}>
                  <ChevronLeft aria-hidden="true" size={16} />
                </Command>
                <Command affordance={calendarControlAffordance("periodNext")} label="Next" onClick={() => setVisibleDate(shiftVisibleDate(visibleDate, view, 1))}>
                  <ChevronRight aria-hidden="true" size={16} />
                </Command>
              </ToolbarGroup>
              <ToolbarSeparator />
              <ToolbarGroup label="Date shortcuts">
                <Command affordance={calendarControlAffordance("today")} className={styles.todayAction()} onClick={() => setLocation(view === "year" ? "month" : view, today)}>Today</Command>
              </ToolbarGroup>
            </ToolbarRegion>
            <ToolbarRegion placement="center" label="Calendar view">
              <Choice presentation="inline"
                affordance={calendarControlAffordance("viewChoice")}
                label="View"
                value={view}
                options={[
                  { id: "day", label: "Day" },
                  { id: "week", label: "Week" },
                  { id: "month", label: "Month" },
                  { id: "year", label: "Year" },
                ]}
                onValueChange={setView}
              />
            </ToolbarRegion>
            <ToolbarRegion placement="end" />
          </ToolbarLayout>
        )}
      >
        <div className="relative flex h-full min-h-0 min-w-0 flex-col">
          <div className="flex min-h-0 min-w-0 flex-1 gap-4 pb-24">
            <ContextualControls
              data-ui-affordance={calendarControlAffordance("sourceDisclosure")}
              aria-label="Calendar sources"
              tabIndex={0}
              className={styles.contextualSidebar()}
              capabilities={[{ id: "sources", phases: ["approach"] }] as const}
            >
              {(context) => context.visible.includes("sources") ? (
                <nav aria-label="Calendars" className={styles.sidebar()}>
                  <p className={ui.text.label}>Calendars</p>
                  {calendars.map((calendar) => (
                    <Toggle
                      affordance={calendarControlAffordance("sourceToggle")}
                      key={calendar.id}
                      pressed={!calendar.hidden}
                      aria-label={`Show ${calendar.title}`}
                      data-calendar-color={calendarColor(document, calendar.id)}
                      className={styles.calendarToggle()}
                      onClick={() => hand.setCalendarHidden(calendar.id, !calendar.hidden)}
                    >
                      <span
                        aria-hidden="true"
                        data-calendar-color={calendarColor(document, calendar.id)}
                        className={styles.calendarSwatch()}
                      />
                      {calendar.title}
                    </Toggle>
                  ))}
                  <CalendarDemoNavigator
                    visibleDate={visibleDate}
                    today={today}
                    events={paintedEvents}
                    onDateChange={setVisibleDate}
                  />
                </nav>
              ) : <span className={styles.sidebarHint()}>Calendars</span>}
            </ContextualControls>
            <div className={classes("min-w-0 flex-1", view === "day" || view === "week" ? "flex min-h-0 flex-col overflow-hidden" : "overflow-auto")}>
            {view === "day" || view === "week" ? timeGrid : null}
            {view === "month" ? (
              <CalendarMonthGrid
                ref={monthGridRef}
                visibleDate={visibleDate}
                today={today}
                events={paintedEvents}
                weekdays={weekdays}
                rowLimit={monthDayRows}
                hand={hand}
                interactions={pointerInteractions}
                selectionTopology={selectionTopology}
                primaryEventRef={eventDetailsPosition.anchorRef}
                affordances={{
                  dateCell: calendarControlAffordance("monthCell"),
                  event: calendarControlAffordance("eventMonth"),
                  eventResizeEnd: calendarControlAffordance("eventResizeEnd"),
                  moreDisclosure: calendarControlAffordance("moreDisclosure"),
                  overflowDate: calendarControlAffordance("overflowDate"),
                  overflowEvent: calendarControlAffordance("overflowEvent"),
                }}
                classNames={{
                  root: "min-w-[36rem]",
                  headerRow: "grid grid-cols-7",
                  header: styles.monthHead(),
                  week: styles.monthWeek(),
                  day: styles.monthDay(),
                  dayInPeriod: ui.text.body,
                  dayOutsidePeriod: ui.text.meta,
                  dayOverflow: "z-20",
                  dayNumber: styles.dayNumber(),
                  today: styles.todayMark(),
                  laneSpacer: "shrink-0",
                  moreDisclosure: classes(styles.monthMore(), ui.text.meta),
                  overflow: classes(styles.monthOverflow(), ui.surface.overlay),
                  overflowDate: classes("px-1 text-left", styles.quietAction(), ui.text.body),
                  eventContainer: "group/event relative z-10 min-w-0 w-full",
                  allDayEvent: styles.monthAllDay(),
                  timedEvent: styles.monthTimed(),
                  eventTitle: "min-w-0 truncate",
                  eventTime: styles.eventTime(),
                  resizeEnd: styles.resizeEdgeVertical(),
                }}
                labels={{
                  grid: "Month",
                  overflow: (date) => `Events on ${date}`,
                  more: (count) => `+${count} more`,
                  resizeEnd: (event) => `Resize ${event.title} end`,
                }}
                getEventColor={(event) => calendarColor(document, event.calendarId)}
                onNavigateDate={(date) => setLocation("day", date)}
              />
            ) : null}
            {view === "year" ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {yearMonths.map((monthStart, index) => (
                  <section
                    key={monthStart}
                    aria-label={visiblePeriodLabel("month", monthStart)}
                    className={styles.yearMonth()}
                  >
                    <Command
                      affordance={calendarControlAffordance("yearMonth")}
                      className={classes("text-left", styles.quietAction(), ui.text.body)}
                      onClick={() => setLocation("month", monthStart)}
                    >
                      {months[index]}
                    </Command>
                    <DateGrid
                      label={visiblePeriodLabel("month", monthStart)}
                      cells={calendarCells("month", monthStart)}
                      grain="month"
                      focusDate={monthStart}
                      today={today}
                      rowClassName="grid grid-cols-7"
                      columnHeaders={weekdays.map((name) => ({ label: name, content: name.slice(0, 1) }))}
                      columnHeaderClassName={classes("text-center", ui.text.meta)}
                      cellAffordance={calendarControlAffordance("yearDate")}
                      isDateSelected={() => false}
                      getCellClassName={({ cell, today: isToday }) => classes(
                        styles.yearDay(),
                        cell.inVisiblePeriod ? ui.text.body : ui.text.meta,
                        isToday ? styles.todayMark() : null,
                        yearBusyDates?.has(cell.date) && !isToday && styles.yearDayBusy(),
                      )}
                      onDateSelect={(date) => setLocation("day", date)}
                    />
                  </section>
                ))}
              </div>
            ) : null}
          </div>
            {selectedEvent === null ? null : (
              <ContextualControls
                selected
                editing={hand.renaming}
                capabilities={[{ id: "editor", phases: ["selected", "editing"] }] as const}
              >
                {(context) => context.visible.includes("editor") ? (
                  <section
                    ref={eventDetailsPosition.floatingRef}
                    aria-label="Event"
                    data-floating-placement={eventDetailsPosition.position?.placement}
                    data-floating-fits={eventDetailsPosition.position?.fits ? "true" : "false"}
                    data-ui-affordance={calendarControlAffordance("inspector")}
                    style={eventDetailsPosition.style}
                    className={classes(styles.inspector(), ui.surface.overlay)}
                  >
                <header className={styles.inspectorHeader()}>
                  {hand.renaming ? (
                    <input
                      ref={titleInput.ref}
                      aria-label="Title"
                      data-ui-affordance={calendarControlAffordance("titleField")}
                      className={classes(ui.field.seamless, styles.inspectorTitle())}
                      value={titleInput.value}
                      onFocus={titleInput.onFocus}
                      onChange={titleInput.onChange}
                      onBlur={titleInput.onBlur}
                      onKeyDown={titleInput.onKeyDown}
                    />
                  ) : <h2 className={styles.inspectorTitle()}>{selectedEvent.title}</h2>}
                  <div className={styles.inspectorActions()}>
                    <Command affordance={calendarControlAffordance("inspectorEdit")} label="Edit details" onClick={() => setDetailsEditing((value) => !value)}>
                      <Pencil aria-hidden="true" size={14} />
                    </Command>
                    <Command affordance={calendarControlAffordance("inspectorDelete")} kind="danger" label="Delete" onClick={removeSelected}>
                      <Trash2 aria-hidden="true" size={14} />
                    </Command>
                  </div>
                </header>
                <div className={styles.eventSummary()}>
                  <p>
                    <Clock3 aria-hidden="true" size={14} />
                    <span>
                      {calendarDatePart(inspectedStart)} · {selectedEvent.allDay
                        ? "All day"
                        : `${calendarTimeLabel(inspectedStart)}–${calendarTimeLabel(inspectedEnd)}`}
                    </span>
                  </p>
                  <p><CalendarDays aria-hidden="true" size={14} /><span>{calendarDocumentCalendar(document, selectedEvent.calendarId)?.title ?? selectedEvent.calendarId}</span></p>
                  {selectedEvent.recurrence === null ? null : (
                    <p><Repeat2 aria-hidden="true" size={14} /><span>Repeats</span></p>
                  )}
                </div>
                {detailsEditing ? <div className={styles.detailsEditor()}>
                <Toggle
                  affordance={calendarControlAffordance("allDayToggle")}
                  pressed={selectedEvent.allDay}
                  aria-label="All-day"
                  className={classes(styles.calendarToggle(), "w-auto px-0")}
                  onClick={() => applySelectedPatch({ allDay: !selectedEvent.allDay })}
                >
                  All-day
                </Toggle>
                <HtmlDateField
                  affordance={calendarControlAffordance("startField")}
                  key={selectedEvent.allDay ? "start-date" : "start-datetime"}
                  type={selectedEvent.allDay ? "date" : "datetime-local"}
                  label="Start"
                  value={inspected?.start ?? selectedEvent.start}
                  onValueChange={(value) => applySelectedPatch({ start: value })}
                />
                <HtmlDateField
                  affordance={calendarControlAffordance("endField")}
                  key={selectedEvent.allDay ? "end-date" : "end-datetime"}
                  type={selectedEvent.allDay ? "date" : "datetime-local"}
                  label="End"
                  value={selectedEvent.allDay
                    ? calendarIntervalLastDate(
                      inspected?.start ?? selectedEvent.start,
                      inspected?.end ?? selectedEvent.end,
                      true,
                    )
                    : (inspected?.end ?? selectedEvent.end)}
                  onValueChange={(value) => applySelectedPatch({
                    end: selectedEvent.allDay ? (calendarAllDaySpan(value, value)?.end ?? value) : value,
                  })}
                />
                <div className={styles.field()}>
                  <span className={ui.text.label}>Calendar</span>
                  <Choice presentation="popup"
                    affordance={calendarControlAffordance("calendarChoice")}
                    label="Calendar"
                    value={selectedEvent.calendarId}
                    options={calendars.map((calendar) => ({ id: calendar.id, label: calendar.title }))}
                    onValueChange={(value) => applySelectedPatch({ calendarId: value })}
                  />
                </div>
                <div className={styles.field()}>
                  <span className={ui.text.label}>Repeat</span>
                  <Choice presentation="popup"
                    affordance={calendarControlAffordance("recurrenceChoice")}
                    label="Repeat"
                    value={selectedEvent.recurrence?.freq ?? "none"}
                    options={[
                      { id: "none", label: "None" },
                      { id: "daily", label: "Daily" },
                      { id: "weekly", label: "Weekly" },
                      { id: "monthly", label: "Monthly" },
                      { id: "yearly", label: "Yearly" },
                    ]}
                    onValueChange={(value) => applySelectedPatch({
                      recurrence: value === "none"
                        ? null
                        : calendarRecurrenceWithFrequency(selectedEvent.recurrence, value),
                    })}
                  />
                </div>
                {selectedEvent.recurrence === null ? null : (
                  <>
                    <label className={styles.field()}>
                      <span className={ui.text.label}>Every</span>
                      <input
                        data-ui-affordance={calendarControlAffordance("recurrenceInterval")}
                        type="number"
                        min={1}
                        aria-label="Repeat every"
                        className={ui.field.control}
                        value={selectedEvent.recurrence.interval}
                        onChange={(event) => {
                          applySelectedPatch({
                            recurrence: calendarRecurrenceWithInterval(selectedEvent.recurrence, event.target.value),
                          });
                        }}
                      />
                    </label>
                    <HtmlDateField
                      affordance={calendarControlAffordance("endField")}
                      type="date"
                      label="Repeat until"
                      value={selectedEvent.recurrence.until}
                      onValueChange={(value) => applySelectedPatch({
                        recurrence: calendarRecurrenceWithUntil(selectedEvent.recurrence, value),
                      })}
                    />
                  </>
                )}
                {selectedEvent.recurrence === null ? null : (
                  <Choice presentation="inline"
                    affordance={calendarControlAffordance("recurrenceInterval")}
                    label="Edit occurrence"
                    value={scope}
                    options={[
                      { id: "this", label: "This" },
                      { id: "this-and-following", label: "Following" },
                      { id: "all", label: "All" },
                    ]}
                    onValueChange={setScope}
                  />
                )}
                </div> : null}
                  </section>
                ) : null}
              </ContextualControls>
            )}
          </div>
          <div
            className={classes(styles.composerDock(), embedded ? styles.composerDockEmbedded() : styles.composerDockFixed())}
            role="group"
            aria-label="AI Composer preview"
            aria-disabled="true"
          >
            <Sparkles aria-hidden="true" className={styles.composerSpark()} size={18} />
            <input
              data-ui-affordance={calendarControlAffordance("composerInput")}
              aria-label="Ask about your calendar"
              aria-describedby="calendar-composer-preview-note"
              className={styles.composerInput()}
              placeholder="Ask about your calendar…"
              readOnly
            />
            <span id="calendar-composer-preview-note" className="sr-only">Visual preview only. AI commands are not available in this demo.</span>
            <Command affordance={calendarControlAffordance("composerSend")} disabled label="AI commands unavailable" className={styles.composerSend()}>
              <ArrowUp aria-hidden="true" size={16} />
            </Command>
          </div>
        </div>
      </ProductShell>
      </div>
    </DemoSurface>
  );
}

function calendarColor(document: CalendarDocument, calendarId: string): "accent" | "subtle" {
  return calendarDocumentCalendar(document, calendarId)?.color === "accent" ? "accent" : "subtle";
}
