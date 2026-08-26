import { expect, test } from "@playwright/test";

test("Artifact prototype switches between MD, PPT, and Sheet concepts", async ({ page }) => {
  await page.goto("/viewer");

  await expect(page.getByRole("heading", { level: 1, name: "최종 계층의 계약을 먼저 검증합니다." })).toBeVisible();
  await expect(page.getByLabel("Markdown artifact mock")).toBeVisible();
  await expect(page.getByText(/launch-brief\.md · mock artifact/)).toBeVisible();

  await page.getByRole("radio", { name: "PPT" }).click();
  await expect(page.getByLabel("Presentation artifact mock")).toBeVisible();
  await expect(page.getByText("Generation is only the first move.")).toBeVisible();

  await page.getByRole("radio", { name: "Sheet" }).click();
  await expect(page.getByLabel("Spreadsheet artifact mock")).toBeVisible();
  await expect(page.getByRole("grid", { name: "Launch plan" })).toBeVisible();
  await expect(page.getByLabel("Composer context")).toContainText("#launch-plan.sheet");
});
