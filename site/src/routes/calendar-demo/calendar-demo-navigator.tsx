import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { calendarBusyDates, type CalendarEvent } from "@interactive-os/json-document-editing";
import {
  addCalendarMonths,
  calendarCellInterval,
  calendarCells,
  DateGrid,
  visiblePeriodLabel,
} from "@interactive-os/json-document-calendar";
import { Command } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../shared/ui/styles";
import { calendarDemoRecipe } from "./calendar-demo-styles";
import { calendarControlAffordance } from "./calendar-control-affordances";

const weekdays = [
  { label: "Sunday", content: "S" },
  { label: "Monday", content: "M" },
  { label: "Tuesday", content: "T" },
  { label: "Wednesday", content: "W" },
  { label: "Thursday", content: "T" },
  { label: "Friday", content: "F" },
  { label: "Saturday", content: "S" },
];

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
  const interval = calendarCellInterval(cells);
  const busy = interval === null ? null : calendarBusyDates(props.events, interval.start, interval.end);
  const monthLabel = visiblePeriodLabel("month", railDate);

  return (
    <section aria-label="Jump to date" className={styles.yearMonth()}>
      <div className="flex items-center justify-between gap-1">
        <Command affordance={calendarControlAffordance("miniPrevious")} label="Previous month" onClick={() => setRailDate(addCalendarMonths(railDate, -1))}>
          <ChevronLeft aria-hidden="true" size={16} />
        </Command>
        <span className={ui.text.meta}>{monthLabel}</span>
        <Command affordance={calendarControlAffordance("miniNext")} label="Next month" onClick={() => setRailDate(addCalendarMonths(railDate, 1))}>
          <ChevronRight aria-hidden="true" size={16} />
        </Command>
      </div>
      <DateGrid
        label={`Jump ${monthLabel}`}
        cells={cells}
        grain="month"
        focusDate={props.visibleDate}
        today={props.today}
        rowClassName="grid grid-cols-7"
        columnHeaders={weekdays}
        columnHeaderClassName={classes("text-center", ui.text.meta)}
        cellAffordance={calendarControlAffordance("miniDate")}
        isDateSelected={(date) => date === props.visibleDate}
        getCellClassName={({ cell, selected, today }) => classes(
          styles.yearDay(),
          cell.inVisiblePeriod ? ui.text.body : ui.text.meta,
          (today || selected) && styles.todayMark(),
          busy?.has(cell.date) && !today && styles.yearDayBusy(),
        )}
        onDateSelect={props.onDateChange}
        onFocusDateChange={setRailDate}
      />
    </section>
  );
}
