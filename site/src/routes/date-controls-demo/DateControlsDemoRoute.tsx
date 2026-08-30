import { useState } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader } from "../../shared/ui/primitives";
import {
  CalendarGrid,
  calendarCells,
  DateGrid,
  DatePicker,
  DateRangePicker,
  HtmlDateField,
  RangeCalendar,
  type CalendarGrain,
  type DateRangeValue,
} from "@interactive-os/json-document-calendar";


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
