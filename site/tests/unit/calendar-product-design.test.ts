import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { calendarDemoRecipe } from "../../src/routes/calendar-demo/calendar-demo-styles";
import { ui } from "../../src/shared/ui/styles";

const forbidden = ["border-l-line-accent", "outline-line-accent", "ring-line-accent"] as const;

function assertNoAccentChrome(source: string, label: string): void {
  for (const token of forbidden) {
    expect(source, `${label} must not include ${token}`).not.toContain(token);
  }
}

describe("calendar product design", () => {
  const styles = calendarDemoRecipe();

  test("event chips and calendar-visibility toggles use fill and type, not accent chrome", () => {
    assertNoAccentChrome(styles.timedEvent(), "timedEvent");
    assertNoAccentChrome(styles.allDayEvent(), "allDayEvent");
    assertNoAccentChrome(styles.monthEvent(), "monthEvent");
    assertNoAccentChrome(styles.monthTimed(), "monthTimed");
    assertNoAccentChrome(styles.monthAllDay(), "monthAllDay");
    assertNoAccentChrome(styles.todayMark(), "todayMark");
    expect(styles.timedEvent()).toContain("data-[selected=true]:font-semibold");
    expect(styles.timedEvent()).toContain("data-[selected=true]:text-foreground-strong");
    expect(styles.timedEvent()).toContain("data-[calendar-color=accent]:bg-background-accent-subtle");
    expect(styles.timedEvent()).toContain("rounded-control");
    expect(styles.resizeEdge()).toContain("bg-transparent");
    expect(styles.resizeEdge()).not.toContain("bg-line-accent");
    expect(styles.timedEvent()).not.toContain("data-[selected=true]:bg-background-subtle");
    expect(styles.monthTimed()).not.toContain("data-[calendar-color=accent]:bg-background-accent-subtle");
    expect(styles.todayMark()).toContain("font-semibold");
    expect(styles.todayMark()).toContain("text-foreground-strong");
    expect(styles.todayMark()).not.toContain("bg-background-accent");
    expect(styles.calendarToggle()).toContain("aria-pressed:text-foreground-strong");
    expect(styles.calendarSwatch()).toContain("data-[calendar-color=accent]:bg-background-accent");
    assertNoAccentChrome(styles.calendarToggle(), "calendarToggle");
    assertNoAccentChrome(styles.calendarSwatch(), "calendarSwatch");
    assertNoAccentChrome(styles.yearDayBusy(), "yearDayBusy");
  });

  test("segmented controls wrap inside a narrow inspector", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/index.css"), "utf8");
    const start = css.indexOf('[data-ui-control="segmented"] {');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf("}", start) + 1);
    expect(block).toContain("flex-wrap");
    expect(block).toContain("min-w-0");
  });

  test("date-field stacks its label above the input", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/index.css"), "utf8");
    const start = css.indexOf('[data-ui-control="date-field"] {');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf("}", start) + 1);
    expect(block).toContain("grid");
    expect(block).toContain("gap-1");
    expect(block).toContain("min-w-0");
    expect(block).toContain("w-full");
  });

  test("shared Toggle pressed is fill and text without an accent ring", () => {
    assertNoAccentChrome(ui.interactive.toggle, "ui.interactive.toggle");
    const css = readFileSync(path.join(process.cwd(), "src/app/index.css"), "utf8");
    const start = css.indexOf('[data-ui-control="toggle"] {');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf("}", start) + 1);
    expect(block).toContain("aria-pressed:bg-background-subtle");
    expect(block).toContain("aria-pressed:text-foreground-strong");
    assertNoAccentChrome(block, "toggle css");
  });

  test("month and year views compose date grids instead of title lists", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/routes/calendar-demo/CalendarDemoRoute.tsx"),
      "utf8",
    );
    expect(source).toContain("calendarMonthDayLayout");
    expect(source).toContain("calendarMonthWeekLayout");
    expect(source).toContain("Resize ${item.event.title} end");
    expect(source).toContain("calendarInspectorOccurrence");
    expect(source).toContain("clipStart");
    expect(source).toContain("clipEnd");
    expect(source).toContain("calendarBusyDates");
    expect(source).toContain('calendarCells("month"');
    expect(source).toContain("Repeat every");
    expect(source).toContain("const hourStart = 0");
    expect(source).toContain("const hourEnd = 24");
    expect(source).toContain("overflowDay");
    expect(source).toContain("Events on");
    expect(source).toContain("setOverflowDay(cell.date)");
    expect(source).toContain("previewCalendarMonth");
    expect(source).toContain('color: "accent"');
    expect(source).not.toContain("uniqueTitles");
  });
});
