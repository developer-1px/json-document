import { expect, test, type Locator, type Page } from "@playwright/test";

test("Like and Dislike place reaction stickers without opening a comment composer", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  await page.getByRole("button", { name: "Like", exact: true }).click();
  await canvas.click({ position: { x: 240, y: 220 } });
  await expect(page.getByLabel("Like sticker")).toBeVisible();
  await expect(page.getByLabel("Annotation instruction")).toBeHidden();
  await page.getByRole("button", { name: "Dislike", exact: true }).click();
  await canvas.click({ position: { x: 420, y: 280 } });
  await expect(page.getByLabel("Dislike sticker")).toBeVisible();
  expect((await structured(page)).annotations.map((item: any) => item.presentation)).toEqual([
    { type: "reaction", reaction: "like" },
    { type: "reaction", reaction: "dislike" },
  ]);
});

test("click opens comment editing while drag keeps the composer hidden", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  await canvas.click({ position: { x: 300, y: 260 } });
  const instruction = page.getByLabel("Annotation instruction");
  await instruction.fill("위치를 확인해 주세요.");
  await page.getByRole("button", { name: "Send comment" }).click();
  const marker = page.locator("[data-annotation-id]").first();

  await marker.hover();
  const previewBox = await requiredBox(page.getByRole("tooltip", { name: "Comment 1 preview" }));
  await marker.click();
  await expect(instruction).toBeFocused();
  const composer = page.getByRole("region", { name: "Request 1 comment" });
  const clickedMarkerBox = await requiredBox(marker);
  const composerBox = await requiredBox(composer);
  expect(Math.abs(composerBox.x - previewBox.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(composerBox.y - previewBox.y)).toBeLessThanOrEqual(4);
  expect(composerBox.x).toBeGreaterThan(clickedMarkerBox.x + clickedMarkerBox.width / 2);
  const markerCenterY = clickedMarkerBox.y + clickedMarkerBox.height / 2;
  const composerCenterY = composerBox.y + composerBox.height / 2;
  expect(Math.abs(composerCenterY - markerCenterY)).toBeLessThanOrEqual(4);
  await expect(composer.locator("[data-comment-tail]")).toHaveCount(0);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  const markerBox = await requiredBox(marker);
  await page.mouse.move(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(markerBox.x + markerBox.width / 2 + 80, markerBox.y + markerBox.height / 2 + 40, { steps: 4 });
  await expect(instruction).toBeHidden();
  await expect(page.getByRole("tooltip", { name: "Comment 1 preview" })).toBeHidden();
  await page.mouse.up();
  await expect(instruction).toBeHidden();
});

test("Comment creates point and region marks with one editable comment", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  const box = await requiredBox(canvas);
  await canvas.click({ position: { x: box.width * 0.3, y: box.height * 0.4 } });
  const instruction = page.getByLabel("Annotation instruction");
  await expect(instruction).toBeFocused();
  await expect(page.getByRole("button", { name: "Select", exact: true })).toHaveAttribute("aria-pressed", "true");
  await instruction.fill("목줄을 파란색으로 바꿔 주세요.");
  await page.getByRole("heading", { name: "Annotation Hands Demo" }).click();
  await expect(page.getByRole("region", { name: "Request 1 comment" })).toBeVisible();
  await expect(instruction).toHaveValue("목줄을 파란색으로 바꿔 주세요.");
  expect((await structured(page)).annotations[0].body.instruction).toContain("파란색");
  await instruction.fill("목줄을 짙은 파란색으로 바꿔 주세요.");
  await instruction.press("Shift+Enter");
  await instruction.type("채도는 낮게 유지해 주세요.");
  await expect(instruction).toHaveValue("목줄을 짙은 파란색으로 바꿔 주세요.\n채도는 낮게 유지해 주세요.");
  await instruction.press("Enter");
  expect((await structured(page)).annotations[0].body.instruction).toContain("채도는 낮게");
  await expect(page.getByRole("region", { name: "Request 1 comment" })).toBeHidden();
  await expect(page.locator("[data-annotation-id]").first()).toHaveAttribute("data-selected", "true");
  await page.locator("[data-annotation-id]").first().click();
  await expect(page.getByLabel("Annotation instruction")).toBeFocused();

  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await drag(page, box.x + box.width * 0.45, box.y + box.height * 0.25, box.x + box.width * 0.7, box.y + box.height * 0.55);
  await expect(page.getByLabel("Annotation instruction")).toBeFocused();
  await expect(page.getByRole("button", { name: "Select", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect((await structured(page)).annotations.map((item: any) => item.presentation.type)).toEqual(["marker", "outline"]);
});

test("Draw and Arrow reuse the same selection and comment flow", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  const box = await requiredBox(canvas);
  await page.getByRole("button", { name: "Draw" }).click();
  await drawPath(page, [
    { x: box.x + 200, y: box.y + 300 },
    { x: box.x + 280, y: box.y + 250 },
    { x: box.x + 360, y: box.y + 320 },
  ]);
  await expect(page.getByLabel("Resize drawing")).toBeVisible();

  await page.getByRole("button", { name: "Arrow" }).click();
  const arrowBox = await requiredBox(canvas);
  await drag(page, arrowBox.x + arrowBox.width * 0.65, arrowBox.y + arrowBox.height * 0.65, arrowBox.x + arrowBox.width * 0.8, arrowBox.y + arrowBox.height * 0.4);
  expect((await structured(page)).annotations.map((item: any) => item.presentation.type)).toEqual(["stroke", "arrow"]);
});

test("Select moves and resizes a region", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  const box = await requiredBox(canvas);
  await drag(page, box.x + 350, box.y + 220, box.x + 620, box.y + 440);
  const before = (await structured(page)).annotations[0].target.selector;
  await page.getByRole("button", { name: "Select" }).click();
  const annotation = page.locator("[data-annotation-id]").first();
  const annotationBox = await requiredBox(annotation);
  await drag(page, annotationBox.x + 20, annotationBox.y + 20, annotationBox.x + 70, annotationBox.y + 45);
  const moved = (await structured(page)).annotations[0].target.selector;
  expect(moved.x).toBeGreaterThan(before.x);
  const handle = page.getByLabel("Resize rectangle");
  const handleBox = await requiredBox(handle);
  await drag(page, handleBox.x + 5, handleBox.y + 5, handleBox.x + 55, handleBox.y + 45);
  const resized = (await structured(page)).annotations[0].target.selector;
  expect(resized.width).toBeGreaterThan(moved.width);
});

test("pointer cancel and lost capture discard transient movement", async ({ page }) => {
  await page.goto("/demo/annotation");
  const canvas = page.getByLabel("Raster annotation canvas");
  const box = await requiredBox(canvas);
  await drag(page, box.x + 350, box.y + 220, box.x + 620, box.y + 440);
  await page.getByRole("button", { name: "Select" }).click();
  const annotation = page.locator("[data-annotation-id]").first();
  const before = (await structured(page)).annotations[0].target.selector;

  for (const reason of ["pointercancel", "lostpointercapture"] as const) {
    const annotationBox = await requiredBox(annotation);
    await page.mouse.move(annotationBox.x + 20, annotationBox.y + 20);
    await page.mouse.down();
    await page.mouse.move(annotationBox.x + 90, annotationBox.y + 60, { steps: 4 });
    expect((await structured(page)).annotations[0].target.selector).toEqual(before);
    if (reason === "pointercancel") {
      await canvas.dispatchEvent("pointercancel", { pointerId: 1, bubbles: true });
    } else {
      await annotation.evaluate((element) => {
        const owner = [element, ...element.querySelectorAll("*")].find((candidate) => candidate.hasPointerCapture(1));
        owner?.releasePointerCapture(1);
      });
    }
    await page.mouse.up();
    expect((await structured(page)).annotations[0].target.selector).toEqual(before);
  }
});

test("Download rasterizes the current annotations into a PNG", async ({ page }) => {
  await page.goto("/demo/annotation");
  await page.getByLabel("Raster annotation canvas").click({ position: { x: 300, y: 260 } });
  await page.getByLabel("Annotation instruction").fill("색상을 수정해 주세요.");
  await page.getByRole("button", { name: "Send comment" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download annotated image" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("annotation-request.png");
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
  await page.mouse.move(toX, toY, { steps: 6 });
  await page.mouse.up();
}
async function drawPath(page: Page, points: ReadonlyArray<{ x: number; y: number }>) {
  const first = points[0];
  if (first === undefined) throw new Error("Expected a path start");
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 4 });
  await page.mouse.up();
}

test("review Usage collapses completed work while retaining its conversation", async ({ page }) => {
  await page.addInitScript(() => {
    class SpeechMock {
      onresult: any; onend: any;
      constructor() { (window as any).speechMock = this; }
      start() {} stop() { this.onend?.(); } abort() {}
    }
    (window as any).SpeechRecognition = SpeechMock;
  });
  await page.goto("/demo/annotation");
  await page.getByRole("button", { name: "에이전트 첨삭 Usage", exact: true }).click();
  const review = page.getByRole("region", { name: "첨삭 예제", exact: true });
  await review.getByRole("application").click({ position: { x: 120, y: 100 } });
  await page.getByRole("button", { name: "음성 첨삭 시작", exact: true }).click();
  await page.evaluate(() => (window as any).speechMock.onresult({ results: [{ isFinal: true, 0: { transcript: "제목을 바꿔줘" } }] }));
  await expect(review.frameLocator("iframe").locator("h1")).toHaveText("음성 첨삭이 반영된 문장입니다.");
  await review.getByRole("button", { name: "확인 완료", exact: true }).click();
  await expect(review.getByRole("application")).toBeVisible();
  await expect(review.getByText("완료 기록 1", { exact: true })).toBeVisible();
  await expect(review.getByLabel("내 요청", { exact: true })).toHaveCount(0);
  await review.getByText("완료 기록 1", { exact: true }).click();
  await review.locator(".annotation-following-history").getByRole("button", { name: /제목을 바꿔줘/ }).click();
  await expect(review.getByLabel("내 요청", { exact: true })).toHaveText("제목을 바꿔줘");
});

test("review Usage consumes the located speech bubble and canonical Popover", async ({ page }) => {
  await page.addInitScript(() => {
    class SpeechMock {
      onresult: any; onend: any;
      constructor() { (window as any).speechMock = this; }
      start() {} stop() { this.onend?.(); } abort() {}
    }
    (window as any).SpeechRecognition = SpeechMock;
  });
  await page.goto("/demo/annotation");
  await page.getByRole("button", { name: "에이전트 첨삭 Usage", exact: true }).click();
  await page.getByRole("application", { name: "첨삭 예제 표시" }).click({ position: { x: 80, y: 80 } });
  await page.getByRole("button", { name: "음성 첨삭 시작", exact: true }).click();
  await page.evaluate(() => (window as any).speechMock.onresult({ results: [{ isFinal: false, 0: { transcript: "제목을" } }] }));
  await expect(page.getByLabel("말하는 중인 내 요청", { exact: true })).toHaveText("제목을");
  await expect(page.getByRole("dialog", { name: "말하는 중인 첨삭", exact: true })).toBeVisible();
  await page.evaluate(() => (window as any).speechMock.onresult({ results: [{ isFinal: true, 0: { transcript: "제목을 바꿔줘" } }] }));
  await expect(page.frameLocator("iframe").locator("h1")).toHaveText("음성 첨삭이 반영된 문장입니다.");
  const marker = page.getByRole("button", { name: "1 · 수정됨", exact: true });
  await expect(marker).toBeVisible();
  const close = page.getByRole("button", { name: "첨삭 접기", exact: true });
  await close.focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "1 · 수정됨", exact: true })).toHaveCount(0);
  await expect(marker).toBeFocused();
  await marker.click();
  await expect(page.getByLabel("내 요청", { exact: true })).toHaveText("제목을 바꿔줘");
});
