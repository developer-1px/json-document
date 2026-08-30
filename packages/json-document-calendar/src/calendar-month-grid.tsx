import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import {
  calendarAllDaySpan,
  calendarEventsOnDay,
  calendarIntervalLastDate,
  calendarMonthDayLayout,
  calendarMonthWeekLayout,
  isCalendarAllDay,
  type CalendarEvent,
  type CalendarOccurrenceTopologySnapshot,
} from "@interactive-os/json-document-editing";
import { selectionModeFromModifiers } from "@interactive-os/json-document-react";
import {
  Command,
  ResizeHandle,
  SelectableItem,
  type ControlAffordance,
} from "@interactive-os/json-document-ui-primitives-react";
import { calendarEventLabel } from "./calendar-event-label.js";
import { calendarMonthWeeks, calendarTimeLabel, type CalendarCell } from "./date-values.js";
import type { CalendarHand } from "./use-calendar-hand.js";
import type { CalendarPointerInteractions } from "./use-calendar-pointer-interactions.js";

export interface CalendarMonthGridHandle {
  dismissOverflow(): boolean;
}

export interface CalendarMonthGridAffordances {
  readonly dateCell: ControlAffordance;
  readonly event: ControlAffordance;
  readonly eventResizeEnd: ControlAffordance;
  readonly moreDisclosure: ControlAffordance;
  readonly overflowDate: ControlAffordance;
  readonly overflowEvent: ControlAffordance;
}

export interface CalendarMonthGridClassNames {
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

export interface CalendarMonthGridLabels {
  readonly grid: string;
  overflow(date: string): string;
  more(count: number): string;
  resizeEnd(event: CalendarEvent): string;
}

export interface CalendarMonthGridProps {
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

/** Owns the canonical occurrence-bearing month grid and its interaction bindings. */
export const CalendarMonthGrid = forwardRef<CalendarMonthGridHandle, CalendarMonthGridProps>(
  function CalendarMonthGrid(props, ref): ReactNode {
    const [overflowDay, setOverflowDay] = useState<string | null>(null);
    useEffect(() => setOverflowDay(null), [props.visibleDate]);
    useImperativeHandle(ref, () => ({
      dismissOverflow() {
        if (overflowDay === null) return false;
        setOverflowDay(null);
        return true;
      },
    }), [overflowDay]);

    const { hand, interactions } = props;

    function selectEvent(event: CalendarEvent, modifiers: Pick<MouseEvent, "shiftKey" | "metaKey" | "ctrlKey">): void {
      hand.selectOccurrence(
        event.id,
        event.start,
        event.end,
        selectionModeFromModifiers(modifiers),
        props.selectionTopology,
      );
    }

    function createAllDayOn(day: string): void {
      const span = calendarAllDaySpan(day, day);
      if (span !== null) hand.createInterval(span.start, span.end, { allDay: true });
    }

    return (
      <div
        role="grid"
        aria-label={props.labels.grid}
        aria-multiselectable="true"
        className={props.classNames.root}
        onPointerMove={interactions.monthPointerMove}
      >
        <div role="row" className={props.classNames.headerRow}>
          {props.weekdays.map((name) => (
            <div key={name} role="columnheader" className={props.classNames.header}>{name}</div>
          ))}
        </div>
        {calendarMonthWeeks(props.visibleDate).map((week) => {
          const dates = week.map((cell) => cell.date);
          const layout = calendarMonthWeekLayout(props.events, dates, props.rowLimit);
          return (
            <div
              key={dates[0]}
              role="row"
              data-calendar-week={dates[0]}
              className={props.classNames.week}
              style={{ gridTemplateRows: `1.75rem repeat(${layout.laneCount}, 1.25rem) minmax(2.5rem, 1fr)` }}
            >
              {week.map((cell, index) => (
                <MonthDayCell
                  key={cell.date}
                  cell={cell}
                  index={index}
                  dates={dates}
                  laneCount={layout.laneCount}
                  hiddenCount={layout.hiddenCounts[index] ?? 0}
                  overflow={overflowDay === cell.date}
                  props={props}
                  onOpenOverflow={() => setOverflowDay(cell.date)}
                  onCreateAllDay={createAllDayOn}
                  onSelectEvent={selectEvent}
                />
              ))}
              {overflowDay === null ? layout.items.map((item) => {
                const weekLast = dates.at(-1);
                const lastDay = calendarIntervalLastDate(item.event.start, item.event.end, true);
                const clippedEnd = isCalendarAllDay(item.event) && weekLast !== undefined && lastDay > weekLast;
                const stableStart = hand.allDayPreview?.originEventId === item.event.id
                  ? hand.allDayPreview.originEventStart ?? item.event.start
                  : item.event.start;
                return (
                  <div
                    key={`${item.event.id}:${stableStart}`}
                    ref={hand.isPrimaryOccurrence(item.event.id, item.event.start) ? props.primaryEventRef : undefined}
                    data-calendar-event-anchor={hand.isPrimaryOccurrence(item.event.id, item.event.start) ? "primary" : undefined}
                    data-calendar-span={String(item.span)}
                    className={props.classNames.eventContainer}
                    style={{ gridColumn: `${item.startIndex + 1} / span ${item.span}`, gridRow: 2 + item.lane }}
                  >
                    <MonthEvent
                      event={item.event}
                      affordance={props.affordances.event}
                      classNames={props.classNames}
                      color={props.getEventColor(item.event)}
                      selected={hand.isOccurrenceSelected(item.event.id, item.event.start)}
                      primary={hand.isPrimaryOccurrence(item.event.id, item.event.start)}
                      preview={item.event.id === "preview"}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        interactions.monthPointerDown(event, dates[item.startIndex] ?? props.visibleDate, dates, item.event.id, item.event.start, item.event.end);
                      }}
                      onPointerUp={interactions.monthPointerUp}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!interactions.consumeEventClick()) selectEvent(item.event, event);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        if (!interactions.consumeEventDoubleClick()) hand.beginTitleRename(item.event.id);
                      }}
                    />
                    {item.event.id === "preview" || !isCalendarAllDay(item.event) || clippedEnd ? null : (
                      <ResizeHandle
                        affordance={props.affordances.eventResizeEnd}
                        label={props.labels.resizeEnd(item.event)}
                        orientation="horizontal"
                        {...(props.classNames.resizeEnd === undefined ? {} : { className: props.classNames.resizeEnd })}
                        onResize={(delta, phase) => {
                          const last = calendarIntervalLastDate(item.event.start, item.event.end, true);
                          interactions.resizeAllDay(item.event.id, "end", last, item.event.start, delta, phase);
                        }}
                      />
                    )}
                  </div>
                );
              }) : null}
            </div>
          );
        })}
      </div>
    );
  },
);

