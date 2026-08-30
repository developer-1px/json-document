import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import type { ControlAffordance } from "@interactive-os/json-document-ui-primitives-react";
import { moveCalendarDate, type CalendarCell, type CalendarGrain } from "./date-values.js";

export interface DateGridCellRenderProps {
  readonly cell: CalendarCell;
  readonly selected: boolean;
  readonly focused: boolean;
  readonly today: boolean;
}

export interface DateGridColumnHeader {
  readonly label: string;
  readonly content: ReactNode;
}

export interface DateGridProps {
  readonly label: string;
  readonly cells: ReadonlyArray<CalendarCell>;
  readonly grain: CalendarGrain;
  readonly focusDate: string;
  readonly today?: string;
  readonly className?: string;
  readonly rowClassName?: string;
  readonly columnHeaders?: ReadonlyArray<DateGridColumnHeader>;
  readonly columnHeaderClassName?: string;
  readonly cellAffordance?: ControlAffordance;
  readonly isDateSelected: (date: string) => boolean;
  readonly onDateSelect: (date: string) => void;
  readonly onFocusDateChange?: (date: string) => void;
  readonly onDateMove?: (date: string) => void;
  readonly getCellClassName?: (props: DateGridCellRenderProps) => string | undefined;
  readonly renderCellDecoration?: (props: DateGridCellRenderProps) => ReactNode;
}

/** Owns canonical date-cell semantics, focus movement, and selection binding. */
export function DateGrid(props: DateGridProps): ReactNode {
  const [focus, setFocus] = useState(props.focusDate);
  useEffect(() => { setFocus(props.focusDate); }, [props.focusDate]);

  function move(key: string): void {
    const next = moveCalendarDate(focus, props.grain, key);
    setFocus(next);
    props.onFocusDateChange?.(next);
    props.onDateMove?.(next);
  }

  function select(date: string): void {
    setFocus(date);
    props.onDateSelect(date);
  }

  return (
    <div
      role="grid"
      aria-label={props.label}
      className={props.className}
      tabIndex={0}
      onKeyDown={(event) => onGridKey(event, (key) => {
        if (key === "Enter" || key === " ") return select(focus);
        move(key);
      })}
    >
      {props.columnHeaders === undefined ? null : (
        <div role="row" className={props.rowClassName}>
          {props.columnHeaders.map((header) => (
            <div key={header.label} role="columnheader" aria-label={header.label} className={props.columnHeaderClassName}>
              {header.content}
            </div>
          ))}
        </div>
      )}
      {dateRows(props.cells).map((row) => (
        <div key={row[0]!.date} role="row" className={props.rowClassName}>
          {row.map((cell) => {
            const state = {
              cell,
              selected: props.isDateSelected(cell.date),
              focused: cell.date === focus,
              today: cell.date === props.today,
            } satisfies DateGridCellRenderProps;
            return (
              <button
                key={cell.date}
                type="button"
                role="gridcell"
                aria-label={cell.date}
                aria-current={state.today ? "date" : undefined}
                aria-selected={state.selected}
                className={props.getCellClassName?.(state)}
                data-ui-control="calendar-day"
                data-ui-affordance={props.cellAffordance}
                data-focused={state.focused ? "true" : undefined}
                data-outside={cell.inVisiblePeriod ? undefined : "true"}
                data-today={state.today ? "true" : undefined}
                tabIndex={state.focused ? 0 : -1}
                onClick={() => select(cell.date)}
              >
                <span data-ui-date-grid-label="true">{cell.day}</span>
                {props.renderCellDecoration?.(state)}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function dateRows(cells: ReadonlyArray<CalendarCell>): ReadonlyArray<ReadonlyArray<CalendarCell>> {
  const rows: Array<Array<CalendarCell>> = [];
  for (const cell of cells) {
    const last = rows.at(-1);
    if (last === undefined || last.length === 7) rows.push([cell]);
    else last.push(cell);
  }
  return rows;
}

function onGridKey(event: KeyboardEvent<HTMLDivElement>, handle: (key: string) => void): void {
  if ((event.key === "Enter" || event.key === " ") && event.target !== event.currentTarget) return;
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
