import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import { useState } from "react";
import {
  CalendarGrid,
  calendarCellInterval,
  calendarCells,
  calendarMonthWeeks,
  calendarTimeLabel,
  calendarYearMonths,
  DatePicker,
  DateRangePicker,
  DateGrid,
  HtmlDateField,
  RangeCalendar,
  shiftVisibleDate,
  startOfYear,
  parseHtmlDateValue,
  visiblePeriodLabel,
  type CalendarGrain,
  type DateRangeValue,
  type HtmlDateType,
} from "../src/index.js";

afterEach(cleanup);

describe("HTML date values", () => {
  test("accepts canonical HTML strings and rejects invalid civil values", () => {
    expect(parseHtmlDateValue("date", "2024-02-29")).toBe("2024-02-29");
    expect(parseHtmlDateValue("date", "2025-02-29")).toBeNull();
    expect(parseHtmlDateValue("time", "08:30")).toBe("08:30");
    expect(parseHtmlDateValue("time", "24:00")).toBeNull();
    expect(parseHtmlDateValue("datetime-local", "2026-08-03T09:15")).toBe("2026-08-03T09:15");
    expect(parseHtmlDateValue("datetime-local", "2026-08-03 09:15")).toBeNull();
    expect(parseHtmlDateValue("month", "2026-08")).toBe("2026-08");
    expect(parseHtmlDateValue("month", "2026-13")).toBeNull();
    expect(parseHtmlDateValue("week", "2026-W01")).toBe("2026-W01");
    expect(parseHtmlDateValue("week", "2026-W99")).toBeNull();
  });

  test("projects datetime-local values to minute clock labels", () => {
    expect(calendarTimeLabel("2026-08-03T09:15")).toBe("09:15");
    expect(calendarTimeLabel("2026-08-03T09:15:42")).toBe("09:15");
    expect(calendarTimeLabel("2026-08-03")).toBe("");
    expect(calendarTimeLabel("not-a-date-time")).toBe("");
  });

  test("projects the canonical year boundary across leap years", () => {
    expect(startOfYear("2028-02-29")).toBe("2028-01-01");
    expect(startOfYear("2027-12-31")).toBe("2027-01-01");
  });

  test("projects the twelve ordered month starts for the visible year", () => {
    expect(calendarYearMonths("2028-02-29")).toEqual([
      "2028-01-01", "2028-02-01", "2028-03-01", "2028-04-01",
      "2028-05-01", "2028-06-01", "2028-07-01", "2028-08-01",
      "2028-09-01", "2028-10-01", "2028-11-01", "2028-12-01",
    ]);
  });

  test("projects day and Sunday-first week periods as canonical calendar cells", () => {
    expect(calendarCells("day", "2026-05-28")).toEqual([
      { date: "2026-05-28", day: 28, inVisiblePeriod: true, weekday: 4 },
    ]);
    const week = calendarCells("week", "2026-05-28");
    expect(week.map((cell) => cell.date)).toEqual([
      "2026-05-24", "2026-05-25", "2026-05-26", "2026-05-27",
      "2026-05-28", "2026-05-29", "2026-05-30",
    ]);
    expect(week.map((cell) => cell.day)).toEqual([24, 25, 26, 27, 28, 29, 30]);
  });

  test("projects a month grid as six Sunday-first week rows of seven cells", () => {
    const weeks = calendarMonthWeeks("2026-05-25");
    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]?.map((cell) => cell.date)).toEqual([
      "2026-04-26", "2026-04-27", "2026-04-28", "2026-04-29",
      "2026-04-30", "2026-05-01", "2026-05-02",
    ]);
    expect(weeks[0]?.map((cell) => cell.day)).toEqual([26, 27, 28, 29, 30, 1, 2]);
    expect(weeks[5]?.at(-1)?.date).toBe("2026-06-06");
  });

  test("projects ordered calendar cells to a half-open query interval", () => {
    expect(calendarCellInterval([])).toBeNull();
    expect(calendarCellInterval(calendarCells("month", "2026-05-25"))).toEqual({
      start: "2026-04-26",
      end: "2026-06-07",
    });
  });

  test("preserves default labels and accepts Calendar toolbar copy policy", () => {
    expect(visiblePeriodLabel("week", "2026-05-28")).toBe("2026-05-24 · week");
    expect(visiblePeriodLabel("month", "2026-05-28")).toBe("2026-05");
    expect(visiblePeriodLabel("year", "2026-05-28")).toBe("2026");

    const options = {
      monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      weekSeparator: " – ",
    };
    expect(visiblePeriodLabel("day", "2026-05-28", options)).toBe("2026-05-28");
    expect(visiblePeriodLabel("week", "2026-05-28", options)).toBe("2026-05-24 – 2026-05-30");
    expect(visiblePeriodLabel("month", "2026-05-28", options)).toBe("May 2026");
    expect(visiblePeriodLabel("year", "2026-05-28", options)).toBe("2026");
  });
});

