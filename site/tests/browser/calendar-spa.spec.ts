import { expect, test } from "@playwright/test";

test("Calendar Create and mini-month jump keep the current view", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  await expect(page.getByRole("grid", { name: "Week", exact: true })).toBeVisible();

  await page.keyboard.press("c");
  const inspector = page.getByRole("region", { name: "Event" });
  await expect(inspector.getByRole("textbox", { name: "Title" })).toHaveValue("Event");
  await expect(inspector.getByLabel("Start", { exact: true })).toHaveValue("2026-05-25T10:00");
  await expect(inspector.getByLabel("End", { exact: true })).toHaveValue("2026-05-25T10:30");
  await expect(page.getByRole("grid", { name: "Week", exact: true }).getByRole("button", { name: "Event", exact: true })).toBeVisible();

  await page.locator('[data-ui-component="contextual-controls"][aria-label="Calendar sources"]').focus();
  const dateGrid = page.getByRole("region", { name: "Jump to date" }).getByRole("grid", { name: "Jump 2026-05", exact: true });
  await dateGrid.getByRole("gridcell", { name: "2026-05-26", exact: true }).click();
  await expect(page.getByRole("grid", { name: "Week", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/view=week/);
  await expect(page).toHaveURL(/date=2026-05-26/);
  await dateGrid.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/date=2026-05-27/);
});

test("Calendar c hotkey creates a timed event on the visible date", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  await page.getByRole("button", { name: "View", exact: true }).focus();
  await page.keyboard.press("c");
  const inspector = page.getByRole("region", { name: "Event" });
  await expect(inspector.getByRole("textbox", { name: "Title" })).toHaveValue("Event");
  await expect(inspector.getByLabel("Start", { exact: true })).toHaveValue("2026-05-25T10:00");
  await expect(inspector.getByLabel("End", { exact: true })).toHaveValue("2026-05-25T10:30");
});

test("Calendar view and period hotkeys use the canonical Web keymap", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  await page.getByRole("button", { name: "View", exact: true }).focus();
  await page.keyboard.press("m");
  await expect(page).toHaveURL(/view=month/);
  await expect(page.getByRole("gridcell", { name: "2026-05-25", exact: true })).toBeVisible();
  await page.keyboard.press("n");
  await expect(page).toHaveURL(/date=2026-06-25/);
  await expect(page.getByRole("gridcell", { name: "2026-06-25", exact: true })).toBeVisible();
  await page.keyboard.press("p");
  await expect(page).toHaveURL(/date=2026-05-25/);
  await expect(page.getByRole("gridcell", { name: "2026-05-25", exact: true })).toBeVisible();
  await page.keyboard.press("w");
  await expect(page).toHaveURL(/view=week/);
});

