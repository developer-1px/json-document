import { useRef, useState, type ReactNode } from "react";
import { ArrowUp, CalendarDays, ChevronLeft, ChevronRight, Clock3, Pencil, Repeat2, Sparkles, Trash2 } from "lucide-react";
import { Temporal } from "@js-temporal/polyfill";

import {
  calendarBusyDates,
  calendarDatePart,
  calendarDocumentCalendar,
  calendarDocumentCalendars,
  calendarInstantAt,
  calendarOccurrenceTopology,
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
  useCalendarViewportPosition,
  calendarCellInterval,
  calendarCells,
  calendarTimeLabel,
  calendarYearMonths,
  DateGrid,
  CalendarMonthGrid,
  CalendarTimeGrid,
  CalendarEventInspector,
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
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
    viewportOffset: 16,
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
  const pointerGestureActive = hand.timePreview !== null
    || hand.allDayPreview !== null
    || hand.monthPreview !== null
    || hand.selectionDragPreview !== null;
  const eventInspectorVisible = selectedEvent !== null && !pointerGestureActive;
  const eventDetailsPosition = useAnchoredFloatingPosition<HTMLDivElement, HTMLElement>({
    active: eventInspectorVisible,
    policy: {
      type: "preferred",
      placement: "right-start",
      fallbacks: ["left-start", "bottom-start", "top-start"],
    },
    offset: 8,
    boundaryPadding: 8,
  });
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
        dayNumber: classes(styles.dayNumber(), ui.text.body),
        today: styles.weekToday(),
        allDayLabel: classes("whitespace-nowrap px-1 py-1.5 text-right text-foreground-muted/70", ui.text.meta),
        allDayCell: classes("min-h-8", styles.weekCell()),
        allDayEventContainer: "group/event relative z-10 mx-0.5 my-1",
        allDayEvent: styles.allDayEvent(),
        resizeAllDayEnd: styles.resizeEdgeVertical(),
        timeViewport: "grid",
        timeViewportFill: styles.weekHours(),
        hourGutter: "relative overflow-hidden",
        viewportAnchor: "pointer-events-none absolute left-0 top-0",
        hourLabel: classes(styles.hourLabel(), ui.text.meta),
        timeCell: classes("overflow-hidden", styles.weekCell()),
        selectedSlot: styles.selectedSlot(),
        hourRule: styles.hourRule(),
        nowLine: styles.nowLine(),
        creationTimeHint: classes(styles.creationTimeHint(), ui.text.meta),
        timedEventContainer: "group/event absolute z-10 p-0.5",
        timedEvent: styles.timedEvent(),
        eventTitle: classes("min-w-0 truncate", ui.text.meta),
        eventTime: classes(styles.eventTime(), ui.text.meta),
        resizeTimedEnd: styles.resizeEdge(),
      }}
      labels={{
        grid: view === "day" ? "Day" : "Week",
        allDay: "all-day",
        now: "Now",
        resizeEnd: (event) => `Resize ${event.title} end`,
        hour: calendarHourLabel,
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
        toolbarPresentation="floating"
        canvasClassName={classes("relative", embedded ? "overflow-x-auto" : "overflow-hidden")}
        toolbarLabel="Calendar controls"
        toolbar={(
          <ToolbarLayout className="gap-1" style={{ gridTemplateColumns: "auto auto auto" }}>
            <ToolbarRegion placement="start" label="Calendar navigation">
              <ToolbarGroup label="Period navigation">
                <Command affordance={calendarControlAffordance("periodPrevious")} label="Previous" onClick={() => setVisibleDate(shiftVisibleDate(visibleDate, view, -1))}>
                  <ChevronLeft aria-hidden="true" size={16} />
                </Command>
                <Command affordance={calendarControlAffordance("today")} className={styles.todayAction()} onClick={() => setLocation(view === "year" ? "month" : view, today)}>Today</Command>
                <Command affordance={calendarControlAffordance("periodNext")} label="Next" onClick={() => setVisibleDate(shiftVisibleDate(visibleDate, view, 1))}>
                  <ChevronRight aria-hidden="true" size={16} />
                </Command>
              </ToolbarGroup>
            </ToolbarRegion>
            <ToolbarRegion placement="center" label="Calendar view">
              <Choice presentation="popup"
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
                classNames={{
                  root: styles.viewChoiceRoot(),
                  trigger: styles.viewChoiceTrigger(),
                  listbox: styles.viewChoiceListbox(),
                  option: styles.viewChoiceOption(),
                  focusedOption: styles.viewChoiceOptionFocused(),
                  selectedOption: styles.viewChoiceOptionSelected(),
                }}
              />
            </ToolbarRegion>
            <ToolbarRegion placement="end" label="Calendar sources">
              <ContextualControls
                data-ui-affordance={calendarControlAffordance("sourceDisclosure")}
                aria-label="Calendar sources"
                tabIndex={0}
                className={styles.toolbarSources()}
                capabilities={[{ id: "sources", phases: ["approach"] }] as const}
              >
                {(context) => (
                  <>
                    <span className={styles.sidebarHint()}><CalendarDays aria-hidden="true" size={16} /></span>
                    {context.visible.includes("sources") ? (
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
                    ) : null}
                  </>
                )}
              </ContextualControls>
            </ToolbarRegion>
          </ToolbarLayout>
        )}
      >
        <div className="relative flex h-full min-h-0 min-w-0 flex-col">
          <div className={styles.controlLayer()}>
            {eventInspectorVisible ? <CalendarEventInspector
              hand={hand}
              calendars={calendars}
              realizationKey={eventDetailsPosition.position?.placement ?? null}
              rootRef={eventDetailsPosition.floatingRef}
              style={eventDetailsPosition.style}
              placement={eventDetailsPosition.position?.placement}
              fits={eventDetailsPosition.position?.fits}
              affordances={{
                inspector: calendarControlAffordance("inspector"),
                edit: calendarControlAffordance("inspectorEdit"),
                remove: calendarControlAffordance("inspectorDelete"),
                titleField: calendarControlAffordance("titleField"),
                allDayToggle: calendarControlAffordance("allDayToggle"),
                startField: calendarControlAffordance("startField"),
                endField: calendarControlAffordance("endField"),
                calendarChoice: calendarControlAffordance("calendarChoice"),
                recurrenceChoice: calendarControlAffordance("recurrenceChoice"),
                recurrenceInterval: calendarControlAffordance("recurrenceInterval"),
              }}
              classNames={{
                root: classes(styles.inspector(), ui.surface.overlay),
                header: styles.inspectorHeader(),
                title: styles.inspectorTitle(),
                titleInput: ui.field.seamless,
                actions: styles.inspectorActions(),
                summary: styles.eventSummary(),
                details: styles.detailsEditor(),
                field: styles.field(),
                fieldLabel: ui.text.label,
                toggle: classes(styles.calendarToggle(), "w-auto px-0"),
                numberInput: ui.field.control,
              }}
              labels={{
                inspector: "Event",
                title: "Title",
                edit: "Edit details",
                remove: "Delete",
                allDay: "All-day",
                allDaySummary: "All day",
                start: "Start",
                end: "End",
                calendar: "Calendar",
                repeat: "Repeat",
                repeats: "Repeats",
                none: "None",
                daily: "Daily",
                weekly: "Weekly",
                monthly: "Monthly",
                yearly: "Yearly",
                every: "Every",
                repeatEvery: "Repeat every",
                repeatUntil: "Repeat until",
                editOccurrence: "Edit occurrence",
                thisOccurrence: "This",
                followingOccurrences: "Following",
                allOccurrences: "All",
              }}
              icons={{
                edit: <Pencil aria-hidden="true" size={14} />,
                remove: <Trash2 aria-hidden="true" size={14} />,
                time: <Clock3 aria-hidden="true" size={14} />,
                calendar: <CalendarDays aria-hidden="true" size={14} />,
                repeat: <Repeat2 aria-hidden="true" size={14} />,
              }}
            /> : null}
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
          <div className={classes(
            styles.contentLayer(),
            view === "day" || view === "week"
              ? "flex min-h-0 flex-col overflow-hidden"
              : view === "month"
                ? "overflow-auto pt-16"
                : "overflow-auto px-4 pt-16",
          )}>
            <p className={styles.periodHeading()}>{visiblePeriodLabel(view, visibleDate, {
              dateStyle: "named",
              monthNames: months,
              weekSeparator: " – ",
            })}</p>
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
                  dayNumber: classes(styles.dayNumber(), ui.text.body),
                  today: styles.todayMark(),
                  laneSpacer: "shrink-0",
                  moreDisclosure: classes(styles.monthMore(), ui.text.meta),
                  overflow: classes(styles.monthOverflow(), ui.surface.overlay),
                  overflowDate: classes("px-1 text-left", styles.quietAction(), ui.text.body),
                  eventContainer: "group/event relative z-10 min-w-0 w-full",
                  allDayEvent: styles.monthAllDay(),
                  timedEvent: styles.monthTimed(),
                  eventTitle: classes("min-w-0 truncate", ui.text.meta),
                  eventTime: classes(styles.eventTime(), ui.text.meta),
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
        </div>
      </ProductShell>
      </div>
    </DemoSurface>
  );
}

function calendarColor(document: CalendarDocument, calendarId: string): "accent" | "subtle" {
  return calendarDocumentCalendar(document, calendarId)?.color === "accent" ? "accent" : "subtle";
}

function calendarHourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${period}`;
}
