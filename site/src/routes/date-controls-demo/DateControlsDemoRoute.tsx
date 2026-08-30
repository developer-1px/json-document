import { useState } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader } from "../../shared/ui/primitives";
import {
  calendarOccurrenceTopology,
  createCalendarEditor,
  type CalendarDocument,
} from "@interactive-os/json-document-editing";
import {
  CalendarGrid,
  CalendarMonthGrid,
  calendarCells,
  DateGrid,
  DatePicker,
  DateRangePicker,
  HtmlDateField,
  RangeCalendar,
  useCalendarHand,
  useCalendarPointerInteractions,
  type CalendarGrain,
  type DateRangeValue,
} from "@interactive-os/json-document-calendar";
import { dateControlsDemoRecipe } from "./date-controls-demo-styles";


export function DateControlsDemoRoute() {
  const [date, setDate] = useState("2026-08-03");
  const [time, setTime] = useState("09:30");
  const [dateTime, setDateTime] = useState("2026-08-03T09:30");
  const [month, setMonth] = useState("2026-08");
  const [week, setWeek] = useState("2026-W32");
  const [grain, setGrain] = useState<CalendarGrain>("month");
  const [range, setRange] = useState<DateRangeValue>({ start: "2026-08-03", end: "2026-08-07" });

  return (
    <DemoPage documentation={(
      <PageHeader label="UI Primitives" title="Date and time controls" illustration="cursor">
        HTML date, time, month, week, datetime-local 값과 APG 캘린더·범위 컨트롤입니다.
      </PageHeader>
    )}>
      <div className="grid gap-4">
        <HtmlDateField type="date" label="Date" value={date} onValueChange={setDate} />
        <HtmlDateField type="time" label="Time" value={time} onValueChange={setTime} />
        <HtmlDateField type="datetime-local" label="DateTime" value={dateTime} onValueChange={setDateTime} />
        <HtmlDateField type="month" label="Month" value={month} onValueChange={setMonth} />
        <HtmlDateField type="week" label="Week" value={week} onValueChange={setWeek} />
        <DatePicker label="Picker date" value={date} onValueChange={setDate} />
        <DateRangePicker label="Picker range" value={range} onValueChange={setRange} />
        <DateGrid
          label="Compact date grid"
          cells={calendarCells("month", date)}
          grain="month"
          focusDate={date}
          today="2026-08-04"
          isDateSelected={(candidate) => candidate === date}
          onDateSelect={setDate}
          onFocusDateChange={setDate}
          renderCellDecoration={({ cell }) => cell.date === "2026-08-05" ? <span aria-hidden="true">•</span> : null}
        />
        <CalendarMonthGridUsage />
        <CalendarGrid
          label="Calendar"
          value={date}
          grain={grain}
          visibleDate={date}
          onValueChange={setDate}
          onGrainChange={setGrain}
          onVisibleDateChange={setDate}
        />
        <RangeCalendar
          label="Range calendar"
          value={range}
          grain={grain}
          visibleDate={range.start}
          onValueChange={setRange}
          onGrainChange={setGrain}
          onVisibleDateChange={() => undefined}
        />
      </div>
    </DemoPage>
  );
}

const monthGridDocument: CalendarDocument = {
  calendars: [{ id: "work", title: "Work", hidden: false, color: "blue" }],
  events: [
    { id: "planning", title: "Planning", start: "2026-08-03", end: "2026-08-05", allDay: true, calendarId: "work", recurrence: null, excludeDates: [] },
    { id: "review", title: "Review", start: "2026-08-04T10:00", end: "2026-08-04T10:30", allDay: false, calendarId: "work", recurrence: null, excludeDates: [] },
  ],
};

function CalendarMonthGridUsage() {
  const [editor] = useState(() => createCalendarEditor(monthGridDocument));
  const hand = useCalendarHand(editor);
  const interactions = useCalendarPointerInteractions(hand, {
    hourStart: 0,
    hourEnd: 24,
    stepMinutes: 15,
    pixelsPerHour: 72,
  });
  const styles = dateControlsDemoRecipe();

  return (
    <CalendarMonthGrid
      visibleDate="2026-08-03"
      today="2026-08-04"
      events={hand.paintedEvents}
      weekdays={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
      rowLimit={2}
      hand={hand}
      interactions={interactions}
      selectionTopology={calendarOccurrenceTopology(hand.document, "2026-07-27", "2026-09-07")}
      affordances={{
        dateCell: "content-control",
        event: "direct",
        eventResizeEnd: "direct",
        moreDisclosure: "content-control",
        overflowDate: "content-control",
        overflowEvent: "direct",
      }}
      classNames={{
        root: styles.monthRoot(),
        headerRow: styles.monthHeaderRow(),
        header: styles.monthHeader(),
        week: styles.monthWeek(),
        day: styles.monthDay(),
        dayOutsidePeriod: styles.monthOutside(),
        dayNumber: styles.monthDayNumber(),
        today: styles.monthToday(),
        eventContainer: styles.monthEventContainer(),
        allDayEvent: styles.monthAllDayEvent(),
        timedEvent: styles.monthTimedEvent(),
        eventTitle: styles.monthEventTitle(),
        eventTime: styles.monthEventTime(),
        moreDisclosure: styles.monthMore(),
        overflow: styles.monthOverflow(),
        overflowEventContainer: styles.monthOverflowEvent(),
      }}
      labels={{
        grid: "Occurrence month grid",
        overflow: (date) => `Events on ${date}`,
        more: (count) => `+${count} more`,
        resizeEnd: (event) => `Resize ${event.title} end`,
      }}
      getEventColor={() => "blue"}
      onNavigateDate={() => undefined}
    />
  );
}