test("Calendar week empty drag creates a timed interval and inspector shows that span", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  const thursday = page.locator('[data-calendar-grid="time"][data-calendar-day="2026-05-28"]');
  const box = await thursday.boundingBox();
  if (box === null) throw new Error("Week time-grid Thursday is not visible.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * (4 / 12));
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * (5.5 / 12), { steps: 5 });
  await page.mouse.up();
  await expect(thursday.getByRole("button", { name: "Event", exact: true })).toBeVisible();
  const inspector = page.getByRole("region", { name: "Event" });
  await expect(inspector.getByRole("textbox", { name: "Title" })).toHaveValue("Event");
  const start = await inspector.getByLabel("Start", { exact: true }).inputValue();
  const end = await inspector.getByLabel("End", { exact: true }).inputValue();
  expect(start.startsWith("2026-05-28T")).toBe(true);
  expect(end.startsWith("2026-05-28T")).toBe(true);
  expect(start < end).toBe(true);
  await expect(inspector.getByRole("button", { name: "All-day", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("Calendar month empty drag paints an all-day span without leaving month view", async ({ page }) => {
  await page.goto("/demo/calendar?view=month&date=2026-05-25");
  const from = page.getByRole("gridcell", { name: "2026-05-22", exact: true });
  const to = page.getByRole("gridcell", { name: "2026-05-23", exact: true });
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (start === null || end === null) throw new Error("Month days are not visible.");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
  await page.mouse.up();
  const month = page.getByRole("grid", { name: "Month", exact: true });
  await expect(month).toBeVisible();
  await expect(month.locator("[data-calendar-span=\"2\"]")).toBeVisible();
  const inspector = page.getByRole("region", { name: "Event" });
  await expect(inspector.getByRole("textbox", { name: "Title" })).toHaveValue("Event");
  await expect(inspector.getByLabel("Start", { exact: true })).toHaveValue("2026-05-22");
  const inspectorEnd = inspector.getByLabel("End", { exact: true });
  await expect(inspectorEnd).toHaveValue("2026-05-23");
  await inspectorEnd.fill("2026-05-25");
  await inspectorEnd.press("Enter");
  await expect(inspectorEnd).toHaveValue("2026-05-25");
  const eventBars = month.locator("[data-calendar-span]").filter({
    has: page.getByRole("button", { name: "Event", exact: true }),
  });
  await expect(eventBars).toHaveCount(2);
  await expect.poll(() => eventBars.evaluateAll((bars) => (
    bars.map((bar) => bar.getAttribute("data-calendar-span")).sort()
  ))).toEqual(["2", "2"]);
});

test("Calendar month all-day bar resizes by its end handle", async ({ page }) => {
  await page.goto("/demo/calendar?view=month&date=2026-05-25");
  const from = page.getByRole("gridcell", { name: "2026-05-22", exact: true });
  const to = page.getByRole("gridcell", { name: "2026-05-23", exact: true });
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (start === null || end === null) throw new Error("Month days are not visible.");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
  await page.mouse.up();
  const month = page.getByRole("grid", { name: "Month", exact: true });
  await expect(month.locator("[data-calendar-span=\"2\"]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resize Event start", exact: true })).toHaveCount(0);
  const handle = page.getByRole("button", { name: "Resize Event end", exact: true });
  const box = await handle.boundingBox();
  if (box === null) throw new Error("Month resize handle is not visible.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + end.width, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.press("F2");
  const inspector = page.getByRole("region", { name: "Event" });
  await expect(inspector.getByRole("textbox", { name: "Title" })).toHaveValue("Event");
  await expect(inspector.getByLabel("Start", { exact: true })).toHaveValue("2026-05-22");
  const endValue = await inspector.getByLabel("End", { exact: true }).inputValue();
  expect(endValue >= "2026-05-24").toBe(true);
  await expect(month).toBeVisible();
});

test("Calendar empty month cell click clears selection and does not create", async ({ page }) => {
  await page.goto("/demo/calendar?view=month&date=2026-05-25");
  const month = page.getByRole("grid", { name: "Month", exact: true });
  const occurrence = month.getByRole("button", { name: "09:00 매일 뉴스 브리핑", exact: true }).first();
  await occurrence.click();
  await expect(occurrence).toHaveAttribute("data-selected", "true");
  await expect(page.getByRole("region", { name: "Event" })).toBeVisible();
  await page.getByRole("gridcell", { name: "2026-05-21", exact: true }).click();
  await expect(page.getByRole("region", { name: "Event" })).toHaveCount(0);
  await expect(month.getByRole("button", { name: "Event", exact: true })).toHaveCount(0);
});

test("Calendar Home and Work chips use distinct fill tokens", async ({ page }) => {
  await page.goto("/demo/calendar?view=month&date=2026-05-25");
  const home = page.getByRole("button", { name: "휴일", exact: true });
  const work = page.getByRole("button", { name: /경쟁사 가격 모니터링/ }).first();
  await expect(home).toHaveAttribute("data-calendar-color", "accent");
  await expect(work).toHaveAttribute("data-calendar-color", "subtle");
});

test("Calendar month +N more opens that day's events without leaving month view", async ({ page }) => {
  await page.goto("/demo/calendar?view=month&date=2026-05-25");
  const day = page.getByRole("gridcell", { name: "2026-05-25", exact: true });
  await day.getByRole("button", { name: /\+\d+ more/ }).click();
  const overflow = page.getByRole("dialog", { name: "Events on 2026-05-25", exact: true });
  await expect(overflow).toBeVisible();
  await expect(page.getByRole("grid", { name: "Month", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(overflow).toHaveCount(0);
  await day.getByRole("button", { name: /\+\d+ more/ }).click();
  await expect(overflow).toBeVisible();
  const lunch = overflow.getByRole("button", { name: "12:00 점심", exact: true });
  await lunch.click();
  await expect(lunch).toHaveAttribute("data-selected", "true");
  await expect(page.getByRole("region", { name: "Event" })).toBeVisible();
  await lunch.dblclick();
  await expect(page.getByRole("region", { name: "Event" }).getByRole("textbox", { name: "Title" })).toHaveValue("점심");
  await expect(page.getByRole("grid", { name: "Month", exact: true })).toBeVisible();
});
