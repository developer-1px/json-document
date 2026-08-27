import { useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Redo2, Trash2, Undo2 } from "lucide-react";

import {
  addCalendarDate,
  calendarAllDayLayout,
  calendarEventsInMonth,
  calendarEventsOnDay,
  calendarInstantAt,
  calendarShiftInstant,
  calendarTimedLayout,
  createCalendarEditor,
  interpretCalendarAllDayPointer,
  interpretCalendarMonthPointer,
  interpretCalendarTimeGridPointer,
  type CalendarDocument,
  type CalendarTimeGridHandle,
  type CalendarView,
} from "@interactive-os/json-document-editing";
import {
  addCalendarDays,
  calendarCells,
  shiftVisibleDate,
  startOfIsoWeek,
  visiblePeriodLabel,
} from "@interactive-os/json-document-ui-primitives-react";
import {
  IconButton,
  ResizeHandle,
  SegmentedControl,
  SelectableItem,
} from "@interactive-os/json-document-ui-primitives-react";
import { createWebPointerSession, findWebPointTarget } from "@interactive-os/json-document-web";
import { useDemoEmbed } from "../../shared/demo-workbench/DemoPage";
import { DemoSurface } from "../../shared/demo-workbench/DemoSurface";
import { ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { calendarDemoRecipe } from "./calendar-demo-styles";

const initial: CalendarDocument = {
  events: [
    { id: "daily-news-25", title: "매일 뉴스 브리핑", start: "2026-05-25T09:00", end: "2026-05-25T09:30", allDay: false },
    { id: "weekly-usage", title: "주간 사용량 리포트 요약", start: "2026-05-25T10:00", end: "2026-05-25T10:30", allDay: false },
    { id: "price-monitoring-25", title: "경쟁사 가격 모니터링", start: "2026-05-25T07:00", end: "2026-05-25T07:30", allDay: false },
    { id: "daily-news-26", title: "매일 뉴스 브리핑", start: "2026-05-26T09:00", end: "2026-05-26T09:30", allDay: false },
    { id: "quarterly-sales", title: "2분기 영업 데이터 분석 리포트", start: "2026-05-26T09:30", end: "2026-05-26T10:30", allDay: false },
    { id: "daily-news-27", title: "매일 뉴스 브리핑", start: "2026-05-27T09:00", end: "2026-05-27T09:30", allDay: false },
    { id: "daily-news-28", title: "매일 뉴스 브리핑", start: "2026-05-28T09:00", end: "2026-05-28T09:30", allDay: false },
    { id: "daily-news-29", title: "매일 뉴스 브리핑", start: "2026-05-29T09:00", end: "2026-05-29T09:30", allDay: false },
    { id: "monthly-cost", title: "월말 비용 정리", start: "2026-05-31T18:00", end: "2026-05-31T18:30", allDay: false },
  ],
};

const hourStart = 7;
const hourEnd = 19;
const pxPerHour = 48;
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CalendarDemoRoute() {
  const styles = calendarDemoRecipe();
  const embedded = useDemoEmbed();
  const [editor] = useState(() => {
    let sequence = 0;
    return createCalendarEditor(initial, { createId: () => `event-${++sequence}` });
  });
  const [view, setView] = useState<CalendarView>("week");
  const [visibleDate, setVisibleDate] = useState("2026-05-25");
  const [timePointer] = useState(() => createWebPointerSession<{
    readonly originInstant: string;
    readonly originEventId: string | null;
    readonly originEventStart: string | null;
    readonly originHandle: CalendarTimeGridHandle | null;
    readonly targetInstant: string;
  }>());
  const [allDayPointer] = useState(() => createWebPointerSession<{
    readonly originDay: string;
    readonly originEventId: string | null;
    readonly originEventStart: string | null;
    readonly originHandle: "body" | "start" | "end" | null;
  }>());
  const [monthPointer] = useState(() => createWebPointerSession<{
    readonly originDay: string;
    readonly originEventId: string | null;
  }>());
  const [, setRevision] = useState(0);
  const refresh = () => setRevision((value) => value + 1);
  const document = editor.snapshot.value as CalendarDocument;
  const selected = new Set(editor.snapshot.selection.keys);
  const weekStart = startOfIsoWeek(visibleDate);
  const days = view === "day"
    ? [visibleDate]
    : Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index));

  function dispatchIntent(intent: Parameters<typeof editor.dispatch>[0] | null): void {
    if (intent) editor.dispatch(intent);
    refresh();
  }

  function instantAt(day: string, clientY: number, grid: Element): string | null {
    const rect = grid.getBoundingClientRect();
    const minutes = Math.round((hourStart * 60 + ((clientY - rect.top) / rect.height) * (hourEnd - hourStart) * 60) / 15) * 15;
    return calendarInstantAt(day, minutes);
  }

  function timePointerDown(
    event: PointerEvent<HTMLElement>,
    day: string,
    originEventId: string | null,
    originEventStart: string | null,
    originHandle: CalendarTimeGridHandle | null,
  ): void {
    if (event.button !== 0) return;
    const grid = event.currentTarget.closest("[data-calendar-grid=\"time\"]");
    if (grid === null) return;
    const originInstant = instantAt(day, event.clientY, grid);
    if (originInstant === null) return;
    timePointer.begin(event.currentTarget, event.pointerId, {
      originInstant,
      originEventId,
      originEventStart,
      originHandle,
      targetInstant: originInstant,
    });
  }

  function timePointerMove(event: PointerEvent<HTMLElement>): void {
    if (timePointer.getSnapshot()?.pointerId !== event.pointerId) return;
    const grid = findWebPointTarget<Element>("[data-calendar-grid=\"time\"]", { x: event.clientX, y: event.clientY });
    const targetDay = grid?.getAttribute("data-calendar-day");
    if (grid === null || grid === undefined || targetDay === null || targetDay === undefined) return;
    const targetInstant = instantAt(targetDay, event.clientY, grid);
    if (targetInstant === null) return;
    timePointer.preview(event.pointerId, (state) => ({ ...state, targetInstant }));
  }

  function timePointerUp(event: PointerEvent<HTMLElement>): void {
    const origin = timePointer.commit(event.pointerId);
    if (origin === null) return;
    dispatchIntent(interpretCalendarTimeGridPointer({
      originInstant: origin.originInstant,
      originEventId: origin.originEventId,
      originEventStart: origin.originEventStart,
      originHandle: origin.originHandle,
      targetInstant: origin.targetInstant,
    }));
  }

  function allDayPointerDown(
    event: PointerEvent<HTMLElement>,
    day: string,
    originEventId: string | null,
    originEventStart: string | null,
    originHandle: "body" | "start" | "end" | null,
  ): void {
    if (event.button !== 0) return;
    allDayPointer.begin(event.currentTarget, event.pointerId, {
      originDay: day,
      originEventId,
      originEventStart,
      originHandle,
    });
  }

  function allDayPointerUp(event: PointerEvent<HTMLElement>): void {
    const origin = allDayPointer.commit(event.pointerId);
    if (origin === null) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-allday-day]", { x: event.clientX, y: event.clientY })
      ?.getAttribute("data-calendar-allday-day");
    if (targetDay === null || targetDay === undefined) return;
    dispatchIntent(interpretCalendarAllDayPointer({
      originDay: origin.originDay,
      originEventId: origin.originEventId,
      originEventStart: origin.originEventStart,
      originHandle: origin.originHandle,
      targetDay,
    }));
  }

  function monthPointerDown(event: PointerEvent<HTMLButtonElement>, day: string): void {
    if (event.button !== 0) return;
    const occupant = calendarEventsOnDay(document.events, day)[0];
    monthPointer.begin(event.currentTarget, event.pointerId, {
      originDay: day,
      originEventId: occupant?.id ?? null,
    });
  }

  function monthPointerUp(event: PointerEvent<HTMLButtonElement>): void {
    const origin = monthPointer.commit(event.pointerId);
    if (origin === null) return;
    const targetDay = findWebPointTarget<Element>("[data-calendar-day]", { x: event.clientX, y: event.clientY })
      ?.getAttribute("data-calendar-day");
    if (targetDay === null || targetDay === undefined) return;
    dispatchIntent(interpretCalendarMonthPointer({
      originDay: origin.originDay,
      originEventId: origin.originEventId,
      targetDay,
      eventsOnTargetDay: calendarEventsOnDay(document.events, targetDay).map((item) => ({ id: item.id })),
    }));
  }

  function resizeTimed(eventId: string, edge: "start" | "end", origin: string, delta: number, phase: "preview" | "commit"): void {
    if (phase !== "commit") return;
    const minutes = Math.round(delta / (pxPerHour / 60) / 15) * 15;
    const targetInstant = calendarShiftInstant(origin, minutes);
    if (targetInstant === null) return;
    dispatchIntent(interpretCalendarTimeGridPointer({
      originInstant: origin,
      originEventId: eventId,
      originEventStart: origin,
      originHandle: edge,
      targetInstant,
    }));
  }

  function resizeAllDay(eventId: string, edge: "start" | "end", originDay: string, delta: number, phase: "preview" | "commit"): void {
    if (phase !== "commit") return;
    const daysDelta = Math.round(delta / 80);
    const targetDay = addCalendarDate(originDay, daysDelta);
    if (targetDay === null) return;
    dispatchIntent(interpretCalendarAllDayPointer({
      originDay,
      originEventId: eventId,
      originEventStart: originDay,
      originHandle: edge,
      targetDay,
    }));
  }

  const timeGrid = (
    <div
      role="grid"
      aria-label={view === "day" ? "Day" : "Week"}
      className="min-w-[36rem]"
      onPointerMove={timePointerMove}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(4.5rem, 1fr))` }}
      >
        <div className={classes("px-1 py-2", ui.surface.gridHead)} />
        {days.map((day, index) => (
          <div key={day} role="columnheader" className={classes("px-2 py-2", ui.surface.gridHead, ui.text.meta)}>
            {view === "day" ? day : `${weekdays[index]} ${day.slice(8)}`}
          </div>
        ))}
        <div className={classes("px-1 py-2 text-right", ui.surface.gridIndex, ui.text.meta)}>all-day</div>
        {days.map((day) => (
          <div
            key={`allday-${day}`}
            data-calendar-allday-day={day}
            className={classes("relative min-h-10", ui.surface.gridCell)}
            onPointerDown={(event) => allDayPointerDown(event, day, null, null, null)}
            onPointerUp={allDayPointerUp}
            onPointerCancel={(event) => { allDayPointer.cancel(event.pointerId); }}
          />
        ))}
        {calendarAllDayLayout(document.events, days).map((item) => (
          <div
            key={item.event.id}
            data-calendar-allday-day={days[item.startIndex]}
            className="relative z-10 mx-0.5 my-1"
            style={{ gridColumn: `${item.startIndex + 2} / span ${item.span}`, gridRow: 2 }}
          >
            <SelectableItem
              selected={selected.has(item.event.id)}
              aria-label={item.event.title}
              className={classes(styles.allDayEvent(), ui.surface.selectableBlock, ui.interactive.selectable)}
              onPointerDown={(event) => {
                event.stopPropagation();
                allDayPointerDown(event, days[item.startIndex] ?? visibleDate, item.event.id, item.event.start, "body");
              }}
              onPointerUp={allDayPointerUp}
            >
              {item.event.title}
            </SelectableItem>
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
        {days.map((day) => (
          <div
            key={day}
            data-calendar-day={day}
            data-calendar-grid="time"
            className={classes("relative", ui.surface.gridCell)}
            onPointerDown={(event) => timePointerDown(event, day, null, null, null)}
            onPointerUp={timePointerUp}
            onPointerCancel={(event) => { timePointer.cancel(event.pointerId); }}
          >
            {Array.from({ length: hourEnd - hourStart }, (_, index) => (
              <div
                key={index}
                className={styles.hourRule()}
                style={{ top: index * pxPerHour }}
              />
            ))}
            {calendarTimedLayout(document.events, day).map((item) => (
              <div
                key={item.event.id}
                className="absolute z-10"
                style={{
                  top: (item.startMinutes - hourStart * 60) * (pxPerHour / 60),
                  height: Math.max(18, (item.endMinutes - item.startMinutes) * (pxPerHour / 60)),
                  left: `calc(${item.lane / item.laneCount * 100}% + 0.25rem)`,
                  width: `calc(${100 / item.laneCount}% - 0.5rem)`,
                }}
              >
                <SelectableItem
                  selected={selected.has(item.event.id)}
                  aria-label={item.event.title}
                  className={classes(styles.timedEvent(), ui.surface.selectableBlock, ui.interactive.selectable)}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    timePointerDown(event, day, item.event.id, item.event.start, "body");
                  }}
                  onPointerUp={timePointerUp}
                >
                  {item.event.title}
                </SelectableItem>
                <ResizeHandle
                  label={`Resize ${item.event.title} start`}
                  orientation="vertical"
                  className="absolute inset-x-0 top-0 h-1.5"
                  onResize={(delta, phase) => resizeTimed(item.event.id, "start", item.event.start, delta, phase)}
                />
                <ResizeHandle
                  label={`Resize ${item.event.title} end`}
                  orientation="vertical"
                  className="absolute inset-x-0 bottom-0 h-1.5"
                  onResize={(delta, phase) => resizeTimed(item.event.id, "end", item.event.end, delta, phase)}
                />
              </div>
            ))}
          </div>
        ))}
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
            <IconButton label="Undo" onClick={() => { editor.undo(); refresh(); }}><Undo2 aria-hidden="true" size={16} /></IconButton>
            <IconButton label="Redo" onClick={() => { editor.redo(); refresh(); }}><Redo2 aria-hidden="true" size={16} /></IconButton>
            <IconButton label="Delete" onClick={() => { editor.dispatch({ type: "selection.remove" }); refresh(); }}>
              <Trash2 aria-hidden="true" size={16} />
            </IconButton>
          </>
        )}
      >
        {view === "day" || view === "week" ? timeGrid : null}
        {view === "month" ? (
          <div role="grid" aria-label="Month" className="grid min-w-[36rem] grid-cols-7">
            {weekdays.map((name) => (
              <div key={name} role="columnheader" className={classes("px-2 py-2", ui.surface.gridHead, ui.text.meta)}>
                {name}
              </div>
            ))}
            {calendarCells("month", visibleDate).map((cell) => {
              const onDay = calendarEventsOnDay(document.events, cell.date);
              return (
                <SelectableItem
                  key={cell.date}
                  selected={onDay.some((event) => selected.has(event.id))}
                  aria-label={cell.date}
                  data-calendar-day={cell.date}
                  className={classes(
                    styles.monthDay(),
                    ui.surface.gridCell,
                    ui.interactive.selectable,
                    cell.inVisiblePeriod ? ui.text.body : ui.text.meta,
                  )}
                  onPointerDown={(event) => monthPointerDown(event, cell.date)}
                  onPointerUp={monthPointerUp}
                  onPointerCancel={(event) => { monthPointer.cancel(event.pointerId); }}
                  onLostPointerCapture={(event) => { monthPointer.cancel(event.pointerId, "lost-capture"); }}
                >
                  <span>{cell.date.slice(8)}</span>
                  {onDay.map((event) => (
                    <span key={event.id} className={ui.text.meta}>{event.title}</span>
                  ))}
                </SelectableItem>
              );
            })}
          </div>
        ) : null}
        {view === "year" ? (
          <div
            role="grid"
            aria-label="Year"
            tabIndex={0}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
            onKeyDown={(event) => {
              if (event.key !== " ") return;
              event.preventDefault();
              setView("month");
            }}
          >
            {yearMonths(visibleDate).map((monthStart, index) => {
              const onMonth = calendarEventsInMonth(document.events, monthStart.slice(0, 7));
              return (
                <SelectableItem
                  key={monthStart}
                  selected={false}
                  aria-label={monthStart}
                  className={classes("flex min-h-24 w-full flex-col items-start gap-1 px-3 py-3 text-left", ui.surface.gridCell, ui.interactive.selectable)}
                  onClick={() => { setVisibleDate(monthStart); setView("month"); }}
                >
                  <span className={ui.text.body}>{months[index]}</span>
                  <span className={ui.text.meta}>
                    {onMonth.length > 0 ? onMonth.map((event) => event.title).join(" · ") : " "}
                  </span>
                </SelectableItem>
              );
            })}
          </div>
        ) : null}
      </ProductApp>
    </DemoSurface>
  );
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
