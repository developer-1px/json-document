import { expect, test, type Locator, type Page } from "@playwright/test";

test("Annotation Hands creates a point on click, a rectangle on drag, and an arrow", async ({ page }) => {
  await page.goto("/demo/annotation");
  await expect(page.getByRole("heading", { name: "Annotation Hands Demo" })).toBeVisible();
  const canvas = page.getByLabel("Raster annotation canvas");
  const box = await requiredBox(canvas);

  await canvas.click({ position: { x: box.width * 0.3, y: box.height * 0.42 } });
  await expect(page.getByRole("region", { name: "Request 1 comment" })).toBeVisible();
  await page.getByRole("button", { name: "Comment", exact: true }).click();
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
  expect((await structured(page)).annotations[2].body.instruction).toBe("");
  await page.getByRole("button", { name: "Send comment" }).click();
  expect((await structured(page)).annotations[2].body.instruction).toBe("고양이 쪽으로 화살표를 옮겨 주세요.");
  await expect(page.getByRole("button", { name: /3 고양이 쪽으로/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Request 3 comment" })).toBeHidden();
});

test("Annotation Hands grows and shrinks the comment input with its content", async ({ page }) => {
  await page.goto("/demo/annotation");
  await page.getByLabel("Raster annotation canvas").click();
  const input = page.getByLabel("Annotation instruction");
  const initial = await requiredBox(input);

  await input.fill("첫 줄\n둘째 줄\n셋째 줄\n넷째 줄");
  const expanded = await requiredBox(input);
  expect(expanded.height).toBeGreaterThan(initial.height);

  await input.fill("한 줄");
  const collapsed = await requiredBox(input);
  expect(collapsed.height).toBeLessThan(expanded.height);
  expect(collapsed.height).toBeLessThanOrEqual(initial.height + 2);
});

test("Annotation Hands cancels an empty draft and submits a comment once", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  await canvas.click();
  await page.getByLabel("Annotation instruction").press("Escape");
  expect((await structured(page)).annotations).toHaveLength(0);

  await canvas.click();
  await page.getByLabel("Annotation instruction").fill("키캡 색을 더 진하게 해 주세요.");
  expect((await structured(page)).annotations[0].body.instruction).toBe("");
  await page.getByLabel("Annotation instruction").press("Control+Enter");
  expect((await structured(page)).annotations[0].body.instruction).toBe("키캡 색을 더 진하게 해 주세요.");
  await expect(page.getByRole("region", { name: "Request 1 comment" })).toBeHidden();
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
  await expect(page.getByRole("link", { name: "Download JSON" })).toHaveAttribute("download", "annotation-request.json");

  await page.getByRole("tab", { name: "Image" }).click();
  const output = page.getByTestId("annotation-image-output");
  await expect(output).toBeVisible();
  await expect(output).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(page.getByRole("link", { name: "Download PNG" })).toHaveAttribute("download", "annotation-request.png");
});

test("Annotation Hands draws an irregular revision region with a linked comment", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  const box = await requiredBox(canvas);

  await page.getByRole("button", { name: "Draw" }).click();
  await drawPath(page, [
    { x: box.x + box.width * 0.28, y: box.y + box.height * 0.56 },
    { x: box.x + box.width * 0.35, y: box.y + box.height * 0.48 },
    { x: box.x + box.width * 0.45, y: box.y + box.height * 0.53 },
    { x: box.x + box.width * 0.39, y: box.y + box.height * 0.64 },
  ]);

  const state = await structured(page);
  expect(state.annotations[0].mark.type).toBe("draw");
  expect(state.annotations[0].mark.points.length).toBeGreaterThan(3);
  await expect(page.getByRole("region", { name: "Request 1 comment" })).toBeVisible();
  await page.getByLabel("Annotation instruction").fill("목도리 윤곽을 더 부드럽게 정리해 주세요.");
  expect((await structured(page)).annotations[0].body.instruction).toBe("");
  await page.getByRole("button", { name: "Send comment" }).click();
  await expect(page.getByRole("button", { name: /1 목도리 윤곽을/ })).toBeVisible();
});

test("Annotation Hands zooms the raster stage for precise markup", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  const before = await requiredBox(canvas);

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByText("125%", { exact: true })).toBeVisible();
  const after = await requiredBox(canvas);
  expect(after.width).toBeGreaterThan(before.width);

  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
});

test("Annotation Hands switches professional tools with keyboard shortcuts", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  await canvas.focus();

  await canvas.press("d");
  await expect(page.getByRole("button", { name: "Draw" })).toHaveAttribute("aria-pressed", "true");
  await canvas.press("a");
  await expect(page.getByRole("button", { name: "Arrow" })).toHaveAttribute("aria-pressed", "true");
  await canvas.press("c");
  await expect(page.getByRole("button", { name: "Comment" })).toHaveAttribute("aria-pressed", "true");
  await canvas.press("Escape");
  await expect(page.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "true");
});

test("Annotation Hands replaces the single raster source and clears stale annotations", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  await canvas.click({ position: { x: 240, y: 180 } });
  expect((await structured(page)).annotations).toHaveLength(1);

  await page.getByLabel("Replace image").setInputFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  });

  const state = await structured(page);
  expect(state.source.id).toContain("pixel.png");
  expect(state.source).toMatchObject({ width: 1, height: 1 });
  expect(state.source.src).toBe("pixel.png");
  expect(state.annotations).toHaveLength(0);
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

async function drawPath(page: Page, points: ReadonlyArray<{ x: number; y: number }>) {
  const first = points[0];
  if (first === undefined) throw new Error("Expected a path start");
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 3 });
  await page.mouse.up();
}
