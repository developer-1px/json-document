import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addCalendarDate, calendarBusyDates, type CalendarEvent } from "@interactive-os/json-document-editing";
import {
  ActionButton,
  IconButton,
  addCalendarMonths,
  calendarCells,
  visiblePeriodLabel,
} from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../shared/ui/styles";
import { calendarDemoRecipe } from "./calendar-demo-styles";

const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

export function CalendarDemoNavigator(props: {
  readonly visibleDate: string;
  readonly today: string;
  readonly events: ReadonlyArray<CalendarEvent>;
  readonly onDateChange: (date: string) => void;
}): ReactNode {
  const styles = calendarDemoRecipe();
  const [railDate, setRailDate] = useState(props.visibleDate);
  useEffect(() => {
    setRailDate(props.visibleDate);
  }, [props.visibleDate]);
  const cells = calendarCells("month", railDate);
  const first = cells[0]?.date;
  const last = cells.at(-1)?.date;
  const busy = first === undefined || last === undefined
    ? null
    : calendarBusyDates(props.events, first, addCalendarDate(last, 1) ?? last);
  const monthLabel = visiblePeriodLabel("month", railDate);

  return (
    <section aria-label="Jump to date" className={styles.yearMonth()}>
      <div className="flex items-center justify-between gap-1">
        <IconButton label="Previous month" onClick={() => setRailDate(addCalendarMonths(railDate, -1))}>
          <ChevronLeft aria-hidden="true" size={16} />
        </IconButton>
        <span className={ui.text.meta}>{monthLabel}</span>
        <IconButton label="Next month" onClick={() => setRailDate(addCalendarMonths(railDate, 1))}>
          <ChevronRight aria-hidden="true" size={16} />
        </IconButton>
      </div>
      <div role="grid" aria-label={`Jump ${monthLabel}`} className="grid grid-cols-7">
        {weekdays.map((name, index) => (
          <div key={`${name}:${index}`} role="columnheader" className={classes("text-center", ui.text.meta)}>
            {name}
          </div>
        ))}
        {cells.map((cell) => (
          <ActionButton
            key={cell.date}
            aria-label={cell.date}
            aria-current={cell.date === props.today ? "date" : undefined}
            className={classes(
              styles.yearDay(),
              cell.inVisiblePeriod ? ui.text.body : ui.text.meta,
              (cell.date === props.today || cell.date === props.visibleDate) && styles.todayMark(),
              busy?.has(cell.date) && cell.date !== props.today && styles.yearDayBusy(),
            )}
            onClick={() => props.onDateChange(cell.date)}
          >
            {cell.day}
          </ActionButton>
        ))}
      </div>
    </section>
  );
}
