import { expect, test } from "@playwright/test";

test("Collaboration Usage commits native input and ingests a remote change", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/docs/collaboration");
  const demo = page.locator('[data-live-demo="/collaboration"]');
  await demo.scrollIntoViewIfNeeded();
  const editable = demo.getByRole("textbox", { name: "Collaborative title" });

  await expect(editable).toBeVisible();
  await editable.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("local");
  await expect(demo.getByTestId("collaboration-document")).toContainText("local");

  await demo.getByRole("button", { name: "원격 변경 수신" }).click();
  await expect(demo.getByTestId("collaboration-document")).toContainText("remote");
  await expect(editable).toContainText("remote");
});
