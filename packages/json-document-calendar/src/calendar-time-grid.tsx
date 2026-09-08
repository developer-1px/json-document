import { type MouseEvent, type ReactNode, type Ref } from "react";
import {
  calendarAllDayLayout,
  calendarAllDaySpan,
  calendarIntervalLastDate,
  calendarNowMarker,
  calendarShiftInstant,
  calendarTimedLayout,
  calendarVisibleHourBand,
  type CalendarEvent,
  type CalendarOccurrenceTopologySnapshot,
} from "@interactive-os/json-document-editing";
import { selectionModeFromModifiers } from "@interactive-os/json-document-react";
import { contentInteractionAttributes, ResizeHandle, SelectableItem, type ControlAffordance } from "@interactive-os/json-document-ui-primitives-react";
import { calendarTimeLabel, type CalendarCell } from "./date-values.js";
import type { CalendarHand } from "./use-calendar-hand.js";
import type { CalendarPointerInteractions } from "./use-calendar-pointer-interactions.js";

export interface CalendarTimeGridAffordances {
  readonly allDayCell: ControlAffordance;
  readonly allDayEvent: ControlAffordance;
  readonly eventResizeEnd: ControlAffordance;
  readonly timeCell: ControlAffordance;
  readonly selectedSlot: ControlAffordance;
  readonly timedEvent: ControlAffordance;
}

export interface CalendarTimeGridClassNames {
  readonly root?: string;
  readonly rootFill?: string;
  readonly stickyHeader?: string;
  readonly columnHeader?: string;
  readonly weekday?: string;
  readonly dayNumber?: string;
  readonly today?: string;
  readonly allDayLabel?: string;
  readonly allDayCell?: string;
  readonly allDayEventContainer?: string;
  readonly allDayEvent?: string;
  readonly resizeAllDayEnd?: string;
  readonly timeViewport?: string;
  readonly timeViewportFill?: string;
  readonly hourGutter?: string;
  readonly viewportAnchor?: string;
  readonly hourLabel?: string;
  readonly timeCell?: string;
  readonly selectedSlot?: string;
  readonly hourRule?: string;
  readonly nowLine?: string;
  readonly creationTimeHint?: string;
  readonly timedEventContainer?: string;
  readonly timedEvent?: string;
  readonly eventTitle?: string;
  readonly eventTime?: string;
  readonly resizeTimedEnd?: string;
}

export interface CalendarTimeGridLabels {
  readonly grid: string;
  readonly allDay: string;
  readonly now: string;
  resizeEnd(event: CalendarEvent): string;
  hour(hour: number): string;
}

export interface CalendarTimeGridProps {
  readonly cells: ReadonlyArray<CalendarCell>;
  readonly weekdays: ReadonlyArray<string>;
  readonly events: ReadonlyArray<CalendarEvent>;
  readonly today: string;
  readonly nowInstant: string;
  readonly hourStart: number;
  readonly hourEnd: number;
  readonly workHourStart: number;
  readonly stepMinutes: number;
  readonly defaultTimedDurationMinutes: number;
  readonly pixelsPerHour: number;
  readonly fillViewport: boolean;
  readonly hand: CalendarHand;
  readonly interactions: CalendarPointerInteractions;
  readonly selectionTopology: CalendarOccurrenceTopologySnapshot;
  readonly affordances: CalendarTimeGridAffordances;
  readonly classNames: CalendarTimeGridClassNames;
  readonly labels: CalendarTimeGridLabels;
  readonly timeViewportRef?: Ref<HTMLDivElement>;
  readonly primaryEventRef?: Ref<HTMLDivElement>;
  readonly getEventColor: (event: CalendarEvent) => string;
}

