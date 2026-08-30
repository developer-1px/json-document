import { expect, test, type Locator, type Page } from "@playwright/test";

test("Calendar Hands edits one interval across day, week, month, and year views", async ({ page }) => {
  await page.goto("/demo/calendar");

  await expect(page.getByRole("grid", { name: "Week" })).toBeVisible();
  const monday = timeGridDay(page, "2026-05-25");
  await expect(monday.getByRole("button", { name: "주간 사용량 리포트 요약", exact: true })).toBeVisible();
  const thursday = timeGridDay(page, "2026-05-28");
  await dragWithin(page, thursday, 4 / 12, 5.5 / 12);
  await expect(thursday.getByRole("button", { name: "Event", exact: true })).toBeVisible();

  const weeklyReport = monday.getByRole("button", { name: "주간 사용량 리포트 요약", exact: true });
  await weeklyReport.click();
  await expect(weeklyReport).toHaveAttribute("data-selected", "true");
  const tuesday = timeGridDay(page, "2026-05-26");
  await dragBetween(page, weeklyReport, tuesday, 3 / 12);
  await expect(tuesday.getByRole("button", { name: "주간 사용량 리포트 요약", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "주간 사용량 리포트 요약", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("button", { name: "주간 사용량 리포트 요약", exact: true })).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByRole("button", { name: "주간 사용량 리포트 요약", exact: true })).toBeVisible();

  const mondayAllDay = page.locator('[data-calendar-allday-day="2026-05-25"]').first();
  await mondayAllDay.dblclick();
  const allDayEvent = page.locator("[data-calendar-allday-day]")
    .getByRole("button", { name: "Event", exact: true })
    .first();
  await expect(allDayEvent).toBeVisible();
  const beforeResize = await allDayEvent.boundingBox();
  const resizeEnd = allDayEvent.locator("..").getByRole("button", { name: "Resize Event end", exact: true });
  await dragBy(page, resizeEnd, 90, 0);
  const afterResize = await allDayEvent.boundingBox();
  expect(beforeResize).not.toBeNull();
  expect(afterResize).not.toBeNull();
  expect(afterResize!.width).toBeGreaterThan(beforeResize!.width);

  await page.getByRole("radio", { name: "Month", exact: true }).click();
  const emptyMonthDay = page.getByRole("gridcell", { name: "2026-05-23", exact: true });
  await emptyMonthDay.dblclick();
  const month = page.getByRole("grid", { name: "Month", exact: true });
  await expect(month.getByRole("button", { name: "Event", exact: true }).first()).toBeVisible();

  await page.getByRole("radio", { name: "Year", exact: true }).click();
  const may = page.getByRole("region", { name: "2026-05", exact: true });
  await expect(page.getByRole("grid", { name: "2026-05", exact: true })).toBeVisible();
  await may.getByRole("button", { name: "May", exact: true }).click();
  await expect(page.getByRole("grid", { name: "Month", exact: true })).toBeVisible();
  await expect(page.getByRole("grid", { name: "Month", exact: true }).getByRole("button", { name: "Event", exact: true }).first()).toBeVisible();

  await page.getByRole("radio", { name: "Year", exact: true }).click();
  await page.getByRole("region", { name: "2026-05", exact: true }).getByRole("gridcell", { name: "2026-05-01", exact: true }).click();
  await expect(page.getByRole("grid", { name: "Day", exact: true })).toBeVisible();
  const dayGrid = timeGridDay(page, "2026-05-01");
  await dragWithin(page, dayGrid, 4 / 12, 5.5 / 12);
  const created = dayGrid.getByRole("button", { name: "Event", exact: true });
  await expect(created).toBeVisible();
  await created.click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dayGrid.getByRole("button", { name: "Event", exact: true })).toHaveCount(0);
});

test("Calendar selection uses the native clipboard and one history across copy, cut, paste, undo, and redo", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  const event = page.getByRole("button", { name: "고객사 싱크", exact: true });

  await event.click();
  await expect(event).toHaveAttribute("data-selected", "true");
  await expect(page.getByRole("region", { name: "Event" })).toBeVisible();

  await page.keyboard.press("ControlOrMeta+c");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("고객사 싱크");

  await page.keyboard.press("ControlOrMeta+v");
  await expect(page.getByRole("button", { name: "고객사 싱크", exact: true })).toHaveCount(2);

  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByRole("button", { name: "고객사 싱크", exact: true })).toHaveCount(1);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(page.getByRole("button", { name: "고객사 싱크", exact: true })).toHaveCount(2);

  await page.keyboard.press("ControlOrMeta+x");
  await expect(page.getByRole("button", { name: "고객사 싱크", exact: true })).toHaveCount(1);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByRole("button", { name: "고객사 싱크", exact: true })).toHaveCount(2);
});

