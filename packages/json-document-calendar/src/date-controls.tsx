import { useEffect, useRef, useState, type ReactNode } from "react";
import { Choice, Popover, fieldPresentation, type ControlAffordance } from "@interactive-os/json-document-ui-primitives-react";
import {
  addCalendarDays,
  addCalendarMonths,
  addCalendarYears,
  calendarCells,
  compareDates,
  dateInRange,
  orderedRange,
  parseHtmlDateValue,
  visiblePeriodLabel,
  type CalendarPeriod,
  type CalendarGrain,
  type DateRangeValue,
  type HtmlDateType,
} from "./date-values.js";
import { DateGrid } from "./date-grid.js";

export type { CalendarGrain, DateRangeValue, HtmlDateType };

export function HtmlDateField(props: {
  readonly type: HtmlDateType;
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly affordance?: ControlAffordance;
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
    <label data-ui-control="date-field" data-ui-date-type={props.type} data-ui-affordance={props.affordance}>
      <span>{props.label}</span>
      <input
        type={props.type}
        className={fieldPresentation.standard}
        aria-label={props.label}
        autoComplete="off"
        spellCheck={false}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(event.currentTarget.value);
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

  return (
    <div data-ui-control="calendar" data-ui-grain={props.grain}>
      <GrainSwitch label={`${props.label} grain`} grain={props.grain} onGrainChange={props.onGrainChange} />
      <p data-ui-calendar-period="true">{visiblePeriodLabel(props.grain, props.visibleDate)}</p>
      <DateGrid
        label={props.label}
        cells={cells}
        grain={props.grain}
        focusDate={focus}
        isDateSelected={(date) => date === props.value}
        onDateSelect={(date) => {
          setFocus(date);
          props.onValueChange(date);
        }}
        onFocusDateChange={(date) => {
          setFocus(date);
          requestedVisibleDate.current = date;
          props.onVisibleDateChange(date);
        }}
        {...(commitOnArrow ? { onDateMove: props.onValueChange } : {})}
      />
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

  return (
    <div data-ui-control="range-calendar" data-ui-grain={props.grain}>
      <GrainSwitch label={`${props.label} grain`} grain={props.grain} onGrainChange={props.onGrainChange} />
      <p data-ui-calendar-period="true">{visiblePeriodLabel(props.grain, props.visibleDate)}</p>
      <DateGrid
        label={props.label}
        cells={cells}
        grain={props.grain}
        focusDate={focus}
        isDateSelected={(date) => props.value !== null && dateInRange(date, props.value)}
        onDateSelect={select}
        onFocusDateChange={(date) => {
          setFocus(date);
          requestedVisibleDate.current = date;
          props.onVisibleDateChange(date);
        }}
        {...(commitOnArrow ? { onDateMove: (date: string) => select(date, true) } : {})}
      />
    </div>
  );
}

export function DatePicker(props: {
  readonly label: string;
  readonly chooseLabel?: string;
  readonly value: string;
  readonly defaultVisibleDate?: string;
  readonly onValueChange: (value: string) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [grain, setGrain] = useState<CalendarGrain>("month");
  const fallbackDate = props.defaultVisibleDate ?? new Date().toLocaleDateString("sv-SE");
  const [visibleDate, setVisibleDate] = useState(props.value || fallbackDate);
  return <div data-ui-control="date-picker">
    <HtmlDateField type="date" label={props.label} value={props.value} onValueChange={props.onValueChange}/>
    <Popover label={props.chooseLabel ? `${props.label} ${props.chooseLabel}` : `Choose ${props.label}`} trigger={props.chooseLabel ?? "Choose date"} open={open} onOpenChange={next => {if (next) setVisibleDate(props.value || fallbackDate); setOpen(next);}}>
      <CalendarGrid label={`${props.label} calendar`} value={props.value || null} grain={grain} visibleDate={visibleDate} commitOnArrow={false} onValueChange={value => {props.onValueChange(value); setOpen(false);}} onGrainChange={setGrain} onVisibleDateChange={setVisibleDate}/>
    </Popover>
  </div>;
}

export function DateRangePicker(props: {
  readonly label: string;
  readonly value: DateRangeValue;
  readonly onValueChange: (value: DateRangeValue) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [grain, setGrain] = useState<CalendarGrain>("month");
  const [visibleDate, setVisibleDate] = useState(props.value.start);
  return <div data-ui-control="date-range-picker">
    <HtmlDateField type="date" label={`${props.label} start`} value={props.value.start} onValueChange={start => props.onValueChange(orderedRange(start, props.value.end))}/>
    <HtmlDateField type="date" label={`${props.label} end`} value={props.value.end} onValueChange={end => props.onValueChange(orderedRange(props.value.start, end))}/>
    <Popover label={`Choose ${props.label}`} trigger="Choose dates" open={open} onOpenChange={next => {if (next) setVisibleDate(props.value.start); setOpen(next);}}>
      <RangeCalendar label={`${props.label} calendar`} value={props.value} grain={grain} visibleDate={visibleDate} commitOnArrow={false} onValueChange={props.onValueChange} onGrainChange={setGrain} onVisibleDateChange={setVisibleDate}/>
    </Popover>
  </div>;
}

function GrainSwitch(props: {
  readonly label: string;
  readonly grain: CalendarGrain;
  readonly onGrainChange: (grain: CalendarGrain) => void;
}): ReactNode {
  return (
    <Choice presentation="inline"
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

export function shiftVisibleDate(visibleDate: string, period: CalendarPeriod, direction: 1 | -1): string {
  if (period === "day") return addCalendarDays(visibleDate, direction);
  if (period === "week") return addCalendarDays(visibleDate, direction * 7);
  if (period === "month") return addCalendarMonths(visibleDate, direction);
  return addCalendarYears(visibleDate, direction);
}