describe("HtmlDateField", () => {
  test("commits each HTML type through the shipped field and ignores invalid drafts", () => {
    function Harness(props: { readonly type: HtmlDateType; readonly initial: string; readonly next: string; readonly invalid: string }) {
      const [value, setValue] = useState(props.initial);
      return (
        <>
          <HtmlDateField type={props.type} label={props.type} value={value} onValueChange={setValue} />
          <output aria-label="committed">{value}</output>
        </>
      );
    }

    const cases: ReadonlyArray<{ type: HtmlDateType; initial: string; next: string; invalid: string }> = [
      { type: "date", initial: "2026-08-03", next: "2026-08-10", invalid: "2026-02-31" },
      { type: "time", initial: "08:30", next: "17:05", invalid: "99:99" },
      { type: "datetime-local", initial: "2026-08-03T08:30", next: "2026-08-03T17:05", invalid: "2026-13-01T00:00" },
      { type: "month", initial: "2026-08", next: "2026-09", invalid: "2026-00" },
      { type: "week", initial: "2026-W32", next: "2026-W33", invalid: "2026-W00" },
    ];

    for (const sample of cases) {
      const view = render(<Harness {...sample} />);
      const field = screen.getByLabelText(sample.type);
      expect(field.getAttribute("type")).toBe(sample.type);
      fireEvent.change(field, { target: { value: sample.invalid } });
      fireEvent.blur(field);
      expect(screen.getByLabelText("committed").textContent).toBe(sample.initial);
      fireEvent.change(field, { target: { value: sample.next } });
      fireEvent.blur(field);
      expect(screen.getByLabelText("committed").textContent).toBe(sample.next);
      view.unmount();
    }
  });
});

