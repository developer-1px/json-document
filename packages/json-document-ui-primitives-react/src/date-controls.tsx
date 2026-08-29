import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { SegmentedControl } from "./controls.js";
import {
  addCalendarDays,
  addCalendarMonths,
  addCalendarYears,
  calendarCells,
  compareDates,
  dateInRange,
  moveCalendarDate,
  orderedRange,
  parseHtmlDateValue,
  visiblePeriodLabel,
  type CalendarCell,
  type CalendarPeriod,
  type CalendarGrain,
  type DateRangeValue,
  type HtmlDateType,
} from "./date-values.js";

export type { CalendarGrain, DateRangeValue, HtmlDateType };

export function HtmlDateField(props: {
  readonly type: HtmlDateType;
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
}): ReactNode {
  const [draft, setDraft] = useState(props.value);
  useEffect(() => { setDraft(props.value); }, [props.value]);

  function commit(next = draft): void {
    const parsed = parseHtmlDateValue(props.type, next);
    if (parsed === null) {
      setDraft(props.value);
      return;
    }
    setDraft(parsed);
    if (parsed !== props.value) props.onValueChange(parsed);
  }

  return (
    <label data-ui-control="date-field" data-ui-date-type={props.type}>
      <span>{props.label}</span>
      <input
        type={props.type}
        aria-label={props.label}
        autoComplete="off"
        spellCheck={false}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
    </label>
  );
}

export function CalendarGrid(props: {
  readonly label: string;
  readonly value: string | null;
  readonly grain: CalendarGrain;
  readonly visibleDate: string;
  readonly onValueChange: (value: string) => void;
  readonly onGrainChange: (grain: CalendarGrain) => void;
  readonly onVisibleDateChange: (date: string) => void;
  readonly commitOnArrow?: boolean;
}): ReactNode {
  const commitOnArrow = props.commitOnArrow ?? true;
  const [focus, setFocus] = useState(props.value ?? props.visibleDate);
  const requestedVisibleDate = useRef<string | null>(null);
  const cells = calendarCells(props.grain, props.visibleDate);
  useEffect(() => {
    if (requestedVisibleDate.current === props.visibleDate) {
      requestedVisibleDate.current = null;
      return;
    }
    setFocus(props.value ?? props.visibleDate);
  }, [props.value, props.visibleDate]);

  function move(key: string): void {
    const next = moveCalendarDate(focus, props.grain, key);
    setFocus(next);
    requestedVisibleDate.current = next;
    props.onVisibleDateChange(next);
    if (commitOnArrow) props.onValueChange(next);
  }

  return (
    <div data-ui-control="calendar" data-ui-grain={props.grain}>
      <GrainSwitch label={`${props.label} grain`} grain={props.grain} onGrainChange={props.onGrainChange} />
      <p data-ui-calendar-period="true">{visiblePeriodLabel(props.grain, props.visibleDate)}</p>
      <div
        role="grid"
        aria-label={props.label}
        tabIndex={0}
        onKeyDown={(event) => onGridKey(event, (key) => {
          if (key === "Enter" || key === " ") {
            event.preventDefault();
            props.onValueChange(focus);
            return;
          }
          move(key);
        })}
      >
        {renderDayCells(cells, {
          selected: (date) => date === props.value,
          focused: (date) => date === focus,
          onSelect: (date) => {
            setFocus(date);
            props.onValueChange(date);
          },
        })}
      </div>
    </div>
  );
}

export function RangeCalendar(props: {
  readonly label: string;
  readonly value: DateRangeValue | null;
  readonly grain: CalendarGrain;
  readonly visibleDate: string;
  readonly onValueChange: (value: DateRangeValue) => void;
  readonly onGrainChange: (grain: CalendarGrain) => void;
  readonly onVisibleDateChange: (date: string) => void;
  readonly commitOnArrow?: boolean;
}): ReactNode {
  const commitOnArrow = props.commitOnArrow ?? true;
  const [focus, setFocus] = useState(props.value?.start ?? props.visibleDate);
  const requestedVisibleDate = useRef<string | null>(null);
  const cells = calendarCells(props.grain, props.visibleDate);
  useEffect(() => {
    if (requestedVisibleDate.current === props.visibleDate) {
      requestedVisibleDate.current = null;
      return;
    }
    setFocus(props.value?.start ?? props.visibleDate);
  }, [props.value?.start, props.visibleDate]);

  function select(date: string, fromArrow = false): void {
    setFocus(date);
    if (props.value === null) {
      props.onValueChange({ start: date, end: date });
      return;
    }
    if (!fromArrow && props.value.start !== props.value.end) {
      props.onValueChange({ start: date, end: date });
      return;
    }
    props.onValueChange(orderedRange(props.value.start, date));
  }

  function move(key: string): void {
    const next = moveCalendarDate(focus, props.grain, key);
    setFocus(next);
    requestedVisibleDate.current = next;
    props.onVisibleDateChange(next);
    if (commitOnArrow) select(next, true);
  }

  return (
    <div data-ui-control="range-calendar" data-ui-grain={props.grain}>
      <GrainSwitch label={`${props.label} grain`} grain={props.grain} onGrainChange={props.onGrainChange} />
      <p data-ui-calendar-period="true">{visiblePeriodLabel(props.grain, props.visibleDate)}</p>
      <div
        role="grid"
        aria-label={props.label}
        tabIndex={0}
        onKeyDown={(event) => onGridKey(event, (key) => {
          if (key === "Enter" || key === " ") {
            event.preventDefault();
            select(focus);
            return;
          }
          move(key);
        })}
      >
        {renderDayCells(cells, {
          selected: (date) => props.value !== null && dateInRange(date, props.value),
          focused: (date) => date === focus,
          onSelect: select,
        })}
      </div>
    </div>
  );
}

