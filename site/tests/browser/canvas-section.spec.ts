import { expect, test } from "@playwright/test";

test("sections rename, move their contents, duplicate and undo as one composition", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("json-document.canvas.v1", JSON.stringify({ profile: "canvas/1", width: 1280, height: 720, objects: [
    { id: "section", kind: "section", x: 150, y: 180, width: 500, height: 300, label: "초안", color: "#f4f3f0" },
    { id: "child", kind: "rectangle", parentId: "section", x: 200, y: 240, width: 160, height: 90, label: "내용", color: "#f0d9a0" },
  ] })));
  await page.goto("/applications/canvas");
  const section = page.locator('[data-canvas-object="section"]');
  const child = page.locator('[data-canvas-object="child"]');
  await expect(page.locator('[data-canvas-section="section"]')).toBeVisible();
  await section.dblclick({ position: { x: 60, y: 12 } });
  const title = page.getByRole("textbox", { name: "Canvas text", exact: true });
  await title.fill("리서치"); await title.press("ControlOrMeta+Enter");
  await expect(section).toHaveAttribute("aria-label", "리서치");
  const before = Number(await child.getAttribute("x"));
  const sectionBefore = Number(await section.getAttribute("x"));
  const box = (await section.boundingBox())!;
  await page.mouse.move(box.x + 60, box.y + 12); await page.mouse.down();
  await page.mouse.move(box.x + 140, box.y + 52, { steps: 4 }); await page.mouse.up();
  await expect.poll(async () => Number(await child.getAttribute("x"))).toBeGreaterThan(before);
  expect(Number(await child.getAttribute("x")) - before).toBeCloseTo(Number(await section.getAttribute("x")) - sectionBefore);
  await page.getByRole("button", { name: "실행 취소", exact: true }).click();
  await expect(child).toHaveAttribute("x", String(before));
  await page.getByRole("button", { name: "복제", exact: true }).click();
  await expect(page.locator("[data-canvas-section]")).toHaveCount(2);
  await expect(page.locator("[data-canvas-object]")).toHaveCount(4);
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(page.locator("[data-canvas-object]")).toHaveCount(2);
  await page.getByRole("button", { name: "실행 취소", exact: true }).click();
  await expect(page.locator("[data-canvas-object]")).toHaveCount(4);
});

test("section tool creates a named region from a drag", async ({ page }) => {
  await page.goto("/applications/canvas");
  await page.getByRole("button", { name: "섹션", exact: true }).click();
  await page.mouse.move(180, 220); await page.mouse.down();
  await page.mouse.move(520, 450); await page.mouse.up();
  await expect(page.locator("[data-canvas-section]")).toHaveCount(1);
  await expect(page.locator('[data-kind="section"]')).toHaveAttribute("aria-label", "섹션");
});
