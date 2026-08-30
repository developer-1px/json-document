import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { calendarDemoRecipe } from "../../src/routes/calendar-demo/calendar-demo-styles";
import { calendarControlAffordances } from "../../src/routes/calendar-demo/calendar-control-affordances";

const forbidden = ["border-l-line-accent", "outline-line-accent", "ring-line-accent"] as const;
const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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
    expect(styles.timedEvent()).not.toContain("data-[selected=true]");
    expect(styles.timedEvent()).toContain("data-[calendar-color=accent]:bg-background-accent-subtle");
    expect(styles.timedEvent()).toContain("rounded-control");
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

  test("inline choices wrap inside a narrow inspector", () => {
    const css = readFileSync(path.join(siteRoot, "src/app/index.css"), "utf8");
    const start = css.indexOf('[data-ui-control="choice"][data-ui-presentation="inline"] {');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf("}", start) + 1);
    expect(block).toContain("flex-wrap");
    expect(block).toContain("min-w-0");
  });

  test("time grid keeps calendar structure visible without a full-column hover wash", () => {
    const css = readFileSync(path.join(siteRoot, "src/app/index.css"), "utf8");
    expect(styles.hourRule()).toContain("border-line-subtle/30");
    expect(styles.weekCell()).toContain("border-line-subtle/20");
    expect(styles.creationTimeHint()).toContain("text-foreground-muted");
    expect(styles.creationTimeHint()).not.toContain("text-foreground-muted/70");
    expect(css).toContain('[data-ui-presentation="calendar-time-grid"]:hover');
    expect(css).toContain("bg-transparent");
  });

  test("date-field stacks its label above the input", () => {
    const css = readFileSync(path.join(siteRoot, "src/app/index.css"), "utf8");
    const start = css.indexOf('[data-ui-control="date-field"] {');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf("}", start) + 1);
    expect(block).toContain("grid");
    expect(block).toContain("gap-1");
    expect(block).toContain("min-w-0");
    expect(block).toContain("w-full");
  });

  test("the canonical product grammar owns shared control states", () => {
    const css = readFileSync(path.join(siteRoot, "src/app/index.css"), "utf8");
    const start = css.indexOf('[data-ui-control="toggle"] {');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf("}", start) + 1);
    expect(block).toContain("aria-pressed:bg-background-subtle");
    expect(block).toContain("aria-pressed:text-foreground-strong");
    assertNoAccentChrome(block, "toggle css");
    expect(css).toContain('[data-ui-affordance="content-control"]');
    expect(css).toContain('[data-ui-affordance="direct"]');
    expect(css).toContain('[data-ui-affordance="contextual"]');
    expect(css).toContain('[data-ui-affordance="contextual-danger"]');
    expect(css).toContain('[data-ui-affordance="disabled-preview"]');
  });

  test("classifies all 34 Calendar control surfaces with the canonical vocabulary", () => {
    expect(Object.keys(calendarControlAffordances)).toHaveLength(34);
    expect(new Set(Object.values(calendarControlAffordances))).toEqual(new Set([
      "persistent",
      "content-control",
      "stateful",
      "contextual",
      "contextual-danger",
      "direct",
      "field",
      "disabled-preview",
    ]));
  });

  test("month and year views compose date grids instead of title lists", () => {
    const source = readFileSync(
      path.join(siteRoot, "src/routes/calendar-demo/CalendarDemoRoute.tsx"),
      "utf8",
    );
    expect(source).toContain("calendarMonthDayLayout");
    expect(source).toContain("calendarMonthWeekLayout");
    expect(source).toContain("Resize ${item.event.title} end");
    expect(source).toContain("useCalendarHand");
    expect(source).toContain("clipEnd");
    expect(source).toContain("calendarBusyDates");
    expect(source).toContain('calendarCells("month"');
    expect(source).toContain("Repeat every");
    expect(source).toContain("const hourStart = 0");
    expect(source).toContain("const hourEnd = 24");
    expect(source).toContain("overflowDay");
    expect(source).toContain("Events on");
    expect(source).toContain("setOverflowDay(cell.date)");
    expect(source).toContain("paintedEvents = hand.paintedEvents");
    expect(source).toContain('color: "accent"');
    expect(source).not.toContain("uniqueTitles");
    expect(source).not.toContain('!isPrimary(item.event) ? null : (');
    expect(source).toContain('affordance={calendarControlAffordance("eventResizeEnd")}');
  });
});
