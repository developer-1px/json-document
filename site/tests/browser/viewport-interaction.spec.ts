import { expect, test } from "@playwright/test";

test("Cstar real fixture preserves history position and yields a live stream to the reader", async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto("/demo/viewport");
  const viewport = page.getByTestId("viewport");
  const capturedResponse = viewport.locator('[data-entry-id="captured-response"]');
  const before = await capturedResponse.evaluate((element) => element.getBoundingClientRect().top);

  await page.getByRole("button", { name: "Load earlier Cstar history" }).click();
  await expect(page.getByTestId("viewport-status")).toHaveText("Earlier Cstar history loaded · anchor preserved");
  const after = await capturedResponse.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(after - before)).toBeLessThan(2);

  await page.getByRole("button", { name: "Replay actual capture" }).click();
  await expect(page.getByTestId("viewport-status")).toContainText("Replaying captured stream");
  await capturedResponse.click();
  await expect(page.getByTestId("viewport-status")).toContainText("Reading history");
  await expect(page.getByText(/captured chunks arrived/)).toBeVisible();

  await page.getByRole("button", { name: "Return to latest" }).click();
  await expect(page.getByText(/following: true/)).toBeVisible();
  await expect(page.getByTestId("viewport-status")).toHaveText("Captured run complete", { timeout: 20_000 });
  await expect.poll(() => viewport.evaluate((element) =>
    Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop),
  )).toBeLessThan(2);

  await expect(page.getByText("1,052 deltas · 87 captured chunks")).toBeVisible();
  await expect(page.getByText("bounded-browser-memory")).toBeVisible();
  await expect(page.getByText("applied")).toBeVisible();
});
