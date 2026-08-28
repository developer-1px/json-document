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
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: "주간 사용량 리포트 요약", exact: true })).toBeVisible();

  const mondayAllDay = page.locator('[data-calendar-allday-day="2026-05-25"]').first();
  const wednesdayAllDay = page.locator('[data-calendar-allday-day="2026-05-27"]').first();
  await dragBetween(page, mondayAllDay, wednesdayAllDay, 0.5);
  const allDayEvent = page.locator('[data-calendar-allday-day] > button[aria-label="Event"]').first();
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
  await page.getByRole("region", { name: "2026-05", exact: true }).getByRole("button", { name: "2026-05-01", exact: true }).click();
  await expect(page.getByRole("grid", { name: "Day", exact: true })).toBeVisible();
  const dayGrid = timeGridDay(page, "2026-05-01");
  await dragWithin(page, dayGrid, 4 / 12, 5.5 / 12);
  const created = dayGrid.getByRole("button", { name: "Event", exact: true });
  await expect(created).toBeVisible();
  await created.click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dayGrid.getByRole("button", { name: "Event", exact: true })).toHaveCount(0);
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
  await expect(usage.getByRole("tab", { name: "date-values.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "point-target.ts", exact: true })).toBeVisible();
  await expect(usage.getByRole("tab", { name: "use-calendar-viewport-position.ts", exact: true })).toBeVisible();
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