test("Calendar drags the selected occurrence set with one temporal delta and one undo", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  const first = page.getByRole("button", { name: "경쟁사 가격 모니터링", exact: true });
  const second = page.getByRole("button", { name: "고객사 싱크", exact: true });
  await first.click();
  await second.click({ modifiers: ["Meta"] });
  await expect(first).toHaveAttribute("data-selected", "true");
  await expect(second).toHaveAttribute("data-selected", "true");

  await dragBy(page, first, 0, 72);
  const movedFirst = page.getByRole("button", { name: "경쟁사 가격 모니터링", exact: true });
  const movedSecond = page.getByRole("button", { name: "고객사 싱크", exact: true });
  await expect(movedFirst).toContainText("08:15");
  await expect(movedSecond).toContainText("12:15");
  await expect(movedFirst).toHaveAttribute("data-selected", "true");
  await expect(movedSecond).toHaveAttribute("data-selected", "true");

  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByRole("button", { name: "경쟁사 가격 모니터링", exact: true })).toContainText("07:00");
  await expect(page.getByRole("button", { name: "고객사 싱크", exact: true })).toContainText("11:00");
});

test("Calendar pastes into a selected empty time slot", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  const event = page.getByRole("button", { name: "고객사 싱크", exact: true });
  await event.click();
  await page.keyboard.press("ControlOrMeta+c");

  const target = timeGridDay(page, "2026-05-27");
  await target.click({ position: { x: 20, y: 12 * 72 } });
  await expect(target).toBeFocused();
  await expect(page.locator('[data-calendar-selected-slot="2026-05-27T12:00"]')).toBeVisible();

  await page.keyboard.press("ControlOrMeta+v");
  await expect(page.getByRole("button", { name: "고객사 싱크", exact: true })).toHaveCount(2);
  expect(await page.getByRole("button", { name: "고객사 싱크", exact: true }).allTextContents())
    .toContain("고객사 싱크12:00");
});

test("Calendar occurrence selection shares replace, toggle, extend, focus, and clipboard semantics", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  const first = page.getByRole("button", { name: "고객사 싱크", exact: true });
  const second = page.getByRole("button", { name: "주간 사용량 리포트 요약", exact: true });

  await first.click();
  await second.click({ modifiers: ["ControlOrMeta"] });
  await expect(first).toHaveAttribute("data-selected", "true");
  await expect(second).toHaveAttribute("data-selected", "true");
  await expect(second).toHaveAttribute("data-primary", "true");
  await first.focus();
  await expect(first).toBeFocused();
  await expect(first).not.toHaveAttribute("data-primary", "true");

  await page.keyboard.press("ControlOrMeta+c");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("고객사 싱크");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("주간 사용량 리포트 요약");
  await page.keyboard.press("ControlOrMeta+v");
  await expect(page.getByRole("button", { name: "고객사 싱크", exact: true })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "주간 사용량 리포트 요약", exact: true })).toHaveCount(2);
  expect(await page.getByRole("button", { name: "고객사 싱크", exact: true }).allTextContents())
    .toEqual(["고객사 싱크10:00", "고객사 싱크11:00"]);
  expect(await page.getByRole("button", { name: "주간 사용량 리포트 요약", exact: true }).allTextContents())
    .toEqual(["주간 사용량 리포트 요약09:00", "주간 사용량 리포트 요약10:00"]);
  await page.keyboard.press("ControlOrMeta+z");

  await first.click();
  await second.click({ modifiers: ["Shift"] });
  await expect(first).toHaveAttribute("data-selected", "true");
  await expect(second).toHaveAttribute("data-selected", "true");

  await page.getByRole("radio", { name: "Month", exact: true }).click();
  const month = page.getByRole("grid", { name: "Month", exact: true });
  await expect(month.getByRole("gridcell", { name: "2026-05-25", exact: true })).toHaveAttribute("aria-selected", "true");
  const monthFirst = month.getByRole("button").filter({ hasText: "경쟁사 가격 모니터링" }).first();
  const monthSecond = month.getByRole("button").filter({ hasText: "매일 뉴스 브리핑" }).first();
  await monthFirst.click();
  await monthSecond.click({ modifiers: ["ControlOrMeta"] });
  await expect(monthFirst).toHaveAttribute("data-selected", "true");
  await expect(monthSecond).toHaveAttribute("data-selected", "true");
});