describe("CalendarGrid and RangeCalendar", () => {
  test("owns date-cell selection, focus movement, today state, and decoration", async () => {
    const user = userEvent.setup();
    const cells = calendarCells("month", "2026-08-03");
    function Harness() {
      const [selected, setSelected] = useState("2026-08-03");
      const [visible, setVisible] = useState("2026-08-03");
      const [bubbledKeys, setBubbledKeys] = useState(0);
      return (
        <div onKeyDown={() => setBubbledKeys((count) => count + 1)}>
          <DateGrid
            label="Available dates"
            cells={cells}
            grain="month"
            focusDate={selected}
            today="2026-08-04"
            columnHeaders={[{ label: "Monday", content: "M" }]}
            isDateSelected={(date) => date === selected}
            onDateSelect={setSelected}
            onFocusDateChange={setVisible}
            renderCellDecoration={({ cell }) => cell.date === "2026-08-05" ? <span>busy</span> : null}
          />
          <output aria-label="selected">{selected}</output>
          <output aria-label="visible">{visible}</output>
          <output aria-label="bubbled keys">{bubbledKeys}</output>
        </div>
      );
    }

    render(<Harness />);
    expect(screen.getByRole("columnheader", { name: "Monday" }).textContent).toBe("M");
    expect(screen.getByRole("gridcell", { name: "2026-08-03" }).getAttribute("data-focused")).toBeNull();
    expect(screen.getByRole("gridcell", { name: "2026-08-04" }).getAttribute("aria-current")).toBe("date");
    expect(screen.getByRole("gridcell", { name: "2026-08-05" }).textContent).toBe("5busy");
    await user.click(screen.getByRole("gridcell", { name: "2026-08-06" }));
    expect(screen.getByLabelText("selected").textContent).toBe("2026-08-06");
    screen.getByRole("grid", { name: "Available dates" }).focus();
    expect(screen.getByRole("gridcell", { name: "2026-08-06" }).getAttribute("data-focused")).toBe("true");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByLabelText("visible").textContent).toBe("2026-08-07");
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("selected").textContent).toBe("2026-08-07");
    expect(screen.getByLabelText("bubbled keys").textContent).toBe("0");
  });

  test("requests the next visible period when focus crosses the supplied cells", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [visible, setVisible] = useState("2026-08-31");
      return (
        <>
          <DateGrid
            label="Period boundary"
            cells={calendarCells("month", "2026-08-31")}
            grain="month"
            focusDate="2026-08-31"
            isDateSelected={() => false}
            onDateSelect={() => undefined}
            onFocusDateChange={setVisible}
          />
          <output aria-label="visible boundary">{visible}</output>
        </>
      );
    }

    render(<Harness />);
    screen.getByRole("grid", { name: "Period boundary" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByLabelText("visible boundary").textContent).toBe("2026-09-01");
  });

  test("moves visible periods without skipping clamped civil dates", () => {
    expect(shiftVisibleDate("2026-01-01", "day", -1)).toBe("2025-12-31");
    expect(shiftVisibleDate("2026-01-31", "month", 1)).toBe("2026-02-28");
    expect(shiftVisibleDate("2024-02-29", "year", 1)).toBe("2025-02-28");
    expect(shiftVisibleDate("2026-01-01", "week", -1)).toBe("2025-12-25");
  });

  test("selects a day, switches grain, and moves selection with arrow keys", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState<string | null>("2026-08-03");
      const [grain, setGrain] = useState<CalendarGrain>("month");
      const [visibleDate, setVisibleDate] = useState("2026-08-03");
      return (
        <>
          <CalendarGrid
            label="Choose date"
            value={value}
            grain={grain}
            visibleDate={visibleDate}
            onValueChange={setValue}
            onGrainChange={setGrain}
            onVisibleDateChange={setVisibleDate}
          />
          <output aria-label="committed">{value}</output>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByRole("gridcell", { name: "2026-08-03" }).textContent).toBe("3");
    await user.click(screen.getByRole("gridcell", { name: "2026-08-12" }));
    expect(screen.getByRole("gridcell", { name: "2026-08-12" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByLabelText("committed").textContent).toBe("2026-08-12");
    await user.click(screen.getByRole("radio", { name: "Week" }));
    screen.getByRole("grid", { name: "Choose date" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByLabelText("committed").textContent).toBe("2026-08-13");
    await user.click(screen.getByRole("radio", { name: "Year" }));
    screen.getByRole("grid", { name: "Choose date" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByLabelText("committed").textContent).toBe("2026-08-12");
  });

  test("selects a contiguous range and keeps arrow movement on the range surface", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState<DateRangeValue | null>(null);
      const [grain, setGrain] = useState<CalendarGrain>("month");
      return (
        <>
          <RangeCalendar
            label="Trip"
            value={value}
            grain={grain}
            visibleDate="2026-08-03"
            onValueChange={setValue}
            onGrainChange={setGrain}
            onVisibleDateChange={() => undefined}
          />
          <output aria-label="committed">{value ? `${value.start}/${value.end}` : ""}</output>
        </>
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole("gridcell", { name: "2026-08-03" }));
    await user.click(screen.getByRole("gridcell", { name: "2026-08-07" }));
    expect(screen.getByLabelText("committed").textContent).toBe("2026-08-03/2026-08-07");
    expect(screen.getByRole("gridcell", { name: "2026-08-05" }).getAttribute("aria-selected")).toBe("true");
    screen.getByRole("grid", { name: "Trip" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByLabelText("committed").textContent).toBe("2026-08-03/2026-08-08");
  });
});

describe("DatePicker and DateRangePicker", () => {
  test("field and calendar commit the same date and Escape keeps the previous value", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState("2026-08-03");
      return (
        <>
          <DatePicker label="Event date" value={value} onValueChange={setValue} />
          <output aria-label="committed">{value}</output>
        </>
      );
    }
    render(<Harness />);
    const field = screen.getByLabelText("Event date");
    await user.clear(field);
    await user.type(field, "2026-08-20");
    await user.tab();
    expect(screen.getByLabelText("committed").textContent).toBe("2026-08-20");
    await user.click(screen.getByRole("button", { name: "Choose Event date" }));
    await user.click(screen.getByRole("gridcell", { name: "2026-08-11" }));
    expect(screen.getByLabelText("committed").textContent).toBe("2026-08-11");
    await user.click(screen.getByRole("button", { name: "Choose Event date" }));
    screen.getByRole("grid", { name: "Event date calendar" }).focus();
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Escape}");
    expect(screen.getByLabelText("committed").textContent).toBe("2026-08-11");
  });

  test("moves across a month boundary before committing a picker value", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState("2026-08-31");
      return <DatePicker label="Boundary date" value={value} onValueChange={setValue} />;
    }
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Choose Boundary date" }));
    const grid = screen.getByRole("grid", { name: "Boundary date calendar" });
    grid.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("2026-09")).toBeTruthy();
    await user.keyboard("{Enter}");
    expect((screen.getByLabelText("Boundary date") as HTMLInputElement).value).toBe("2026-09-01");
  });

  test("projects date picker trigger and day cells on UI primitive hooks", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState("2026-08-03");
      return <DatePicker label="Event date" value={value} onValueChange={setValue} />;
    }
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Choose Event date" });
    expect(trigger.getAttribute("data-ui-control")).toBe("command");
    await user.click(trigger);
    expect(screen.getByRole("gridcell", { name: "2026-08-03" }).getAttribute("data-ui-control")).toBe("calendar-day");
  });

  test("range fields and range calendar write the same committed range", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState<DateRangeValue>({ start: "2026-08-01", end: "2026-08-02" });
      return (
        <>
          <DateRangePicker label="Trip" value={value} onValueChange={setValue} />
          <output aria-label="committed">{`${value.start}/${value.end}`}</output>
        </>
      );
    }
    render(<Harness />);
    const start = screen.getByLabelText("Trip start");
    await user.clear(start);
    await user.type(start, "2026-08-10");
    await user.tab();
    expect(screen.getByLabelText("committed").textContent).toBe("2026-08-02/2026-08-10");
    await user.click(screen.getByRole("button", { name: "Choose Trip" }));
    await user.click(screen.getByRole("gridcell", { name: "2026-08-04" }));
    await user.click(screen.getByRole("gridcell", { name: "2026-08-06" }));
    expect(screen.getByLabelText("committed").textContent).toBe("2026-08-04/2026-08-06");
    screen.getByRole("grid", { name: "Trip calendar" }).focus();
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Escape}");
    expect(screen.getByLabelText("committed").textContent).toBe("2026-08-04/2026-08-06");
  });

  test("extends a range across a month boundary before committing", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState<DateRangeValue>({ start: "2026-08-31", end: "2026-08-31" });
      return <DateRangePicker label="Boundary trip" value={value} onValueChange={setValue} />;
    }
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Choose Boundary trip" }));
    const grid = screen.getByRole("grid", { name: "Boundary trip calendar" });
    grid.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("2026-09")).toBeTruthy();
    await user.keyboard("{Enter}");
    expect((screen.getByLabelText("Boundary trip end") as HTMLInputElement).value).toBe("2026-09-01");
  });
});
