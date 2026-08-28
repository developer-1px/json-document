import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Redo2, Trash2, Undo2 } from "lucide-react";
import { Temporal } from "@js-temporal/polyfill";

import {
  calendarAllDayLayout,
  calendarAllDaySpan,
  calendarBusyDates,
  calendarDatePart,
  calendarEventsOnDay,
  calendarInstantAt,
  calendarIntervalLastDate,
  calendarMonthDayLayout,
  calendarMonthWeekLayout,
  calendarNowMarker,
  calendarRecurrenceWithFrequency,
  calendarRecurrenceWithInterval,
  calendarRecurrenceWithUntil,
  calendarShiftInstant,
  calendarTimedLayout,
  calendarVisibleEvents,
  calendarVisibleHourBand,
  createCalendarEditor,
  formatCalendarInstant,
  isCalendarAllDay,
  type CalendarDocument,
  type CalendarEvent,
  type CalendarRecurrence,
  type CalendarView,
} from "@interactive-os/json-document-editing";
import {
  useCalendarHand,
  useCalendarKeyboard,
  useCalendarPointerInteractions,
  useCalendarRenameInput,
  useCalendarViewportPosition,
} from "@interactive-os/json-document-calendar";
import {
  ActionButton,
  HtmlDateField,
  IconButton,
  ResizeHandle,
  SegmentedControl,
  Select,
  SelectableItem,
  ToggleButton,
} from "@interactive-os/json-document-ui-primitives-react";
import {
  calendarCellInterval,
  calendarCells,
  calendarEventLabel,
  calendarMonthWeeks,
  calendarTimeLabel,
  calendarYearMonths,
  shiftVisibleDate,
  visiblePeriodLabel,
} from "@interactive-os/json-document-ui-primitives-react";
import { useDemoEmbed } from "../../shared/demo-workbench/DemoPage";
import { DemoSurface } from "../../shared/demo-workbench/DemoSurface";
import { ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { CalendarDemoNavigator } from "./calendar-demo-navigator";
import { calendarSearchDefaults } from "./calendar-search";
import { calendarDemoRecipe } from "./calendar-demo-styles";

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
  const [editor] = useState(() => {
    let sequence = 0;
    return createCalendarEditor(initial, { createId: () => `event-${++sequence}` });
  });
  const hand = useCalendarHand(editor, {
    initialOccurrence: { start: initial.events[0]?.start ?? null, end: initial.events[0]?.end ?? null },
    defaultTitle: "Event",
  });
  const [viewState, setViewState] = useState<CalendarView>(calendarSearchDefaults.view);
  const [visibleDateState, setVisibleDateState] = useState(calendarSearchDefaults.date);
  const timePreview = hand.timePreview;
  const allDayPreview = hand.allDayPreview;
  const monthPreview = hand.monthPreview;
  const occurrenceStart = hand.occurrence.start;
  const occurrenceEnd = hand.occurrence.end;
  const scope = hand.scope;
  const setScope = hand.setScope;
  const titleInput = useCalendarRenameInput(hand);
  const [overflowDay, setOverflowDay] = useState<string | null>(null);
  const {
    instantAt,
    timePointerDown,
    timePointerMove,
    timePointerUp,
    allDayPointerDown,
    allDayPointerMove,
    allDayPointerUp,
    monthPointerDown,
    monthPointerMove,
    monthPointerUp,
    cancelTimePointer,
    cancelAllDayPointer,
    cancelMonthPointer,
    resizeTimed,
    resizeAllDay,
  } = useCalendarPointerInteractions(hand, {
    hourStart,
    hourEnd,
    stepMinutes: 15,
    pixelsPerHour: pxPerHour,
    onMonthPointerBegin: () => setOverflowDay(null),
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
  const selected = new Set(hand.snapshot.selection.keys);
  const selectedEvent = hand.selectedEvent;
  const inspected = hand.inspectedInterval;
  const visibleEvents = calendarVisibleEvents(document);
  const paintedEvents = hand.paintedEvents;
  const timeGridCells = calendarCells(view === "day" ? "day" : "week", visibleDate);
  const days = timeGridCells.map((cell) => cell.date);
  const nowInstant = formatCalendarInstant(Temporal.Now.plainDateTimeISO());
  const today = calendarDatePart(nowInstant);
  const yearMonths = calendarYearMonths(visibleDate);
  const yearCellInterval = view === "year"
    ? calendarCellInterval(yearMonths.flatMap((monthStart) => calendarCells("month", monthStart)))
    : null;
  const yearBusyDates = yearCellInterval === null
    ? null
    : calendarBusyDates(paintedEvents, yearCellInterval.start, yearCellInterval.end);

  useEffect(() => {
    setOverflowDay(null);
  }, [view, visibleDate]);

  useCalendarKeyboard({
    active: !embedded,
    onView: setView,
    onShift: (direction) => setVisibleDate(shiftVisibleDate(visibleDate, view, direction)),
    onToday: () => setLocation(view === "year" ? "month" : view, today),
    onCreate: createOnVisibleDate,
    onRemove: removeSelected,
    onDismiss: () => {
      if (overflowDay === null) return false;
      setOverflowDay(null);
      return true;
    },
  });

  function createOnVisibleDate(): void {
    const start = calendarInstantAt(calendarDatePart(visibleDate), 10 * 60);
    const end = start === null ? null : calendarShiftInstant(start, 30);
    if (start === null || end === null) return;
    hand.createInterval(start, end);
  }

  function createTimedAt(day: string, clientY: number, grid: Element): void {
    const start = instantAt(day, clientY, grid);
    const end = start === null ? null : calendarShiftInstant(start, 60);
    if (start === null || end === null) return;
    hand.createInterval(start, end);
  }

  function createAllDayOn(day: string): void {
    const span = calendarAllDaySpan(day, day);
    if (span === null) return;
    hand.createInterval(span.start, span.end, { allDay: true });
  }

  function removeSelected(): void {
    hand.removeSelected();
  }

  const applySelectedPatch = hand.applySelectedPatch;

  const allDayItems = calendarAllDayLayout(paintedEvents, days);
  const allDayLaneCount = allDayItems[0]?.laneCount ?? 1;

  const timeGrid = (
    <div
      role="grid"
      aria-label={view === "day" ? "Day" : "Week"}
      className={classes("min-w-[36rem]", !embedded && "flex min-h-0 flex-1 flex-col")}
      onPointerMove={(event) => {
        timePointerMove(event);
        allDayPointerMove(event);
      }}
    >
      <div
        className={classes("grid", styles.weekSticky())}
        style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(4.5rem, 1fr))` }}
      >
        <div className={styles.weekHead()} />
        {timeGridCells.map((cell) => (
          <div
            key={cell.date}
            role="columnheader"
            className={styles.weekHead()}
          >
            <span className={ui.text.meta}>{weekdays[cell.weekday - 1]}</span>
            <span className={classes(styles.dayNumber(), cell.date === today && styles.todayMark())}>
              {cell.day}
            </span>
          </div>
        ))}
        <div
          className={classes("px-1 py-2 text-right", ui.text.meta)}
          style={{ gridRow: `2 / span ${allDayLaneCount}` }}
        >
          all-day
        </div>
        {days.map((day) => (
          <div
            key={`allday-${day}`}
            data-calendar-allday-day={day}
            className={classes("min-h-10", styles.weekCell())}
            style={{ gridRow: `2 / span ${allDayLaneCount}` }}
            onPointerDown={(event) => allDayPointerDown(event, day, null, null, null, null)}
            onPointerUp={allDayPointerUp}
            onDoubleClick={() => createAllDayOn(day)}
            onPointerCancel={(event) => cancelAllDayPointer(event.pointerId)}
          />
        ))}
        {allDayItems.map((item) => (
          <div
            key={`${item.event.id}:${item.event.start}`}
            data-calendar-allday-day={days[item.startIndex]}
            className="relative z-10 mx-0.5 my-1"
            style={{ gridColumn: `${item.startIndex + 2} / span ${item.span}`, gridRow: 2 + item.lane }}
          >
            <SelectableItem
              selected={selected.has(item.event.id) && (occurrenceStart === null || occurrenceStart === item.event.start)}
              aria-label={item.event.title}
              data-calendar-color={calendarColor(document, item.event.calendarId)}
              data-preview={item.event.id === "preview" ? "true" : undefined}
              className={styles.allDayEvent()}
              onPointerDown={(event) => {
                event.stopPropagation();
                allDayPointerDown(event, days[item.startIndex] ?? visibleDate, item.event.id, item.event.start, item.event.end, "body");
              }}
              onPointerUp={allDayPointerUp}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              {item.event.title}
            </SelectableItem>
            {item.event.id === "preview" ? null : (
              <>
                <ResizeHandle
                  label={`Resize ${item.event.title} start`}
                  orientation="horizontal"
                  className={classes("left-0 top-0 h-full w-2", styles.resizeEdge())}
                  onResize={(delta, phase) => resizeAllDay(item.event.id, "start", item.event.start, item.event.start, delta, phase)}
                />
                <ResizeHandle
                  label={`Resize ${item.event.title} end`}
                  orientation="horizontal"
                  className={classes("right-0 top-0 h-full w-2", styles.resizeEdge())}
                  onResize={(delta, phase) => {
                    const last = calendarIntervalLastDate(item.event.start, item.event.end, true);
                    resizeAllDay(item.event.id, "end", last, item.event.start, delta, phase);
                  }}
                />
              </>
            )}
          </div>
        ))}
      </div>
      <div
        ref={hoursRef}
        data-calendar-time-viewport=""
        className={classes("grid", !embedded && styles.weekHours())}
        style={{
          gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(4.5rem, 1fr))`,
          height: embedded ? (hourEnd - hourStart) * pxPerHour : undefined,
        }}
      >
        <div className="relative overflow-hidden" style={{ height: (hourEnd - hourStart) * pxPerHour }}>
          <div
            aria-hidden="true"
            data-calendar-viewport-hour={String(workHourStart).padStart(2, "0")}
            className="pointer-events-none absolute left-0 top-0"
            style={{ transform: `translateY(${(workHourStart - hourStart) * pxPerHour}px)` }}
          />
          {Array.from({ length: hourEnd - hourStart }, (_, index) => hourStart + index).map((hour) => (
            <div
              key={hour}
              data-calendar-hour={String(hour).padStart(2, "0")}
              className={styles.hourLabel()}
              style={{ top: (hour - hourStart) * pxPerHour + 4 }}
            >
              {String(hour).padStart(2, "0")}
            </div>
          ))}
        </div>
        {days.map((day) => {
          const now = calendarNowMarker(nowInstant, day);
          const nowTop = now === null ? null : (now.minutes - hourStart * 60) * (pxPerHour / 60);
          const nowVisible = nowTop !== null && nowTop >= 0 && nowTop <= (hourEnd - hourStart) * pxPerHour;
          return (
            <div
              key={day}
              data-calendar-day={day}
              data-calendar-grid="time"
              className={classes("overflow-hidden", styles.weekCell())}
              style={{ height: (hourEnd - hourStart) * pxPerHour }}
              onPointerDown={(event) => timePointerDown(event, day, null, null, null, null)}
              onPointerUp={timePointerUp}
              onDoubleClick={(event) => {
                const grid = event.currentTarget.closest("[data-calendar-grid=\"time\"]");
                if (grid === null) return;
                createTimedAt(day, event.clientY, grid);
              }}
              onPointerCancel={(event) => cancelTimePointer(event.pointerId)}
            >
              {Array.from({ length: hourEnd - hourStart }, (_, index) => (
                index === 0 ? null : (
                  <div
                    key={index}
                    className={styles.hourRule()}
                    style={{ top: index * pxPerHour }}
                  />
                )
              ))}
              {nowVisible ? (
                <div
                  role="presentation"
                  aria-label="Now"
                  className={styles.nowLine()}
                  style={{ top: nowTop }}
                />
              ) : null}
              {calendarTimedLayout(paintedEvents, day).map((item) => {
                const band = calendarVisibleHourBand(item.startMinutes, item.endMinutes, hourStart, hourEnd);
                if (band === null) return null;
                const { startMinutes, endMinutes } = band;
                return (
                <div
                  key={`${item.event.id}:${item.event.start}`}
                  className="absolute z-10"
                  style={{
                    top: (startMinutes - hourStart * 60) * (pxPerHour / 60),
                    height: Math.max(18, (endMinutes - startMinutes) * (pxPerHour / 60)),
                    left: `calc(${item.lane / item.laneCount * 100}% + 0.25rem)`,
                    width: `calc(${100 / item.laneCount}% - 0.5rem)`,
                  }}
                >
                  <SelectableItem
                    selected={selected.has(item.event.id) && (occurrenceStart === null || occurrenceStart === item.event.start)}
                    aria-label={item.event.title}
                    data-calendar-color={calendarColor(document, item.event.calendarId)}
                    data-preview={item.event.id === "preview" || timePreview?.originEventId === item.event.id ? "true" : undefined}
                    className={styles.timedEvent()}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      timePointerDown(event, day, item.event.id, item.event.start, item.event.end, "body");
                    }}
                    onPointerUp={timePointerUp}
                    onDoubleClick={(event) => event.stopPropagation()}
                  >
                    <span className="min-w-0 truncate">{item.event.title}</span>
                    {endMinutes - startMinutes >= 40 ? (
                      <span className={styles.eventTime()}>{calendarTimeLabel(item.event.start)}</span>
                    ) : null}
                  </SelectableItem>
                  {item.event.id === "preview" ? null : (
                    <>
                      <ResizeHandle
                        label={`Resize ${item.event.title} start`}
                        orientation="vertical"
                        className={classes("inset-x-0 top-0 h-2", styles.resizeEdge())}
                        onResize={(delta, phase) => resizeTimed(item.event.id, "start", item.event.start, item.event.start, delta, phase)}
                      />
                      <ResizeHandle
                        label={`Resize ${item.event.title} end`}
                        orientation="vertical"
                        className={classes("inset-x-0 bottom-0 h-2", styles.resizeEdge())}
                        onResize={(delta, phase) => resizeTimed(item.event.id, "end", item.event.start, item.event.end, delta, phase)}
                      />
                    </>
                  )}
                </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <DemoSurface>
      <ProductApp
        fill={!embedded}
        toolbarLabel="Calendar"
        canvasClassName={embedded ? "overflow-x-auto" : "overflow-hidden"}
        toolbar={(
          <>
            <div className={classes("min-w-0 flex-1", styles.toolbarCluster())}>
              <SegmentedControl
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
            </div>
            <div className={styles.toolbarCluster()}>
              <IconButton label="Previous" onClick={() => setVisibleDate(shiftVisibleDate(visibleDate, view, -1))}>
                <ChevronLeft aria-hidden="true" size={16} />
              </IconButton>
              <span className={styles.period()}>{visiblePeriodLabel(view, visibleDate, {
                monthNames: months,
                weekSeparator: " – ",
              })}</span>
              <IconButton label="Next" onClick={() => setVisibleDate(shiftVisibleDate(visibleDate, view, 1))}>
                <ChevronRight aria-hidden="true" size={16} />
              </IconButton>
              <ActionButton onClick={() => setLocation(view === "year" ? "month" : view, today)}>
                Today
              </ActionButton>
            </div>
            <div className={classes("min-w-0 flex-1 justify-end", styles.toolbarCluster())}>
              <ActionButton onClick={createOnVisibleDate}>
                Create
              </ActionButton>
              <IconButton label="Undo" onClick={hand.undo}><Undo2 aria-hidden="true" size={16} /></IconButton>
              <IconButton label="Redo" onClick={hand.redo}><Redo2 aria-hidden="true" size={16} /></IconButton>
              <IconButton label="Delete" onClick={removeSelected}>
                <Trash2 aria-hidden="true" size={16} />
              </IconButton>
            </div>
          </>
        )}
      >
        <div className="flex h-full min-h-0 min-w-0 gap-4">
          <nav aria-label="Calendars" className={styles.sidebar()}>
            <p className={ui.text.label}>Calendars</p>
            {(document.calendars ?? []).map((calendar) => (
              <ToggleButton
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
              </ToggleButton>
            ))}
            <CalendarDemoNavigator
              visibleDate={visibleDate}
              today={today}
              events={paintedEvents}
              onDateChange={setVisibleDate}
            />
          </nav>
          <div className={classes("min-w-0 flex-1", view === "day" || view === "week" ? "flex min-h-0 flex-col overflow-hidden" : "overflow-auto")}>
            {view === "day" || view === "week" ? timeGrid : null}
            {view === "month" ? (
              <div role="grid" aria-label="Month" className="min-w-[36rem]" onPointerMove={monthPointerMove}>
                <div className="grid grid-cols-7">
                  {weekdays.map((name) => (
                    <div key={name} role="columnheader" className={styles.monthHead()}>
                      {name}
                    </div>
                  ))}
                </div>
                {calendarMonthWeeks(visibleDate).map((week) => {
                  const dates = week.map((cell) => cell.date);
                  const layout = calendarMonthWeekLayout(paintedEvents, dates, monthDayRows);
                  return (
                    <div
                      key={dates[0]}
                      role="row"
                      data-calendar-week={dates[0]}
                      className={styles.monthWeek()}
                      style={{
                        gridTemplateRows: `1.75rem repeat(${layout.laneCount}, 1.25rem) minmax(2.5rem, 1fr)`,
                      }}
                    >
                      {week.map((cell, index) => {
                        const onDay = calendarEventsOnDay(paintedEvents, cell.date);
                        return (
                          <div
                            key={cell.date}
                            role="gridcell"
                            aria-label={cell.date}
                            aria-selected={onDay.some((item) => selected.has(item.id))}
                            aria-current={cell.date === today ? "date" : undefined}
                            data-calendar-day={cell.date}
                            className={classes(
                              styles.monthDay(),
                              cell.inVisiblePeriod ? ui.text.body : ui.text.meta,
                              overflowDay === cell.date && "z-20",
                            )}
                            style={{ gridColumn: index + 1, gridRow: "1 / -1" }}
                            onPointerDown={(event) => monthPointerDown(event, cell.date, dates, null, null, null)}
                            onPointerUp={monthPointerUp}
                            onDoubleClick={() => createAllDayOn(cell.date)}
                            onPointerCancel={(event) => cancelMonthPointer(event.pointerId)}
                            onLostPointerCapture={(event) => cancelMonthPointer(event.pointerId, "lost-capture")}
                          >
                            {overflowDay === cell.date ? (
                              <div
                                role="dialog"
                                aria-label={`Events on ${cell.date}`}
                                className={classes(styles.monthOverflow(), ui.surface.overlay)}
                                onPointerDown={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => event.stopPropagation()}
                              >
                                <ActionButton
                                  className={classes("px-1 text-left", styles.quietAction(), ui.text.body)}
                                  onClick={() => setLocation("day", cell.date)}
                                >
                                  {cell.date}
                                </ActionButton>
                                {calendarMonthDayLayout(paintedEvents, cell.date, Math.max(onDay.length, 1)).events.map((item) => (
                                  <SelectableItem
                                    key={`${item.id}:${item.start}`}
                                    selected={selected.has(item.id) && (occurrenceStart === null || occurrenceStart === item.start)}
                                    aria-label={calendarEventLabel(item)}
                                    data-calendar-color={calendarColor(document, item.calendarId)}
                                    className={isCalendarAllDay(item) ? styles.monthAllDay() : styles.monthTimed()}
                                    onClick={() => hand.selectOccurrence(item.id, item.start, item.end)}
                                  >
                                    <MonthEventCopy event={item} />
                                  </SelectableItem>
                                ))}
                              </div>
                            ) : (
                              <>
                                <span className={classes(styles.dayNumber(), cell.date === today && styles.todayMark())}>
                                  {cell.day}
                                </span>
                                <div className="shrink-0" style={{ height: `${layout.laneCount * 1.25}rem` }} />
                                {(layout.hiddenCounts[index] ?? 0) > 0 ? (
                                  <ActionButton
                                    className={classes(styles.monthMore(), ui.text.meta)}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={() => setOverflowDay(cell.date)}
                                  >
                                    {`+${layout.hiddenCounts[index]} more`}
                                  </ActionButton>
                                ) : null}
                              </>
                            )}
                          </div>
                        );
                      })}
                      {overflowDay === null ? layout.items.map((item) => {
                        const weekFirst = dates[0];
                        const weekLast = dates.at(-1);
                        const lastDay = calendarIntervalLastDate(item.event.start, item.event.end, true);
                        const clipStart = isCalendarAllDay(item.event) && weekFirst !== undefined && item.event.start < weekFirst;
                        const clipEnd = isCalendarAllDay(item.event) && weekLast !== undefined && lastDay > weekLast;
                        return (
                        <div
                          key={`${item.event.id}:${allDayPreview?.originEventId === item.event.id
                            ? allDayPreview.originEventStart ?? item.event.start
                            : item.event.start}`}
                          data-calendar-span={String(item.span)}
                          className="relative z-10 min-w-0 w-full"
                          style={{
                            gridColumn: `${item.startIndex + 1} / span ${item.span}`,
                            gridRow: 2 + item.lane,
                          }}
                        >
                          <SelectableItem
                            selected={selected.has(item.event.id) && (occurrenceStart === null || occurrenceStart === item.event.start)}
                            aria-label={calendarEventLabel(item.event)}
                            data-calendar-color={calendarColor(document, item.event.calendarId)}
                            data-preview={item.event.id === "preview" ? "true" : undefined}
                            className={isCalendarAllDay(item.event) ? styles.monthAllDay() : styles.monthTimed()}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              monthPointerDown(event, dates[item.startIndex] ?? visibleDate, dates, item.event.id, item.event.start, item.event.end);
                            }}
                            onPointerUp={monthPointerUp}
                            onDoubleClick={(event) => event.stopPropagation()}
                          >
                            <MonthEventCopy event={item.event} />
                          </SelectableItem>
                          {item.event.id === "preview" || !isCalendarAllDay(item.event) ? null : (
                            <>
                              {clipStart ? null : (
                                <ResizeHandle
                                  label={`Resize ${item.event.title} start`}
                                  orientation="horizontal"
                                  className={classes("left-0 top-0 z-20 h-full w-2", styles.resizeEdge())}
                                  onResize={(delta, phase) => resizeAllDay(item.event.id, "start", item.event.start, item.event.start, delta, phase)}
                                />
                              )}
                              {clipEnd ? null : (
                                <ResizeHandle
                                  label={`Resize ${item.event.title} end`}
                                  orientation="horizontal"
                                  className={classes("right-0 top-0 z-20 h-full w-2", styles.resizeEdge())}
                                  onResize={(delta, phase) => {
                                    const last = calendarIntervalLastDate(item.event.start, item.event.end, true);
                                    resizeAllDay(item.event.id, "end", last, item.event.start, delta, phase);
                                  }}
                                />
                              )}
                            </>
                          )}
                        </div>
                        );
                      }) : null}

                    </div>
                  );
                })}
              </div>
            ) : null}
            {view === "year" ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {yearMonths.map((monthStart, index) => (
                  <section
                    key={monthStart}
                    aria-label={visiblePeriodLabel("month", monthStart)}
                    className={styles.yearMonth()}
                  >
                    <ActionButton
                      className={classes("text-left", styles.quietAction(), ui.text.body)}
                      onClick={() => setLocation("month", monthStart)}
                    >
                      {months[index]}
                    </ActionButton>
                    <div
                      role="grid"
                      aria-label={visiblePeriodLabel("month", monthStart)}
                      className="grid grid-cols-7"
                    >
                      {weekdays.map((name) => (
                        <div key={name} role="columnheader" className={classes("text-center", ui.text.meta)}>
                          {name.slice(0, 1)}
                        </div>
                      ))}
                      {calendarCells("month", monthStart).map((cell) => (
                        <ActionButton
                          key={cell.date}
                          aria-label={cell.date}
                          aria-current={cell.date === today ? "date" : undefined}
                          className={classes(
                            styles.yearDay(),
                            cell.inVisiblePeriod ? ui.text.body : ui.text.meta,
                            cell.date === today ? styles.todayMark() : null,
                            yearBusyDates?.has(cell.date) && cell.date !== today && styles.yearDayBusy(),
                          )}
                          onClick={() => setLocation("day", cell.date)}
                        >
                          {cell.day}
                        </ActionButton>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
          <section aria-label="Event" className={styles.inspector()}>
            {selectedEvent === null ? (
              <p className={ui.text.meta}>Select or create an event.</p>
            ) : (
              <>
                <input
                  ref={titleInput.ref}
                  aria-label="Title"
                  className={classes(ui.field.seamless, styles.inspectorTitle())}
                  value={titleInput.value}
                  onFocus={titleInput.onFocus}
                  onChange={titleInput.onChange}
                  onBlur={titleInput.onBlur}
                  onKeyDown={titleInput.onKeyDown}
                />
                <ToggleButton
                  pressed={selectedEvent.allDay}
                  aria-label="All-day"
                  className={classes(styles.calendarToggle(), "w-auto px-0")}
                  onClick={() => applySelectedPatch({ allDay: !selectedEvent.allDay })}
                >
                  All-day
                </ToggleButton>
                <HtmlDateField
                  key={selectedEvent.allDay ? "start-date" : "start-datetime"}
                  type={selectedEvent.allDay ? "date" : "datetime-local"}
                  label="Start"
                  value={inspected?.start ?? selectedEvent.start}
                  onValueChange={(value) => applySelectedPatch({ start: value })}
                />
                <HtmlDateField
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
                <Select
                  label="Calendar"
                  value={selectedEvent.calendarId}
                  options={(document.calendars ?? []).map((calendar) => ({ id: calendar.id, label: calendar.title }))}
                  onValueChange={(value) => applySelectedPatch({ calendarId: value })}
                />
                <Select
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
                {selectedEvent.recurrence === null ? null : (
                  <>
                    <label className={styles.field()}>
                      <span className={ui.text.label}>Every</span>
                      <input
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
                  <SegmentedControl
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
              </>
            )}
          </section>
        </div>
      </ProductApp>
    </DemoSurface>
  );
}

function calendarColor(document: CalendarDocument, calendarId: string): "accent" | "subtle" {
  return (document.calendars ?? []).find((item) => item.id === calendarId)?.color === "accent" ? "accent" : "subtle";
}

function MonthEventCopy(props: { readonly event: CalendarEvent }): ReactNode {
  const styles = calendarDemoRecipe();
  const time = calendarTimeLabel(props.event.start);
  if (isCalendarAllDay(props.event)) return props.event.title;
  return (
    <>
      <span className="min-w-0 truncate">{props.event.title}</span>
      {time.length > 0 ? <span className={styles.eventTime()}>{time}</span> : null}
    </>
  );
}
