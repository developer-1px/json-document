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
    assertNoAccentChrome(styles.calendarToggle(), "calendarToggle");
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
    expect(source).toContain("calendarBusyDates");
    expect(source).toContain('calendarCells("month"');
    expect(source).not.toContain("uniqueTitles");
  });
});
