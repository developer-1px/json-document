import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Redo2, Trash2, Undo2 } from "lucide-react";

import {
  addCalendarDate,
  calendarAllDayLayout,
  calendarBusyDates,
  calendarEventsOnDay,
  calendarInstantAt,
  calendarMonthDayLayout,
  calendarNowMarker,
  calendarShiftInstant,
  calendarTimedLayout,
  calendarVisibleEvents,
  createCalendarEditor,
  interpretCalendarAllDayPointer,
  interpretCalendarMonthPointer,
  bindCalendarMonthIntent,
  bindCalendarTimeGridIntent,
  interpretCalendarTimeGridPointer,
  isCalendarAllDay,
  previewCalendarAllDay,
  previewCalendarTimeGrid,
  type CalendarAllDayPointerRelease,
  type CalendarDocument,
  type CalendarEvent,
  type CalendarIntent,
  type CalendarRecurrence,
  type CalendarTimeGridHandle,
  type CalendarTimeGridPointerRelease,
  type CalendarView,
} from "@interactive-os/json-document-editing";
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
  addCalendarDays,
  calendarCells,
  shiftVisibleDate,
  startOfIsoWeek,
  visiblePeriodLabel,
} from "@interactive-os/json-document-ui-primitives-react";
import { createWebPointerSession, findWebPointTarget } from "@interactive-os/json-document-web";
import { useDemoEmbed } from "../../shared/demo-workbench/DemoPage";
import { DemoSurface } from "../../shared/demo-workbench/DemoSurface";
import { ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import {
  calendarAllDayResizeDays,
  calendarPointerOccurrence,
  calendarSelectionOccurrence,
  calendarVisibleHourBand,
} from "./calendar-pointer-occurrence";
import { interpretCalendarHotkey } from "./calendar-hotkeys";
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
    { id: "home", title: "Home", hidden: false },
    { id: "work", title: "Work", hidden: false },
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

const hourStart = 7;
const hourEnd = 19;
const pxPerHour = 48;
const monthDayRows = 3;
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type OccurrenceScope = Extract<CalendarIntent, { type: "occurrence.edit" }>["scope"];

export function CalendarDemoRoute(props: {
  readonly view?: CalendarView;
  readonly visibleDate?: string;
  readonly onLocationChange?: (next: { readonly view: CalendarView; readonly date: string }) => void;
} = {}) {
  const styles = calendarDemoRecipe();
  const embedded = useDemoEmbed();
  const titleRef = useRef<HTMLInputElement>(null);
  const [editor] = useState(() => {
    let sequence = 0;
    return createCalendarEditor(initial, { createId: () => `event-${++sequence}` });
  });
  const [viewState, setViewState] = useState<CalendarView>(calendarSearchDefaults.view);
  const [visibleDateState, setVisibleDateState] = useState(calendarSearchDefaults.date);
  const [timePreview, setTimePreview] = useState<CalendarTimeGridPointerRelease | null>(null);
  const [allDayPreview, setAllDayPreview] = useState<CalendarAllDayPointerRelease | null>(null);
  const [occurrenceStart, setOccurrenceStart] = useState<string | null>(initial.events[0]?.start ?? null);
  const [occurrenceEnd, setOccurrenceEnd] = useState<string | null>(initial.events[0]?.end ?? null);
  const [scope, setScope] = useState<OccurrenceScope>("this");
  const [naming, setNaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [timePointer] = useState(() => createWebPointerSession<CalendarTimeGridPointerRelease & {
    readonly originEventEnd: string | null;
  }>());
  const [allDayPointer] = useState(() => createWebPointerSession<CalendarAllDayPointerRelease & {
    readonly originEventEnd: string | null;
  }>());
  const [monthPointer] = useState(() => createWebPointerSession<{
    readonly originDay: string;
    readonly originEventId: string | null;
    readonly originEventStart: string | null;
    readonly originEventEnd: string | null;
  }>());
  const [, setRevision] = useState(0);
  const view = props.view ?? viewState;
  const visibleDate = props.visibleDate ?? visibleDateState;

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

  const refresh = () => setRevision((value) => value + 1);
  const document = editor.snapshot.value as CalendarDocument;
  const selected = new Set(editor.snapshot.selection.keys);
  const selectedEvent = editor.selectedEvents[0] ?? null;
  const visibleEvents = calendarVisibleEvents(document);
  const paintedEvents = allDayPreview !== null
    ? previewCalendarAllDay(visibleEvents, allDayPreview)
    : timePreview === null
      ? visibleEvents
      : previewCalendarTimeGrid(visibleEvents, timePreview, scope);
  const weekStart = startOfIsoWeek(visibleDate);
  const days = view === "day"
    ? [visibleDate]
    : Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index));
  const nowInstant = clockNow();
  const today = nowInstant.slice(0, 10);
  const yearStart = `${visibleDate.slice(0, 4)}-01-01`;
  const yearEnd = `${String(Number(visibleDate.slice(0, 4)) + 1).padStart(4, "0")}-01-01`;
  const yearBusyDates = view === "year"
    ? calendarBusyDates(
      paintedEvents,
      addCalendarDate(yearStart, -7) ?? yearStart,
      addCalendarDate(yearEnd, 14) ?? yearEnd,
    )
    : null;

  useEffect(() => {
    setTitleDraft(selectedEvent?.title ?? "");
  }, [selectedEvent?.id, selectedEvent?.title, occurrenceStart]);

  useEffect(() => {
    if (!naming) return;
    titleRef.current?.focus();
    titleRef.current?.select();
  }, [naming, selectedEvent?.id]);

  useEffect(() => {
    if (embedded) return;
    function onKeyDown(event: KeyboardEvent): void {
      const command = interpretCalendarHotkey(event);
      if (command === null) return;
      event.preventDefault();
      if (command.type === "view") setView(command.view);
      if (command.type === "shift") setVisibleDate(shiftView(visibleDate, view, command.direction));
      if (command.type === "today") setLocation(view === "year" ? "month" : view, today);
      if (command.type === "create") createOnVisibleDate();
      if (command.type === "remove") removeSelected();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [embedded, today, view, visibleDate]);

  function dispatchIntent(intent: CalendarIntent | null): boolean {
    const ok = intent !== null && editor.dispatch(intent).ok;
    refresh();
    return ok;
  }

  function createOnVisibleDate(): void {
    const start = calendarInstantAt(visibleDate.slice(0, 10), 10 * 60);
    const end = start === null ? null : calendarShiftInstant(start, 30);
    if (start === null || end === null) return;
    const intent: CalendarIntent = { type: "event.create", start, end };
    if (!dispatchIntent(intent)) return;
    rememberPointerOccurrence(intent, start, end);
  }

  function removeSelected(): void {
    if (selectedEvent !== null && selectedEvent.recurrence !== null && occurrenceStart !== null) {
      dispatchIntent({
        type: "occurrence.remove",
        eventId: selectedEvent.id,
        occurrenceStart,
        scope,
      });
    } else {
      dispatchIntent({ type: "selection.remove" });
    }
    rememberSelectedOccurrence();
  }

  function rememberSelectedOccurrence(): void {
    const next = calendarSelectionOccurrence(editor.selectedEvents[0] ?? null);
    rememberOccurrence(next.start, next.end);
  }

  function bindTimeGridIntent(
    intent: ReturnType<typeof interpretCalendarTimeGridPointer>,
    occurrenceStart: string | null,
  ): CalendarIntent | null {
    const eventId = intent?.type === "event.move" || intent?.type === "event.resize" ? intent.eventId : null;
    const event = eventId === null ? undefined : document.events.find((item) => item.id === eventId);
    return bindCalendarTimeGridIntent(intent, event, occurrenceStart, scope);
  }

  function rememberOccurrence(start: string | null, end?: string | null): void {
    setOccurrenceStart(start);
    setOccurrenceEnd(end ?? null);
  }

  function rememberPointerOccurrence(
    intent: CalendarIntent | null,
    originStart: string | null,
    originEnd: string | null,
  ): void {
    const selected = editor.selectedEvents[0];
    const next = calendarPointerOccurrence(
      intent,
      { start: originStart, end: originEnd },
      selected === undefined ? null : { start: selected.start, end: selected.end },
    );
    rememberOccurrence(next.start, next.end);
    if (intent?.type === "event.create") {
      setScope("this");
      setNaming(true);
      return;
    }
    setNaming(false);
  }

  function instantAt(day: string, clientY: number, grid: Element): string | null {
    const rect = grid.getBoundingClientRect();
    const raw = hourStart * 60 + ((clientY - rect.top) / rect.height) * (hourEnd - hourStart) * 60;
    const minutes = Math.round(Math.max(hourStart * 60, Math.min(hourEnd * 60, raw)) / 15) * 15;
    return calendarInstantAt(day, minutes);
  }

  function timePointerDown(
    event: PointerEvent<HTMLElement>,
    day: string,
    originEventId: string | null,
    originEventStart: string | null,
    originEventEnd: string | null,
    originHandle: CalendarTimeGridHandle | null,
  ): void {
    if (event.button !== 0) return;
    const grid = event.currentTarget.closest("[data-calendar-grid=\"time\"]");
    if (grid === null) return;
    const originInstant = instantAt(day, event.clientY, grid);
    if (originInstant === null) return;
    const release = {
      originInstant,
      originEventId,
      originEventStart,
      originEventEnd,
      originHandle,
      targetInstant: originInstant,
    };
    timePointer.begin(event.currentTarget, event.pointerId, release);
    setTimePreview(release);
  }

  function timePointerMove(event: PointerEvent<HTMLElement>): void {
    if (timePointer.getSnapshot()?.pointerId !== event.pointerId) return;
    const grid = findWebPointTarget<Element>("[data-calendar-grid=\"time\"]", { x: event.clientX, y: event.clientY });
    const targetDay = grid?.getAttribute("data-calendar-day");
    if (grid === null || grid === undefined || targetDay === null || targetDay === undefined) return;
    const targetInstant = instantAt(targetDay, event.clientY, grid);
    if (targetInstant === null) return;
    const next = timePointer.preview(event.pointerId, (state) => ({ ...state, targetInstant }));
    if (next !== null) setTimePreview(next);
  }

  function timePointerUp(event: PointerEvent<HTMLElement>): void {
    const origin = timePointer.commit(event.pointerId);
    setTimePreview(null);
    if (origin === null) return;
    const intent = bindTimeGridIntent(interpretCalendarTimeGridPointer(origin), origin.originEventStart);
    dispatchIntent(intent);
    rememberPointerOccurrence(intent, origin.originEventStart, origin.originEventEnd);
  }

  function allDayPointerDown(
    event: PointerEvent<HTMLElement>,
    day: string,
    originEventId: string | null,
    originEventStart: string | null,
    originEventEnd: string | null,
    originHandle: "body" | "start" | "end" | null,
  ): void {
    if (event.button !== 0) return;
    const release = {
      originDay: day,
      originEventId,
      originEventStart,
      originEventEnd,
      originHandle,
      targetDay: day,
    };
    allDayPointer.begin(event.currentTarget, event.pointerId, release);
    setAllDayPreview(release);
  }

  function allDayPointerMove(event: PointerEvent<HTMLElement>): void {
    if (allDayPointer.getSnapshot()?.pointerId !== event.pointerId) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-allday-day]", { x: event.clientX, y: event.clientY })
      ?.getAttribute("data-calendar-allday-day");
    if (targetDay === null || targetDay === undefined) return;
    const next = allDayPointer.preview(event.pointerId, (state) => ({ ...state, targetDay }));
    if (next !== null) setAllDayPreview(next);
  }

  function allDayPointerUp(event: PointerEvent<HTMLElement>): void {
    const origin = allDayPointer.commit(event.pointerId);
    setAllDayPreview(null);
    if (origin === null) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-allday-day]", { x: event.clientX, y: event.clientY })
      ?.getAttribute("data-calendar-allday-day");
    if (targetDay === null || targetDay === undefined) return;
    const intent = interpretCalendarAllDayPointer({
      originDay: origin.originDay,
      originEventId: origin.originEventId,
      originEventStart: origin.originEventStart,
      originHandle: origin.originHandle,
      targetDay,
    });
    dispatchIntent(intent);
    rememberPointerOccurrence(intent, origin.originEventStart, origin.originEventEnd);
  }

  function monthPointerDown(
    event: PointerEvent<HTMLElement>,
    day: string,
    originEventId: string | null,
    originEventStart: string | null,
    originEventEnd: string | null,
  ): void {
    if (event.button !== 0) return;
    monthPointer.begin(event.currentTarget, event.pointerId, {
      originDay: day,
      originEventId,
      originEventStart,
      originEventEnd,
    });
  }

  function monthPointerUp(event: PointerEvent<HTMLElement>): void {
    const origin = monthPointer.commit(event.pointerId);
    if (origin === null) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-day]", { x: event.clientX, y: event.clientY })
      ?.getAttribute("data-calendar-day");
    if (targetDay === null || targetDay === undefined) return;
    const raw = interpretCalendarMonthPointer({
      originDay: origin.originDay,
      originEventId: origin.originEventId,
      originEventStart: origin.originEventStart,
      targetDay,
      eventsOnTargetDay: calendarEventsOnDay(paintedEvents, targetDay).map((item) => ({ id: item.id })),
    });
    const eventId = raw?.type === "event.move-day" ? raw.eventId : null;
    const matched = eventId === null ? undefined : document.events.find((item) => item.id === eventId);
    const intent = bindCalendarMonthIntent(raw, matched, origin.originEventStart, scope);
    dispatchIntent(intent);
    rememberPointerOccurrence(intent, origin.originEventStart, origin.originEventEnd);
  }

  function resizeTimed(
    eventId: string,
    edge: "start" | "end",
    occurrenceStart: string,
    origin: string,
    delta: number,
    phase: "preview" | "commit",
  ): void {
    const minutes = Math.round(delta / (pxPerHour / 60) / 15) * 15;
    const targetInstant = calendarShiftInstant(origin, minutes);
    if (targetInstant === null) return;
    const release: CalendarTimeGridPointerRelease = {
      originInstant: origin,
      originEventId: eventId,
      originEventStart: occurrenceStart,
      originHandle: edge,
      targetInstant,
    };
    if (phase === "preview") {
      setTimePreview(release);
      return;
    }
    setTimePreview(null);
    const intent = bindTimeGridIntent(interpretCalendarTimeGridPointer(release), occurrenceStart);
    dispatchIntent(intent);
    rememberPointerOccurrence(intent, occurrenceStart, targetInstant);
  }

  function resizeAllDay(eventId: string, edge: "start" | "end", originDay: string, delta: number, phase: "preview" | "commit"): void {
    const column = globalThis.document.querySelector("[data-calendar-allday-day]");
    const daysDelta = calendarAllDayResizeDays(delta, column?.getBoundingClientRect().width ?? 0);
    const targetDay = addCalendarDate(originDay, daysDelta);
    if (targetDay === null) return;
    const release: CalendarAllDayPointerRelease = {
      originDay,
      originEventId: eventId,
      originEventStart: originDay,
      originHandle: edge,
      targetDay,
    };
    if (phase === "preview") {
      setAllDayPreview(release);
      return;
    }
    setAllDayPreview(null);
    const intent = interpretCalendarAllDayPointer(release);
    dispatchIntent(intent);
    rememberPointerOccurrence(intent, originDay, null);
  }

  function commitTitle(): void {
    const next = titleDraft.trim();
    if (selectedEvent === null || next === selectedEvent.title) {
      setNaming(false);
      return;
    }
    applySelectedPatch({ title: next === "" ? "Event" : next });
    setNaming(false);
  }

  function applySelectedPatch(patch: {
    readonly title?: string;
    readonly start?: string;
    readonly end?: string;
    readonly allDay?: boolean;
    readonly calendarId?: string;
    readonly recurrence?: CalendarRecurrence | null;
  }): void {
    if (selectedEvent === null) return;
    const seriesFields = patch.allDay !== undefined || patch.calendarId !== undefined || patch.recurrence !== undefined;
    const intent: CalendarIntent = !seriesFields && selectedEvent.recurrence !== null && occurrenceStart !== null
      ? {
          type: "occurrence.edit",
          eventId: selectedEvent.id,
          occurrenceStart,
          scope,
          title: patch.title,
          start: patch.start,
          end: patch.end,
        }
      : { type: "event.update", eventId: selectedEvent.id, ...patch };
    if (!dispatchIntent(intent)) return;
    rememberSelectedOccurrence();
  }

  const allDayItems = calendarAllDayLayout(paintedEvents, days);
  const allDayLaneCount = allDayItems[0]?.laneCount ?? 1;

  const timeGrid = (
    <div
      role="grid"
      aria-label={view === "day" ? "Day" : "Week"}
      className="min-w-[36rem]"
      onPointerMove={(event) => {
        timePointerMove(event);
        allDayPointerMove(event);
      }}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(4.5rem, 1fr))` }}
      >
        <div className={classes("px-1 py-2", ui.surface.gridHead)} />
        {days.map((day, index) => (
          <div
            key={day}
            role="columnheader"
            className={classes("px-2 py-2", ui.surface.gridHead, ui.text.meta, day === today && styles.today())}
          >
            {view === "day" ? day : `${weekdays[index]} ${day.slice(8)}`}
          </div>
        ))}
        <div
          className={classes("px-1 py-2 text-right", ui.surface.gridIndex, ui.text.meta)}
          style={{ gridRow: `2 / span ${allDayLaneCount}` }}
        >
          all-day
        </div>
        {days.map((day) => (
          <div
            key={`allday-${day}`}
            data-calendar-allday-day={day}
            className={classes("relative min-h-10", ui.surface.gridCell)}
            style={{ gridRow: `2 / span ${allDayLaneCount}` }}
            onPointerDown={(event) => allDayPointerDown(event, day, null, null, null, null)}
            onPointerUp={allDayPointerUp}
            onPointerCancel={(event) => {
              allDayPointer.cancel(event.pointerId);
              setAllDayPreview(null);
            }}
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
              data-preview={item.event.id === "preview" ? "true" : undefined}
              className={styles.allDayEvent()}
              onPointerDown={(event) => {
                event.stopPropagation();
                allDayPointerDown(event, days[item.startIndex] ?? visibleDate, item.event.id, item.event.start, item.event.end, "body");
              }}
              onPointerUp={allDayPointerUp}
            >
              {item.event.title}
            </SelectableItem>
            {item.event.id === "preview" ? null : (
              <>
                <ResizeHandle
                  label={`Resize ${item.event.title} start`}
                  orientation="horizontal"
                  className="absolute left-0 top-0 h-full w-1.5"
                  onResize={(delta, phase) => resizeAllDay(item.event.id, "start", item.event.start, delta, phase)}
                />
                <ResizeHandle
                  label={`Resize ${item.event.title} end`}
                  orientation="horizontal"
                  className="absolute right-0 top-0 h-full w-1.5"
                  onResize={(delta, phase) => {
                    const last = addCalendarDate(item.event.end, -1) ?? item.event.start;
                    resizeAllDay(item.event.id, "end", last, delta, phase);
                  }}
                />
              </>
            )}
          </div>
        ))}
      </div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(4.5rem, 1fr))`,
          height: (hourEnd - hourStart) * pxPerHour,
        }}
      >
        <div className="relative">
          {Array.from({ length: hourEnd - hourStart }, (_, index) => hourStart + index).map((hour) => (
            <div
              key={hour}
              className={classes("absolute right-1 whitespace-nowrap text-right", ui.text.meta)}
              style={{ top: (hour - hourStart) * pxPerHour }}
            >
              {String(hour).padStart(2, "0")}:00
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
              className={classes("relative overflow-hidden", ui.surface.gridCell)}
              onPointerDown={(event) => timePointerDown(event, day, null, null, null, null)}
              onPointerUp={timePointerUp}
              onPointerCancel={(event) => {
                timePointer.cancel(event.pointerId);
                setTimePreview(null);
              }}
            >
              {Array.from({ length: hourEnd - hourStart }, (_, index) => (
                <div
                  key={index}
                  className={styles.hourRule()}
                  style={{ top: index * pxPerHour }}
                />
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
                    data-preview={item.event.id === "preview" || timePreview?.originEventId === item.event.id ? "true" : undefined}
                    className={styles.timedEvent()}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      timePointerDown(event, day, item.event.id, item.event.start, item.event.end, "body");
                    }}
                    onPointerUp={timePointerUp}
                  >
                    {item.event.title}
                  </SelectableItem>
                  {item.event.id === "preview" ? null : (
                    <>
                      <ResizeHandle
                        label={`Resize ${item.event.title} start`}
                        orientation="vertical"
                        className="absolute inset-x-0 top-0 h-1.5"
                        onResize={(delta, phase) => resizeTimed(item.event.id, "start", item.event.start, item.event.start, delta, phase)}
                      />
                      <ResizeHandle
                        label={`Resize ${item.event.title} end`}
                        orientation="vertical"
                        className="absolute inset-x-0 bottom-0 h-1.5"
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
        canvasClassName="overflow-x-auto"
        toolbar={(
          <>
            <SegmentedControl
              label="View"
              value={view}
              options={[
                { id: "day", label: "Day" },
                { id: "week", label: "Week" },
                { id: "month", label: "Month" },
                { id: "year", label: "Year" },
              ]}
              onValueChange={(value) => setView(value as CalendarView)}
            />
            <IconButton label="Previous" onClick={() => setVisibleDate(shiftView(visibleDate, view, -1))}>
              <ChevronLeft aria-hidden="true" size={16} />
            </IconButton>
            <span className={ui.text.meta}>{periodLabel(view, visibleDate)}</span>
            <IconButton label="Next" onClick={() => setVisibleDate(shiftView(visibleDate, view, 1))}>
              <ChevronRight aria-hidden="true" size={16} />
            </IconButton>
            <ActionButton onClick={() => setLocation(view === "year" ? "month" : view, today)}>
              Today
            </ActionButton>
            <ActionButton onClick={createOnVisibleDate}>
              Create
            </ActionButton>
            <IconButton label="Undo" onClick={() => { editor.undo(); refresh(); rememberSelectedOccurrence(); }}><Undo2 aria-hidden="true" size={16} /></IconButton>
            <IconButton label="Redo" onClick={() => { editor.redo(); refresh(); rememberSelectedOccurrence(); }}><Redo2 aria-hidden="true" size={16} /></IconButton>
            <IconButton label="Delete" onClick={removeSelected}>
              <Trash2 aria-hidden="true" size={16} />
            </IconButton>
          </>
        )}
      >
        <div className="flex min-h-full min-w-0 gap-3">
          <nav aria-label="Calendars" className={styles.sidebar()}>
            <p className={ui.text.label}>Calendars</p>
            {(document.calendars ?? []).map((calendar) => (
              <ToggleButton
                key={calendar.id}
                pressed={!calendar.hidden}
                aria-label={`Show ${calendar.title}`}
                className={styles.calendarToggle()}
                onClick={() => dispatchIntent({
                  type: "calendar.set-hidden",
                  calendarId: calendar.id,
                  hidden: !calendar.hidden,
                })}
              >
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
          <div className="min-w-0 flex-1 overflow-x-auto">
            {view === "day" || view === "week" ? timeGrid : null}
            {view === "month" ? (
              <div role="grid" aria-label="Month" className="grid min-w-[36rem] grid-cols-7">
                {weekdays.map((name) => (
                  <div key={name} role="columnheader" className={classes("px-2 py-2", ui.surface.gridHead, ui.text.meta)}>
                    {name}
                  </div>
                ))}
                {calendarCells("month", visibleDate).map((cell) => {
                  const onDay = calendarEventsOnDay(paintedEvents, cell.date);
                  const layout = calendarMonthDayLayout(paintedEvents, cell.date, monthDayRows);
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
                        ui.surface.gridCell,
                        cell.inVisiblePeriod ? ui.text.body : ui.text.meta,
                        cell.date === today && styles.today(),
                      )}
                      onPointerDown={(event) => monthPointerDown(event, cell.date, null, null, null)}
                      onPointerUp={monthPointerUp}
                      onPointerCancel={(event) => { monthPointer.cancel(event.pointerId); }}
                      onLostPointerCapture={(event) => { monthPointer.cancel(event.pointerId, "lost-capture"); }}
                    >
                      <span>{Number(cell.date.slice(8))}</span>
                      {layout.events.map((item) => (
                        <SelectableItem
                          key={`${item.id}:${item.start}`}
                          selected={selected.has(item.id) && (occurrenceStart === null || occurrenceStart === item.start)}
                          aria-label={monthEventLabel(item)}
                          className={styles.monthEvent()}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            monthPointerDown(event, cell.date, item.id, item.start, item.end);
                          }}
                          onPointerUp={monthPointerUp}
                        >
                          {monthEventLabel(item)}
                        </SelectableItem>
                      ))}
                      {layout.hiddenCount > 0 ? (
                        <button
                          type="button"
                          className={classes(styles.monthMore(), ui.text.meta)}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => setLocation("day", cell.date)}
                        >
                          {`+${layout.hiddenCount} more`}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {view === "year" ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {yearMonths(visibleDate).map((monthStart, index) => (
                  <section key={monthStart} aria-label={monthStart.slice(0, 7)} className={styles.yearMonth()}>
                    <button
                      type="button"
                      className={classes("text-left", ui.text.body)}
                      onClick={() => setLocation("month", monthStart)}
                    >
                      {months[index]}
                    </button>
                    <div role="grid" aria-label={monthStart.slice(0, 7)} className="grid grid-cols-7">
                      {weekdays.map((name) => (
                        <div key={name} role="columnheader" className={classes("text-center", ui.text.meta)}>
                          {name.slice(0, 1)}
                        </div>
                      ))}
                      {calendarCells("month", monthStart).map((cell) => (
                        <button
                          key={cell.date}
                          type="button"
                          aria-label={cell.date}
                          aria-current={cell.date === today ? "date" : undefined}
                          className={classes(
                            styles.yearDay(),
                            cell.inVisiblePeriod ? ui.text.body : ui.text.meta,
                            cell.date === today && styles.today(),
                            yearBusyDates?.has(cell.date) && styles.yearDayBusy(),
                          )}
                          onClick={() => setLocation("day", cell.date)}
                        >
                          {Number(cell.date.slice(8))}
                        </button>
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
                <label className={styles.field()}>
                  <span className={ui.text.label}>Title</span>
                  <input
                    ref={titleRef}
                    aria-label="Title"
                    className={ui.field.control}
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={commitTitle}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitTitle();
                      }
                    }}
                  />
                </label>
                <ToggleButton
                  pressed={selectedEvent.allDay}
                  aria-label="All-day"
                  className="justify-start"
                  onClick={() => applySelectedPatch({ allDay: !selectedEvent.allDay })}
                >
                  All-day
                </ToggleButton>
                <HtmlDateField
                  key={selectedEvent.allDay ? "start-date" : "start-datetime"}
                  type={selectedEvent.allDay ? "date" : "datetime-local"}
                  label="Start"
                  value={occurrenceStart ?? selectedEvent.start}
                  onValueChange={(value) => applySelectedPatch({ start: value })}
                />
                <HtmlDateField
                  key={selectedEvent.allDay ? "end-date" : "end-datetime"}
                  type={selectedEvent.allDay ? "date" : "datetime-local"}
                  label="End"
                  value={selectedEvent.allDay
                    ? (addCalendarDate((occurrenceEnd ?? selectedEvent.end), -1) ?? selectedEvent.end)
                    : (occurrenceEnd ?? selectedEvent.end)}
                  onValueChange={(value) => applySelectedPatch({
                    end: selectedEvent.allDay ? (addCalendarDate(value, 1) ?? value) : value,
                  })}
                />
                <Select
                  label="Calendar"
                  value={selectedEvent.calendarId}
                  options={(document.calendars ?? []).map((calendar) => ({ id: calendar.id, label: calendar.title }))}
                  onValueChange={(value) => applySelectedPatch({ calendarId: value })}
                />
                <SegmentedControl
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
                    recurrence: value === "none" ? null : { freq: value as CalendarRecurrence["freq"], interval: 1, until: "" },
                  })}
                />
                {selectedEvent.recurrence === null ? null : (
                  <SegmentedControl
                    label="Edit occurrence"
                    value={scope}
                    options={[
                      { id: "this", label: "This" },
                      { id: "this-and-following", label: "Following" },
                      { id: "all", label: "All" },
                    ]}
                    onValueChange={(value) => setScope(value as OccurrenceScope)}
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

function monthEventLabel(item: CalendarEvent): string {
  if (isCalendarAllDay(item)) return item.title;
  const time = item.start.includes("T") ? item.start.slice(11, 16) : "";
  return time.length > 0 ? `${time} ${item.title}` : item.title;
}

function clockNow(now = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function yearMonths(visibleDate: string): ReadonlyArray<string> {
  const year = visibleDate.slice(0, 4);
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}-01`);
}

function periodLabel(view: CalendarView, date: string): string {
  if (view === "day") return date;
  return visiblePeriodLabel(view, date);
}

function shiftView(date: string, view: CalendarView, direction: 1 | -1): string {
  if (view === "day") return addCalendarDays(date, direction);
  return shiftVisibleDate(date, view, direction);
}