test("Calendar clipboard remains reachable from day, month, and recurring occurrence selections", async ({ page }) => {
  for (const { view, title } of [
    { view: "day", title: "고객사 싱크" },
    { view: "month", title: "경쟁사 가격 모니터링" },
  ] as const) {
    await page.goto(`/demo/calendar?view=${view}&date=2026-05-25`);
    const event = view === "month"
      ? page.getByRole("grid", { name: "Month", exact: true }).getByRole("button").filter({ hasText: title }).first()
      : page.getByRole("button", { name: title, exact: true }).first();
    await event.click();
    await expect(event).toHaveAttribute("data-selected", "true");
    await expect(page.getByRole("region", { name: "Event" })).toBeVisible();
    await page.keyboard.press("ControlOrMeta+c");
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(title);
  }

  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  const occurrences = page.getByRole("button", { name: "매일 뉴스 브리핑", exact: true });
  await occurrences.nth(0).click();
  await occurrences.nth(1).click({ modifiers: ["ControlOrMeta"] });
  await expect(occurrences.nth(0)).toHaveAttribute("data-selected", "true");
  await expect(occurrences.nth(1)).toHaveAttribute("data-selected", "true");
  await page.keyboard.press("ControlOrMeta+c");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText().then((text) => text.split("\n").length))).toBe(2);
  await page.keyboard.press("ControlOrMeta+v");
  await expect(page.getByRole("button", { name: "매일 뉴스 브리핑", exact: true })).toHaveCount(7);
});

test("Calendar title editing preserves the input's native text clipboard", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  const event = page.getByRole("button", { name: "고객사 싱크", exact: true });
  await event.dblclick();
  const title = page.getByRole("region", { name: "Event" }).getByRole("textbox", { name: "Title" });
  await title.selectText();
  await page.keyboard.press("ControlOrMeta+c");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("고객사 싱크");
});


test("Calendar Usage exposes its canonical Editing and pointer sources", async ({ page }) => {
  await page.goto("/editors");
  const usage = page.locator('[data-live-demo="/demo/calendar"]');
  await expect(usage).toHaveCount(1);
  await usage.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const sourceTabs = usage.getByRole("tablist", { name: "Demo and source files" });
  await expect(sourceTabs).toBeVisible();
  await usage.getByRole("tab", { name: "CalendarDemoRoute.tsx", exact: true }).click();
  await expect(usage.getByRole("tab", { name: "calendar.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "calendar-input.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "calendar-time-grid-pointer.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "calendar-allday-pointer.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "calendar-month-pointer.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "point-target.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "use-calendar-viewport-position.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "use-calendar-rename-input.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "use-calendar-keyboard.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "use-anchored-floating-position.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "anchored-floating-position.ts", exact: true })).toHaveCount(2);
});

function timeGridDay(page: Page, day: string): Locator {
  return page.locator(`[data-calendar-grid="time"][data-calendar-day="${day}"]`);
}

async function dragWithin(page: Page, target: Locator, fromRatio: number, toRatio: number): Promise<void> {
  const box = await target.boundingBox();
  if (box === null) throw new Error("Calendar time-grid day is not visible.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * fromRatio);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * toRatio, { steps: 5 });
  await page.mouse.up();
}

async function dragBetween(page: Page, source: Locator, target: Locator, targetRatio: number): Promise<void> {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (from === null || to === null) throw new Error("Calendar drag endpoints are not visible.");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height * targetRatio, { steps: 8 });
  await page.mouse.up();
}

async function dragBy(page: Page, source: Locator, deltaX: number, deltaY: number): Promise<void> {
  const box = await source.boundingBox();
  if (box === null) throw new Error("Calendar resize handle is not visible.");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y + deltaY, { steps: 8 });
  await page.mouse.up();
}
