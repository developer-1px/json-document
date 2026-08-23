import { expect, test, type Locator, type Page } from "@playwright/test";

test("Annotation Hands creates a point on click, a rectangle on drag, and an arrow", async ({ page }) => {
  await page.goto("/demo/annotation");
  await expect(page.getByRole("heading", { name: "Annotation Hands Demo" })).toBeVisible();
  const canvas = page.getByLabel("Raster annotation canvas");
  const box = await requiredBox(canvas);

  await canvas.click({ position: { x: box.width * 0.3, y: box.height * 0.42 } });
  await expect(page.getByRole("region", { name: "Request 1 comment" })).toBeVisible();
  await page.getByRole("button", { name: "Comment" }).click();
  await drag(page, box.x + box.width * 0.5, box.y + box.height * 0.25, box.x + box.width * 0.72, box.y + box.height * 0.5);
  const rectangleStroke = await page.locator("[data-annotation-id]").nth(1).locator("rect").evaluate((element) => getComputedStyle(element).stroke);
  expect(rectangleStroke).not.toBe("none");
  expect(rectangleStroke).not.toBe("rgb(0, 0, 0)");
  await page.getByRole("button", { name: "Arrow" }).click();
  await drag(page, box.x + box.width * 0.18, box.y + box.height * 0.72, box.x + box.width * 0.38, box.y + box.height * 0.55);

  const state = await structured(page);
  expect(state.annotations.map((annotation: { mark: { type: string } }) => annotation.mark.type))
    .toEqual(["marker", "rectangle", "arrow"]);
  await expect(page.getByLabel("Annotation instruction")).toHaveValue("");
  await page.getByLabel("Annotation instruction").fill("고양이 쪽으로 화살표를 옮겨 주세요.");
  expect((await structured(page)).annotations[2].body.instruction).toBe("고양이 쪽으로 화살표를 옮겨 주세요.");
  await expect(page.getByRole("button", { name: /Request 3 · arrow/ })).toContainText("고양이 쪽으로 화살표를 옮겨 주세요.");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("region", { name: "Request 3 comment" })).toBeHidden();
});

test("Annotation Hands moves, resizes, deletes, and restores history", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  const box = await requiredBox(canvas);

  await page.getByRole("button", { name: "Comment" }).click();
  await drag(page, box.x + box.width * 0.45, box.y + box.height * 0.28, box.x + box.width * 0.68, box.y + box.height * 0.52);
  const created = (await structured(page)).annotations[0].target;

  await page.getByRole("button", { name: "Select" }).click();
  const annotation = page.locator("[data-annotation-id]").first();
  const annotationBox = await requiredBox(annotation);
  await drag(page, annotationBox.x + 4, annotationBox.y + 4, annotationBox.x + 44, annotationBox.y + 24);
  const moved = (await structured(page)).annotations[0].target;
  expect(moved.x).toBeGreaterThan(created.x);
  expect(moved.y).toBeGreaterThan(created.y);

  const handle = page.getByLabel("Resize rectangle");
  const handleBox = await requiredBox(handle);
  await drag(page, handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2, handleBox.x + 50, handleBox.y + 35);
  const resized = (await structured(page)).annotations[0].target;
  expect(resized.width).toBeGreaterThan(moved.width);
  expect(resized.height).toBeGreaterThan(moved.height);

  await canvas.focus();
  await page.keyboard.press("Delete");
  expect((await structured(page)).annotations).toHaveLength(0);
  await page.getByRole("button", { name: "Undo" }).click();
  expect((await structured(page)).annotations).toHaveLength(1);
  await page.getByRole("button", { name: "Redo" }).click();
  expect((await structured(page)).annotations).toHaveLength(0);
});

test("Annotation Hands restores structured state and rasterizes a flattened image", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  await canvas.click({ position: { x: 260, y: 220 } });
  await page.getByRole("button", { name: "Save state" }).click();
  await canvas.focus();
  await page.keyboard.press("Delete");
  expect((await structured(page)).annotations).toHaveLength(0);
  await page.getByRole("button", { name: "Restore state" }).click();
  expect((await structured(page)).annotations).toHaveLength(1);

  await page.getByRole("tab", { name: "Image" }).click();
  const output = page.getByTestId("annotation-image-output");
  await expect(output).toBeVisible();
  await expect(output).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(page.getByRole("link", { name: "Download PNG" })).toHaveAttribute("download", "annotation-request.png");
});

async function structured(page: Page) {
  return JSON.parse(await page.getByTestId("annotation-structured-output").textContent() ?? "null");
}

async function requiredBox(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("Expected a bounding box");
  return box;
}

async function drag(page: Page, fromX: number, fromY: number, toX: number, toY: number) {
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps: 4 });
  await page.mouse.up();
}
