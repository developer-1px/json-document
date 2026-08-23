import { expect, test, type Locator, type Page } from "@playwright/test";

test("Image Annotation Hands keeps a dragged region as an unnumbered draft", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  const box = await requiredBox(canvas);

  await drag(page, box.x + box.width * 0.2, box.y + box.height * 0.25, box.x + box.width * 0.48, box.y + box.height * 0.58);

  await expect(page.getByRole("region", { name: "Draft comment" })).toBeVisible();
  await expect(page.getByLabel("Annotation instruction")).toBeFocused();
  await expect(page.locator("[data-annotation-id]")).toHaveCount(0);
  await expect(page.getByLabel("Submit comment")).toBeDisabled();
  await expect(page.getByText("1", { exact: true })).toHaveCount(0);
});

test("Image Annotation Hands commits once and reveals the thread only on selection", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  const box = await requiredBox(canvas);
  await drag(page, box.x + box.width * 0.38, box.y + box.height * 0.28, box.x + box.width * 0.68, box.y + box.height * 0.62);
  await page.getByLabel("Annotation instruction").fill("오른쪽 여백을 조금 더 늘려 주세요.");
  await page.getByLabel("Submit comment").click();

  await expect(page.getByRole("region", { name: "Draft comment" })).toBeHidden();
  await expect(page.locator("[data-annotation-id]")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Annotation 1 thread" })).toBeHidden();

  await page.getByRole("button", { name: "Annotation 1" }).click();
  await expect(page.getByRole("region", { name: "Annotation 1 thread" })).toContainText("오른쪽 여백을 조금 더 늘려 주세요.");
  await expect(page.getByLabel("Reply")).toBeVisible();
});

test("Image Annotation Hands cancels a draft without creating an annotation", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  await canvas.click();
  await page.getByLabel("Annotation instruction").fill("취소할 요청");
  await page.getByLabel("Cancel comment").click();

  await expect(page.getByRole("region", { name: "Draft comment" })).toBeHidden();
  await expect(page.locator("[data-annotation-id]")).toHaveCount(0);
});

async function requiredBox(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("Expected a bounding box");
  return box;
}

async function drag(page: Page, fromX: number, fromY: number, toX: number, toY: number) {
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps: 6 });
  await page.mouse.up();
}
