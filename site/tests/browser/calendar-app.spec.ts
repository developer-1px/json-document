import { expect, test } from "@playwright/test";

test("Calendar app chrome fills the page without docs or workbench", async ({ page }) => {
  await page.goto("/demo/calendar");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Calendar", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Demo workbench" })).toHaveCount(0);
  await expect(page.getByRole("toolbar", { name: "Calendar controls", exact: true })).toBeVisible();
  await expect(page.getByRole("grid", { name: "Week" })).toBeVisible();
  const controls = page.getByLabel("Calendar contextual actions", { exact: true });
  await expect(controls).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Week", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create", exact: true })).toHaveCount(0);
  await controls.focus();
  await expect(page.getByRole("button", { name: "Create", exact: true })).toBeVisible();

  const navigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(navigation.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await expect(navigation.getByRole("group", { name: "Hands" })).toHaveCount(0);

  await navigation.getByRole("button", { name: "Open navigation" }).click();
  await expect(navigation.getByRole("group", { name: "Hands" })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Collapse navigation" })).toBeVisible();

  await navigation.getByRole("button", { name: "Collapse navigation" }).click();
  await expect(navigation.getByRole("group", { name: "Hands" })).toHaveCount(0);
  await expect(page.getByRole("toolbar", { name: "Calendar controls", exact: true })).toBeVisible();
});

test("Calendar view tabs stay on one toolbar axis across variable period labels", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  const viewRegion = page.getByRole("group", { name: "Calendar view", exact: true });
  const initialX = await viewRegion.evaluate((element) => element.getBoundingClientRect().x);

  for (const view of ["Day", "Month", "Year", "Week"] as const) {
    await page.getByRole("radio", { name: view, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`view=${view.toLowerCase()}`));
    await expect.poll(async () => viewRegion.evaluate((element) => element.getBoundingClientRect().x))
      .toBeCloseTo(initialX, 1);
  }
});

test("Calendar positions the work hour until the user claims the viewport", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  const viewport = page.locator("[data-calendar-time-viewport]");
  await expect(viewport).toBeVisible();
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBe(7 * 72);

  await viewport.evaluate((element) => {
    element.scrollTop = 640;
    element.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
    element.style.height = "480px";
  });
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBe(640);
});

test("Calendar keeps event time visible, hints an empty creation time, and opens anchored details on selection", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  const event = page.getByRole("button", { name: "고객사 싱크", exact: true });
  const time = event.getByText("11:00", { exact: true });

  await expect(time).toHaveCSS("opacity", "1");
  const monday = page.locator('[data-calendar-grid="time"][data-calendar-day="2026-05-25"]');
  const box = await monday.boundingBox();
  if (box === null) throw new Error("Monday time grid is not visible.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * (14.25 / 24));
  await expect(page.locator("[data-calendar-create-time]")).toHaveText("14:15");
  await event.click();
  await expect(event).toHaveAttribute("data-selected", "true");
  const details = page.getByRole("region", { name: "Event" });
  await expect(details).toBeVisible();
  await expect(details).toHaveAttribute("data-floating-placement", /^(right|left|top|bottom)/);
  await event.dblclick();
  const title = details.getByRole("textbox", { name: "Title" });
  await expect(title).toHaveValue("고객사 싱크");

  const productFont = await page.locator('[data-ui-component="product-shell"]').evaluate((element) => getComputedStyle(element).fontFamily);
  await expect(page.getByRole("radio", { name: "Week", exact: true })).toHaveCSS("font-family", productFont);
  await expect(event).toHaveCSS("font-family", productFont);
  await expect(time).toHaveCSS("font-family", productFont);
  await expect(title).toHaveCSS("font-family", productFont);
});

test("Calendar details follow the primary occurrence and flip inside a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/demo/calendar?view=week&date=2026-05-25");

  const leftEvent = page.getByRole("button", { name: "경쟁사 가격 모니터링", exact: true });
  await leftEvent.click();
  const details = page.getByRole("region", { name: "Event" });
  await expect(details).toHaveAttribute("data-floating-placement", "right-start");
  await expect(details).toHaveAttribute("data-floating-fits", "true");
  await expect(leftEvent.locator("..")).toHaveAttribute("data-calendar-event-anchor", "primary");

  const rightEvent = page.getByRole("button", { name: "월말 비용 정리", exact: true });
  await rightEvent.click();
  await expect(details).toHaveAttribute("data-floating-placement", "left-start");
  await expect(details).toHaveAttribute("data-floating-fits", "true");
  const box = await details.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(792);
  expect(box!.y).toBeGreaterThanOrEqual(8);
  expect(box!.y + box!.height).toBeLessThanOrEqual(592);
});