/** Owns the canonical day/week time grid, all-day lane, and occurrence interactions. */
export function CalendarTimeGrid(props: CalendarTimeGridProps): ReactNode {
  const days = props.cells.map((cell) => cell.date);
  const allDayItems = calendarAllDayLayout(props.events, days);
  const allDayLaneCount = allDayItems[0]?.laneCount ?? 1;
  const selectedSlot = props.hand.selectedEvent === null ? props.hand.occurrence.start : null;
  const { hand, interactions } = props;

  function selectEvent(event: CalendarEvent, modifiers: Pick<MouseEvent, "shiftKey" | "metaKey" | "ctrlKey">): void {
    hand.selectOccurrence(event.id, event.start, event.end, selectionModeFromModifiers(modifiers), props.selectionTopology);
  }

  function createAllDay(day: string): void {
    const span = calendarAllDaySpan(day, day);
    if (span !== null) hand.createInterval(span.start, span.end, { allDay: true });
  }

  function createTimed(day: string, clientY: number, element: Element): void {
    const grid = element.closest('[data-calendar-grid="time"]');
    if (grid === null) return;
    const start = interactions.instantAt(day, clientY, grid);
    const end = start === null ? null : calendarShiftInstant(start, props.defaultTimedDurationMinutes);
    if (start !== null && end !== null) hand.createInterval(start, end);
  }

  const gridColumns = `4rem repeat(${days.length}, minmax(4.5rem, 1fr))`;
  const gridHeight = (props.hourEnd - props.hourStart) * props.pixelsPerHour;
  return (
    <div
      role="grid"
      aria-multiselectable="true"
      aria-label={props.labels.grid}
      className={joinClasses(props.classNames.root, props.fillViewport ? props.classNames.rootFill : undefined)}
      onPointerMove={(event) => {
        interactions.timePointerMove(event);
        interactions.allDayPointerMove(event);
      }}
      onPointerLeave={interactions.clearTimeHover}
    >
      <div className={props.classNames.stickyHeader} style={{ gridTemplateColumns: gridColumns }}>
        <div className={props.classNames.columnHeader} />
        {props.cells.map((cell) => (
          <div key={cell.date} role="columnheader" className={props.classNames.columnHeader}>
            <span className={props.classNames.weekday}>{props.weekdays[cell.weekday % 7]}</span>
            <span className={joinClasses(props.classNames.dayNumber, cell.date === props.today ? props.classNames.today : undefined)}>{cell.day}</span>
          </div>
        ))}
        <div className={props.classNames.allDayLabel} style={{ gridRow: `2 / span ${allDayLaneCount}` }}>{props.labels.allDay}</div>
        {days.map((day) => (
          <div
            key={`allday-${day}`}
            data-calendar-allday-day={day}
            tabIndex={-1}
            {...contentInteractionAttributes({ role: "insertion", active: selectedSlot === day })}
            data-ui-affordance={props.affordances.allDayCell}
            className={props.classNames.allDayCell}
            style={{ gridRow: `2 / span ${allDayLaneCount}` }}
            onPointerDown={(event) => interactions.allDayPointerDown(event, day, null, null, null, null)}
            onPointerUp={interactions.allDayPointerUp}
            onDoubleClick={() => createAllDay(day)}
            onPointerCancel={(event) => interactions.cancelAllDayPointer(event.pointerId)}
          />
        ))}
        {allDayItems.map((item) => (
          <div
            key={`${item.event.id}:${item.event.start}`}
            ref={hand.isPrimaryOccurrence(item.event.id, item.event.start) ? props.primaryEventRef : undefined}
            data-calendar-event-anchor={hand.isPrimaryOccurrence(item.event.id, item.event.start) ? "primary" : undefined}
            data-calendar-allday-day={days[item.startIndex]}
            className={props.classNames.allDayEventContainer}
            style={{ gridColumn: `${item.startIndex + 2} / span ${item.span}`, gridRow: 2 + item.lane }}
          >
            <SelectableItem
              affordance={props.affordances.allDayEvent}
              selected={hand.isOccurrenceSelected(item.event.id, item.event.start)}
              primary={hand.isPrimaryOccurrence(item.event.id, item.event.start)}
              dragging={hand.selectionDragPreview?.source.points.some((point) => point.eventId === item.event.id) ?? false}
              aria-label={item.event.title}
              data-calendar-color={props.getEventColor(item.event)}
              data-calendar-move-surface="true"
              data-preview={item.event.id === "preview" ? "true" : undefined}
              className={props.classNames.allDayEvent}
              onPointerDown={(event) => {
                event.stopPropagation();
                interactions.allDayPointerDown(event, days[item.startIndex] ?? item.event.start, item.event.id, item.event.start, item.event.end, "body");
              }}
              onPointerUp={interactions.allDayPointerUp}
              onClick={(event) => {
                event.stopPropagation();
                if (!interactions.consumeEventClick()) selectEvent(item.event, event);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                if (!interactions.consumeEventDoubleClick()) hand.beginTitleRename(item.event.id);
              }}
            >{item.event.title}</SelectableItem>
            {item.event.id === "preview" ? null : (
              <ResizeHandle
                affordance={props.affordances.eventResizeEnd}
                label={props.labels.resizeEnd(item.event)}
                orientation="horizontal"
                {...(props.classNames.resizeAllDayEnd === undefined ? {} : { className: props.classNames.resizeAllDayEnd })}
                onResize={(delta, phase) => {
                  const last = calendarIntervalLastDate(item.event.start, item.event.end, true);
                  interactions.resizeAllDay(item.event.id, "end", last, item.event.start, delta, phase);
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div
        ref={props.timeViewportRef}
        data-calendar-time-viewport=""
        className={joinClasses(props.classNames.timeViewport, props.fillViewport ? props.classNames.timeViewportFill : undefined)}
        style={{ gridTemplateColumns: gridColumns, height: props.fillViewport ? undefined : gridHeight }}
      >
        <div className={props.classNames.hourGutter} style={{ height: gridHeight }}>
          <div
            aria-hidden="true"
            data-calendar-viewport-hour={String(props.workHourStart).padStart(2, "0")}
            className={props.classNames.viewportAnchor}
            style={{ transform: `translateY(${(props.workHourStart - props.hourStart) * props.pixelsPerHour}px)` }}
          />
          {Array.from({ length: props.hourEnd - props.hourStart }, (_, index) => index === 0 ? null : props.hourStart + index).map((hour) => hour === null ? null : (
            <div key={hour} data-calendar-hour={String(hour).padStart(2, "0")} className={props.classNames.hourLabel} style={{ top: (hour - props.hourStart) * props.pixelsPerHour }}>
              {props.labels.hour(hour)}
            </div>
          ))}
        </div>
        {days.map((day) => <TimeColumn key={day} day={day} gridHeight={gridHeight} selectedSlot={selectedSlot} props={props} onCreateTimed={createTimed} onSelectEvent={selectEvent} />)}
      </div>
    </div>
  );
}

function TimeColumn(input: {
  readonly day: string;
  readonly gridHeight: number;
  readonly selectedSlot: string | null;
  readonly props: CalendarTimeGridProps;
  readonly onCreateTimed: (day: string, clientY: number, element: Element) => void;
  readonly onSelectEvent: (event: CalendarEvent, modifiers: Pick<MouseEvent, "shiftKey" | "metaKey" | "ctrlKey">) => void;
}): ReactNode {
  const { day, props } = input;
  const { hand, interactions } = props;
  const now = calendarNowMarker(props.nowInstant, day);
  const nowTop = now === null ? null : (now.minutes - props.hourStart * 60) * (props.pixelsPerHour / 60);
  const nowVisible = nowTop !== null && nowTop >= 0 && nowTop <= input.gridHeight;
  return (
    <div
      data-calendar-day={day}
      data-calendar-grid="time"
      tabIndex={-1}
      data-ui-affordance={props.affordances.timeCell}
      data-ui-presentation="calendar-time-grid"
      className={props.classNames.timeCell}
      style={{ height: input.gridHeight }}
      onPointerDown={(event) => interactions.timePointerDown(event, day, null, null, null, null)}
      onPointerUp={interactions.timePointerUp}
      onDoubleClick={(event) => input.onCreateTimed(day, event.clientY, event.currentTarget)}
      onPointerCancel={(event) => interactions.cancelTimePointer(event.pointerId)}
    >
      {input.selectedSlot?.startsWith(`${day}T`) ? (
        <div
          data-calendar-selected-slot={input.selectedSlot}
          {...contentInteractionAttributes({ role: "insertion", active: true })}
          data-ui-affordance={props.affordances.selectedSlot}
          className={props.classNames.selectedSlot}
          style={{
            top: (Number(input.selectedSlot.slice(11, 13)) * 60 + Number(input.selectedSlot.slice(14, 16)) - props.hourStart * 60) * (props.pixelsPerHour / 60),
            height: props.stepMinutes * (props.pixelsPerHour / 60),
          }}
        />
      ) : null}
      {Array.from({ length: props.hourEnd - props.hourStart }, (_, index) => index === 0 ? null : (
        <div key={index} className={props.classNames.hourRule} style={{ top: index * props.pixelsPerHour }} />
      ))}
      {nowVisible ? <div role="presentation" aria-label={props.labels.now} className={props.classNames.nowLine} style={{ top: nowTop }} /> : null}
      {interactions.hoveredTime?.day === day && hand.timePreview === null ? (
        <div data-calendar-create-time="" className={props.classNames.creationTimeHint} style={{ top: (interactions.hoveredTime.minutes - props.hourStart * 60) * (props.pixelsPerHour / 60) }}>
          {calendarTimeLabel(interactions.hoveredTime.instant)}
        </div>
      ) : null}
      {calendarTimedLayout(props.events, day).map((item) => {
        const band = calendarVisibleHourBand(item.startMinutes, item.endMinutes, props.hourStart, props.hourEnd);
        if (band === null) return null;
        return (
          <div
            key={`${item.event.id}:${item.event.start}`}
            ref={hand.isPrimaryOccurrence(item.event.id, item.event.start) ? props.primaryEventRef : undefined}
            data-calendar-event-anchor={hand.isPrimaryOccurrence(item.event.id, item.event.start) ? "primary" : undefined}
            className={props.classNames.timedEventContainer}
            style={{
              top: (band.startMinutes - props.hourStart * 60) * (props.pixelsPerHour / 60),
              height: Math.max(18, (band.endMinutes - band.startMinutes) * (props.pixelsPerHour / 60)),
              left: `calc(${item.lane / item.laneCount * 100}% + 0.25rem)`,
              width: `calc(${100 / item.laneCount}% - 0.5rem)`,
            }}
          >
            <SelectableItem
              affordance={props.affordances.timedEvent}
              selected={hand.isOccurrenceSelected(item.event.id, item.event.start)}
              primary={hand.isPrimaryOccurrence(item.event.id, item.event.start)}
              dragging={hand.selectionDragPreview?.source.points.some((point) => point.eventId === item.event.id) ?? false}
              aria-label={item.event.title}
              data-calendar-event=""
              data-calendar-color={props.getEventColor(item.event)}
              data-calendar-move-surface="true"
              data-preview={item.event.id === "preview" || hand.timePreview?.originEventId === item.event.id ? "true" : undefined}
              className={props.classNames.timedEvent}
              onPointerDown={(event) => {
                event.stopPropagation();
                interactions.timePointerDown(event, day, item.event.id, item.event.start, item.event.end, "body");
              }}
              onPointerUp={interactions.timePointerUp}
              onClick={(event) => {
                event.stopPropagation();
                if (!interactions.consumeEventClick()) input.onSelectEvent(item.event, event);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                if (!interactions.consumeEventDoubleClick()) hand.beginTitleRename(item.event.id);
              }}
            >
              <span className={props.classNames.eventTitle}>{item.event.title}</span>
              <span className={props.classNames.eventTime}>{calendarTimeLabel(item.event.start)}</span>
            </SelectableItem>
            {item.event.id === "preview" ? null : (
              <ResizeHandle
                affordance={props.affordances.eventResizeEnd}
                label={props.labels.resizeEnd(item.event)}
                orientation="vertical"
                {...(props.classNames.resizeTimedEnd === undefined ? {} : { className: props.classNames.resizeTimedEnd })}
                onResize={(delta, phase) => interactions.resizeTimed(item.event.id, "end", item.event.start, item.event.end, delta, phase)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function joinClasses(...values: ReadonlyArray<string | undefined>): string | undefined {
  const joined = values.filter((value): value is string => value !== undefined && value.length > 0).join(" ");
  return joined.length === 0 ? undefined : joined;
}
