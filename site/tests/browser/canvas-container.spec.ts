import { expect, test } from "@playwright/test";

test("overlapping box owns content, moves it once, and reflows growing text", async ({ page }) => {
  await page.goto("/demo/canvas");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await page.getByRole("textbox", { name: "Canvas JSON document" }).fill(JSON.stringify({ profile: "canvas/1", width: 1280, height: 720, objects: [
    { id: "title", kind: "text", x: 140, y: 200, width: 240, height: 20, label: "제목", color: "black", fontSize: 24 },
    { id: "body", kind: "text", x: 140, y: 260, width: 240, height: 20, label: "본문", color: "black", fontSize: 24 },
    { id: "box", kind: "rectangle", x: 100, y: 160, width: 360, height: 220, label: "", color: "#eeeeee" },
  ] }));
  await page.getByRole("button", { name: "JSON 열기", exact: true }).click();
  const title = page.locator('[data-canvas-object="title"]');
  const body = page.locator('[data-canvas-object="body"]');
  const box = page.locator('[data-canvas-object="box"]');
  await expect(title).toHaveAttribute("data-container-id", "box");
  await expect(body).toHaveAttribute("data-container-id", "box");
  const first = page.locator("[data-canvas-object]").first();
  await expect(first).toHaveAttribute("data-canvas-object", "box");
  const boxBounds = (await box.boundingBox())!;
  const start = { x: boxBounds.x + 10, y: boxBounds.y + 10 };
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(start.x + 80, start.y + 30);
  const previewX = Number(await title.getAttribute("x"));
  expect(previewX).toBeGreaterThan(140);
  await page.mouse.up();
  expect(Number(await title.getAttribute("x"))).toBeCloseTo(previewX, 3);
  expect(Number(await title.getAttribute("x")) - Number(await box.getAttribute("x"))).toBeCloseTo(40, 3);
  await title.dblclick();
  const input = page.getByRole("textbox", { name: "Canvas text", exact: true });
  const oldBodyY = Number(await body.getAttribute("y"));
  const oldBoxHeight = Number(await box.getAttribute("height"));
  await input.fill("길어진 제목\n두 번째 줄\n세 번째 줄\n네 번째 줄");
  expect(Number(await body.getAttribute("y"))).toBeGreaterThan(oldBodyY);
  await input.press("ControlOrMeta+Enter");
  expect(Number(await box.getAttribute("height"))).toBeGreaterThan(oldBoxHeight);
  await page.getByRole("button", { name: "실행 취소", exact: true }).click();
  await expect(title).toHaveAttribute("aria-label", "제목");
  await expect(body).toHaveAttribute("y", String(oldBodyY));
  const current = (await box.boundingBox())!;
  await page.mouse.click(current.x + current.width - 12, current.y + current.height - 12);
  await expect(page.getByRole("button", { name: "세로 배치", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "가로 배치", exact: true }).click();
  expect(Number(await body.getAttribute("y"))).toBe(Number(await title.getAttribute("y")));
  expect(Number(await body.getAttribute("x"))).toBeGreaterThan(Number(await title.getAttribute("x")));
  await page.reload();
  await expect(title).toHaveAttribute("data-container-id", "box");
  await expect(body).toHaveAttribute("data-container-id", "box");
  const copyStart = (await box.boundingBox())!;
  await page.keyboard.down("Alt");
  await page.mouse.move(copyStart.x + 10, copyStart.y + 10); await page.mouse.down();
  await page.mouse.move(copyStart.x + 90, copyStart.y + 40);
  await expect(page.locator("[data-canvas-copy-preview] [data-canvas-text-box]")).toHaveCount(3);
  await expect(page.locator("[data-canvas-copy-preview]")).toContainText("제목");
  await expect(page.locator("[data-canvas-copy-preview]")).toContainText("본문");
  await page.mouse.up(); await page.keyboard.up("Alt");
  await expect(page.locator("[data-canvas-object]")).toHaveCount(6);
  await page.getByRole("button", { name: "실행 취소", exact: true }).click();
  await expect(page.locator("[data-canvas-object]")).toHaveCount(3);
});
