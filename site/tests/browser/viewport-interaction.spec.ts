import { expect, test } from "@playwright/test";

test("Viewport interaction preserves an anchor and yields follow to the user", async ({ page }) => {
  await page.goto("/demo/viewport");
  const viewport = page.getByTestId("viewport");
  const anchor = viewport.locator("[data-row-id]").filter({ visible: true }).last();
  const before = await anchor.evaluate((element) => element.getBoundingClientRect().top);

  await page.getByRole("button", { name: "Prepend 3 rows" }).click();
  await expect(page.getByTestId("viewport-status")).toHaveText("Anchor preserved");
  const after = await anchor.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(after - before)).toBeLessThan(2);

  await page.getByRole("button", { name: "Resume follow" }).click();
  await viewport.dispatchEvent("wheel");
  await expect(page.getByTestId("viewport-status")).toHaveText("User owns scroll");

  await page.getByRole("button", { name: "Resume follow" }).click();
  await page.getByRole("button", { name: "Append stream chunk" }).click();
  await expect(page.getByTestId("viewport-status")).toHaveText("Follow end");
  await expect.poll(() => viewport.evaluate((element) =>
    Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop),
  )).toBeLessThan(2);
});
