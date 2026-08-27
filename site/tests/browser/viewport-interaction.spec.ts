import { expect, test } from "@playwright/test";

test("real stream uses temporary trailing range to position an exact object", async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto("/demo/viewport");
  const viewport = page.getByTestId("viewport");

  await page.getByRole("button", { name: "Submit captured prompt" }).click();
  const target = viewport.locator('[data-viewport-position-target-key="submitted-request"]');
  await expect.poll(async () => target.evaluate((element) => {
    const viewportElement = element.closest('[data-testid="viewport"]')!;
    return Math.abs(element.getBoundingClientRect().top - viewportElement.getBoundingClientRect().top - 96);
  })).toBeLessThan(2);

  const initialTailRange = Number.parseInt(await page.getByTestId("tail-range").innerText(), 10);
  expect(initialTailRange).toBeGreaterThan(0);
  await expect.poll(async () => Number.parseInt(
    await page.getByTestId("tail-range").innerText(),
    10,
  )).toBeLessThan(initialTailRange);

  await expect(page.getByTestId("viewport-status")).toHaveText(
    "Captured response complete · requested position retained",
    { timeout: 20_000 },
  );
  await viewport.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(page.getByText("position control: released")).toBeVisible();
  await expect(page.getByTestId("tail-range")).toHaveText("0px");
  await expect(page.getByTestId("viewport-status")).toContainText("Target left viewport");

  await page.getByRole("button", { name: "Replay captured response" }).click();
  await expect(page.getByTestId("viewport-status")).toHaveText(
    "Captured response complete · requested position retained",
    { timeout: 20_000 },
  );
  await expect(page.getByText("position control: active")).toBeVisible();
  await expect.poll(async () => target.evaluate((element) => {
    const viewportElement = element.closest('[data-testid="viewport"]')!;
    return Math.abs(element.getBoundingClientRect().top - viewportElement.getBoundingClientRect().top - 96);
  })).toBeLessThan(2);

  await expect(page.getByText("1,052 deltas · 87 chunks")).toBeVisible();
  await expect(page.getByText("bounded-browser-memory")).toBeVisible();
  await expect(page.getByText("applied")).toBeVisible();
});
