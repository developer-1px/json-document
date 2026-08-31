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
    expect(styles.hourRule()).toContain("border-line-subtle/45");
    expect(styles.weekCell()).toContain("border-line-subtle/30");
    expect(styles.weekSticky()).toContain("border-line-subtle/40");
    expect(styles.monthWeek()).toContain("border-line-subtle/60");
    expect(styles.creationTimeHint()).toContain("text-foreground-muted/55");
    expect(styles.creationTimeHint()).toContain("translate-y-1");
    expect(styles.creationTimeHint()).not.toContain("-translate-y-1/2");
    expect(styles.hourLabel()).toContain("text-foreground-muted");
    expect(styles.selectedSlot()).toContain("border-y-2");
    expect(styles.selectedSlot()).toContain("bg-clip-padding");
    expect(css).toContain('[data-ui-presentation="calendar-time-grid"]:hover');
    expect(css).toContain("bg-transparent");
  });

  test("details editor aligns popup fields with the canonical product field grammar", () => {
    const css = readFileSync(path.join(siteRoot, "src/app/index.css"), "utf8");
    const source = readFileSync(
      path.resolve(siteRoot, "../packages/json-document-calendar/src/calendar-event-inspector.tsx"),
      "utf8",
    );
    expect(css).toContain('[data-ui-control="choice"][data-ui-presentation="popup"] > button[aria-haspopup="listbox"]');
    expect(css).toContain('[data-ui-control="choice"][data-ui-presentation="popup"] > [role="listbox"]');
    expect(source).toContain("<InspectorChoiceField classNames={props.classNames} label={props.labels.calendar}>");
    expect(source).toContain("<InspectorChoiceField classNames={props.classNames} label={props.labels.repeat}>");
    expect(styles.calendarToggle()).toContain("justify-start");
    expect(styles.calendarToggle()).toContain("text-left");
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
    const host = readFileSync(
      path.join(siteRoot, "src/routes/calendar-demo/CalendarDemoRoute.tsx"),
      "utf8",
    );
    const monthGrid = readFileSync(
      path.join(siteRoot, "../packages/json-document-calendar/src/calendar-month-grid.tsx"),
      "utf8",
    );
    expect(monthGrid).toContain("calendarMonthDayLayout");
    expect(monthGrid).toContain("calendarMonthWeekLayout");
    expect(monthGrid).toContain("props.labels.resizeEnd(item.event)");
    expect(monthGrid).toContain("clippedEnd");
    expect(monthGrid).toContain("overflowDay");
    expect(monthGrid).toContain("setOverflowDay(cell.date)");
    expect(host).toContain("<CalendarMonthGrid");
    expect(host).toContain("useCalendarHand");
    expect(host).toContain("calendarBusyDates");
    expect(host).toContain('calendarCells("month"');
    expect(host).toContain("Repeat every");
    expect(host).toContain("const hourStart = 0");
    expect(host).toContain("const hourEnd = 24");
    expect(host).toContain("Events on");
    expect(host).toContain("paintedEvents = hand.paintedEvents");
    expect(host).toContain('color: "accent"');
    expect(host).not.toContain("uniqueTitles");
    expect(monthGrid).not.toContain('!hand.isPrimaryOccurrence(item.event.id, item.event.start) ? null : (');
    expect(host).toContain('eventResizeEnd: calendarControlAffordance("eventResizeEnd")');
  });
});