export function DatePicker(props: {
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [grain, setGrain] = useState<CalendarGrain>("month");
  const [visibleDate, setVisibleDate] = useState(props.value);
  const dialogId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close(): void {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  return (
    <div data-ui-control="date-picker">
      <HtmlDateField type="date" label={props.label} value={props.value} onValueChange={props.onValueChange} />
      <button
        ref={triggerRef}
        type="button"
        data-ui-control="action"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label={`Choose ${props.label}`}
        onClick={() => {
          if (open) close();
          else {
            setVisibleDate(props.value);
            setOpen(true);
          }
        }}
      >
        Choose date
      </button>
      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-label={props.label}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            close();
          }}
        >
          <CalendarGrid
            label={`${props.label} calendar`}
            value={props.value}
            grain={grain}
            visibleDate={visibleDate}
            commitOnArrow={false}
            onValueChange={(value) => {
              props.onValueChange(value);
              close();
            }}
            onGrainChange={setGrain}
            onVisibleDateChange={setVisibleDate}
          />
        </div>
      ) : null}
    </div>
  );
}

export function DateRangePicker(props: {
  readonly label: string;
  readonly value: DateRangeValue;
  readonly onValueChange: (value: DateRangeValue) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [grain, setGrain] = useState<CalendarGrain>("month");
  const [visibleDate, setVisibleDate] = useState(props.value.start);
  const dialogId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close(): void {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  return (
    <div data-ui-control="date-range-picker">
      <HtmlDateField
        type="date"
        label={`${props.label} start`}
        value={props.value.start}
        onValueChange={(start) => props.onValueChange(orderedRange(start, props.value.end))}
      />
      <HtmlDateField
        type="date"
        label={`${props.label} end`}
        value={props.value.end}
        onValueChange={(end) => props.onValueChange(orderedRange(props.value.start, end))}
      />
      <button
        ref={triggerRef}
        type="button"
        data-ui-control="action"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label={`Choose ${props.label}`}
        onClick={() => {
          if (open) close();
          else {
            setVisibleDate(props.value.start);
            setOpen(true);
          }
        }}
      >
        Choose dates
      </button>
      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-label={props.label}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            close();
          }}
        >
          <RangeCalendar
            label={`${props.label} calendar`}
            value={props.value}
            grain={grain}
            visibleDate={visibleDate}
            commitOnArrow={false}
            onValueChange={props.onValueChange}
            onGrainChange={setGrain}
            onVisibleDateChange={setVisibleDate}
          />
        </div>
      ) : null}
    </div>
  );
}

function GrainSwitch(props: {
  readonly label: string;
  readonly grain: CalendarGrain;
  readonly onGrainChange: (grain: CalendarGrain) => void;
}): ReactNode {
  return (
    <SegmentedControl
      label={props.label}
      value={props.grain}
      options={[
        { id: "week", label: "Week" },
        { id: "month", label: "Month" },
        { id: "year", label: "Year" },
      ]}
      onValueChange={props.onGrainChange}
    />
  );
}

function renderDayCells(
  cells: ReadonlyArray<CalendarCell>,
  options: {
    readonly selected: (date: string) => boolean;
    readonly focused: (date: string) => boolean;
    readonly onSelect: (date: string) => void;
  },
): ReactNode {
  const weeks: Array<Array<CalendarCell>> = [];
  for (const cell of cells) {
    const last = weeks.at(-1);
    if (last === undefined || last.length === 7) weeks.push([cell]);
    else last.push(cell);
  }
  return weeks.map((week) => (
    <div key={week[0]!.date} role="row">
      {week.map((cell) => (
        <button
          key={cell.date}
          type="button"
          role="gridcell"
          aria-label={cell.date}
          aria-selected={options.selected(cell.date)}
          data-ui-control="calendar-day"
          data-focused={options.focused(cell.date) ? "true" : undefined}
          data-outside={cell.inVisiblePeriod ? undefined : "true"}
          tabIndex={options.focused(cell.date) ? 0 : -1}
          onClick={() => options.onSelect(cell.date)}
        >
          {cell.day}
        </button>
      ))}
    </div>
  ));
}

function onGridKey(event: KeyboardEvent<HTMLDivElement>, handle: (key: string) => void): void {
  if (
    event.key === "ArrowLeft"
    || event.key === "ArrowRight"
    || event.key === "ArrowUp"
    || event.key === "ArrowDown"
    || event.key === "Enter"
    || event.key === " "
  ) {
    event.preventDefault();
    handle(event.key);
  }
}

export function shiftVisibleDate(visibleDate: string, period: CalendarPeriod, direction: 1 | -1): string {
  if (period === "day") return addCalendarDays(visibleDate, direction);
  if (period === "week") return addCalendarDays(visibleDate, direction * 7);
  if (period === "month") return addCalendarMonths(visibleDate, direction);
  return addCalendarYears(visibleDate, direction);
}