function MonthDayCell(input: {
  readonly cell: CalendarCell;
  readonly index: number;
  readonly dates: ReadonlyArray<string>;
  readonly laneCount: number;
  readonly hiddenCount: number;
  readonly overflow: boolean;
  readonly props: CalendarMonthGridProps;
  readonly onOpenOverflow: () => void;
  readonly onCreateAllDay: (date: string) => void;
  readonly onSelectEvent: (event: CalendarEvent, modifiers: Pick<MouseEvent, "shiftKey" | "metaKey" | "ctrlKey">) => void;
}): ReactNode {
  const { cell, props } = input;
  const onDay = calendarEventsOnDay(props.events, cell.date);
  const { hand, interactions } = props;
  const selectedDate = hand.selectedEvent === null ? hand.occurrence.start : null;
  return (
    <div
      role="gridcell"
      aria-label={cell.date}
      aria-selected={onDay.some((event) => hand.isOccurrenceSelected(event.id, event.start)) || selectedDate === cell.date}
      aria-current={cell.date === props.today ? "date" : undefined}
      data-calendar-day={cell.date}
      tabIndex={-1}
      data-selected={selectedDate === cell.date ? "true" : undefined}
      data-ui-affordance={props.affordances.dateCell}
      className={joinClasses(
        props.classNames.day,
        cell.inVisiblePeriod ? props.classNames.dayInPeriod : props.classNames.dayOutsidePeriod,
        input.overflow ? props.classNames.dayOverflow : undefined,
      )}
      style={{ gridColumn: input.index + 1, gridRow: "1 / -1" }}
      onPointerDown={(event) => interactions.monthPointerDown(event, cell.date, input.dates, null, null, null)}
      onPointerUp={interactions.monthPointerUp}
      onDoubleClick={() => input.onCreateAllDay(cell.date)}
      onPointerCancel={(event) => interactions.cancelMonthPointer(event.pointerId)}
      onLostPointerCapture={(event) => interactions.cancelMonthPointer(event.pointerId, "lost-capture")}
    >
      {input.overflow ? (
        <div
          role="dialog"
          aria-label={props.labels.overflow(cell.date)}
          className={props.classNames.overflow}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <Command
            affordance={props.affordances.overflowDate}
            className={props.classNames.overflowDate}
            onClick={() => props.onNavigateDate(cell.date)}
          >
            {cell.date}
          </Command>
          {calendarMonthDayLayout(props.events, cell.date, Math.max(onDay.length, 1)).events.map((event) => (
            <div
              key={`${event.id}:${event.start}`}
              ref={hand.isPrimaryOccurrence(event.id, event.start) ? props.primaryEventRef : undefined}
              data-calendar-event-anchor={hand.isPrimaryOccurrence(event.id, event.start) ? "primary" : undefined}
              className={props.classNames.overflowEventContainer}
            >
              <MonthEvent
                event={event}
                affordance={props.affordances.overflowEvent}
                classNames={props.classNames}
                color={props.getEventColor(event)}
                selected={hand.isOccurrenceSelected(event.id, event.start)}
                primary={hand.isPrimaryOccurrence(event.id, event.start)}
                onClick={(mouseEvent) => {
                  mouseEvent.stopPropagation();
                  input.onSelectEvent(event, mouseEvent);
                }}
                onDoubleClick={(mouseEvent) => {
                  mouseEvent.stopPropagation();
                  hand.beginTitleRename(event.id);
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <>
          <span className={joinClasses(props.classNames.dayNumber, cell.date === props.today ? props.classNames.today : undefined)}>{cell.day}</span>
          <div className={props.classNames.laneSpacer} style={{ height: `${input.laneCount * 1.25}rem` }} />
          {input.hiddenCount > 0 ? (
            <Command
              affordance={props.affordances.moreDisclosure}
              className={props.classNames.moreDisclosure}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={input.onOpenOverflow}
            >
              {props.labels.more(input.hiddenCount)}
            </Command>
          ) : null}
        </>
      )}
    </div>
  );
}

function MonthEvent(props: {
  readonly event: CalendarEvent;
  readonly affordance: ControlAffordance;
  readonly classNames: CalendarMonthGridClassNames;
  readonly color: string;
  readonly selected: boolean;
  readonly primary: boolean;
  readonly preview?: boolean;
  readonly onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerUp?: (event: PointerEvent<HTMLElement>) => void;
  readonly onClick: (event: MouseEvent<HTMLElement>) => void;
  readonly onDoubleClick: (event: MouseEvent<HTMLElement>) => void;
}): ReactNode {
  const time = calendarTimeLabel(props.event.start);
  return (
    <SelectableItem
      affordance={props.affordance}
      selected={props.selected}
      data-primary={props.primary ? "true" : undefined}
      aria-label={calendarEventLabel(props.event)}
      data-calendar-color={props.color}
      data-calendar-move-surface={props.onPointerDown === undefined ? undefined : "true"}
      data-preview={props.preview ? "true" : undefined}
      className={isCalendarAllDay(props.event) ? props.classNames.allDayEvent : props.classNames.timedEvent}
      onPointerDown={props.onPointerDown}
      onPointerUp={props.onPointerUp}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
    >
      {isCalendarAllDay(props.event) ? props.event.title : (
        <>
          <span className={props.classNames.eventTitle}>{props.event.title}</span>
          {time.length > 0 ? <span className={props.classNames.eventTime}>{time}</span> : null}
        </>
      )}
    </SelectableItem>
  );
}

function joinClasses(...values: ReadonlyArray<string | undefined>): string | undefined {
  const joined = values.filter((value): value is string => value !== undefined && value.length > 0).join(" ");
  return joined.length === 0 ? undefined : joined;
}