test("Calendar day view uses the visible date's canonical weekday cell", async ({ page }) => {
  await page.goto("/demo/calendar?view=day&date=2026-05-28");
  const day = page.getByRole("grid", { name: "Day" });
  await expect(day).toBeVisible();
  await expect(day.getByRole("columnheader", { name: "Thu 28" })).toContainText("28");
  await expect(day.getByRole("columnheader", { name: "Mon 28" })).toHaveCount(0);
});

test("Calendar month and year views show date grids", async ({ page }) => {
  await page.goto("/demo/calendar?view=month&date=2026-05-25");
  await expect(page.getByRole("grid", { name: "Month", exact: true })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "2026-05-25", exact: true })).toContainText("25");
  await page.getByLabel("Calendar contextual actions", { exact: true }).focus();
  await expect(page.getByRole("radio", { name: "Month", exact: true })).toBeChecked();
  await page.getByLabel("Calendar sources", { exact: true }).focus();
  await expect(page.getByRole("grid", { name: "Jump 2026-05", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "2026-04-27", exact: true }).first()).toHaveText("27");

  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(page.getByRole("grid", { name: "Jump 2026-06", exact: true })).toBeVisible();

  await page.getByLabel("Calendar contextual actions", { exact: true }).focus();
  await page.getByRole("radio", { name: "Month", exact: true }).press("ArrowRight");
  await expect(page.getByRole("grid", { name: "2026-05", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "2026-05", exact: true }).getByRole("button", { name: "2026-05-01" })).toHaveText("1");
  await expect(page.getByRole("region", { name: /^2026-(0[1-9]|1[0-2])$/ })).toHaveCount(12);
  await expect(page.getByRole("grid", { name: /^2026-(0[1-9]|1[0-2])$/ })).toHaveCount(12);
  await expect(page).toHaveURL(/view=year/);
  await expect(page).toHaveURL(/date=2026-05-25/);

});

test("Calendar recurrence inspector applies canonical model transitions", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  await page.getByRole("button", { name: "매일 뉴스 브리핑", exact: true }).first().dblclick();
  const following = page.getByRole("radio", { name: "Following", exact: true });
  await following.click();
  await expect(following).toBeChecked();
  await following.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "All", exact: true })).toBeChecked();
  const repeat = page.getByRole("button", { name: "Repeat", exact: true });

  await repeat.click();
  await page.getByRole("option", { name: "None", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Repeat every", exact: true })).toHaveCount(0);

  await repeat.click();
  await page.getByRole("option", { name: "Weekly", exact: true }).click();
  await expect(repeat).toHaveText("Weekly");

  const interval = page.getByRole("spinbutton", { name: "Repeat every", exact: true });
  await interval.fill("0");
  await expect(interval).toHaveValue("1");

  const until = page.getByRole("textbox", { name: "Repeat until", exact: true });
  await until.fill("2026-06-30");
  await expect(until).toHaveValue("2026-06-30");
});

test("Calendar location writes one search snapshot and restores on back", async ({ page }) => {
  await page.goto("/demo/calendar?view=month&date=2026-05-25");
  await expect(page.getByRole("grid", { name: "Month", exact: true })).toBeVisible();

  await page.getByLabel("Calendar contextual actions", { exact: true }).focus();
  await page.getByRole("radio", { name: "Week", exact: true }).click();
  await expect(page.getByRole("grid", { name: "Week", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/view=week/);
  await expect(page).toHaveURL(/date=2026-05-25/);

  await page.goBack();
  await expect(page.getByRole("grid", { name: "Month", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/view=month/);
});

test("Calendar invalid search falls back to the fixture week", async ({ page }) => {
  await page.goto("/demo/calendar?view=agenda&date=nope");
  await expect(page.getByRole("grid", { name: "Week", exact: true })).toBeVisible();
  await page.getByLabel("Calendar contextual actions", { exact: true }).focus();
  await expect(page.getByRole("radio", { name: "Week", exact: true })).toBeChecked();
  await expect(page.getByText("2026-05-25 – 2026-05-31", { exact: true })).toBeVisible();
});

test("Calendar Usage embed does not write view search params", async ({ page }) => {
  await page.goto("/editors");
  const usage = page.locator('[data-live-demo="/demo/calendar"]');
  await expect(usage).toHaveCount(1);
  await usage.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await usage.getByLabel("Calendar contextual actions", { exact: true }).focus();
  await usage.getByRole("radio", { name: "Month", exact: true }).click();
  await expect(usage.getByRole("grid", { name: "Month", exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/view=/);
});
