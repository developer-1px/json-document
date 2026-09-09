import { expect, test, type Page } from "@playwright/test";

for (const route of ["/demo/canvas", "/widgets/canvas"]) {
  test(`${route} uses shared icon toolbar and hover/focus tooltips`, async ({ page }) => {
    await page.goto(route);
    const toolbar = page.getByRole("toolbar", { name: "Canvas tools" });
    const buttons = toolbar.getByRole("button");
    await expect(buttons).toHaveCount(9);
    for (const button of await buttons.all()) {
      await expect(button).toHaveAttribute("data-ui-presentation", "icon");
      await expect(button.locator('svg[aria-hidden="true"]')).toHaveCount(1);
      await expect(button).toHaveCSS("border-top-width", "0px");
      const box = await button.boundingBox();
      expect(box?.width).toBe(32); expect(box?.height).toBe(32);
    }
    const draw = toolbar.getByRole("button", { name: "그리기", exact: true });
    const tooltip = toolbar.getByRole("tooltip", { name: "그리기", exact: true });
    await expect(tooltip).toBeHidden();
    await draw.hover(); await expect(tooltip).toBeVisible();
    await page.mouse.move(0, 0); await expect(tooltip).toBeHidden();
    await draw.focus(); await expect(tooltip).toBeVisible();
    await expect(draw).not.toHaveCSS("box-shadow", "none");
    await draw.press("Enter"); await expect(draw).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-canvas-slide]")).toHaveAttribute("data-tool", "path");
  });
}

async function point(page: Page, x: number, y: number) {
  const box = await page.locator("[data-canvas-slide]").boundingBox();
  if (!box) throw new Error("Missing Canvas slide");
  return { x: box.x + x * box.width / 1280, y: box.y + y * box.height / 720 };
}

async function create(page: Page, tool: string, from: [number, number], to: [number, number]) {
  await page.getByRole("button", { name: tool, exact: true }).click();
  const a = await point(page, ...from), b = await point(page, ...to);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
}

test("Canvas composes one slide and reopens the same JSON through the canonical Hand", async ({ page }) => {
  await page.goto("/demo/canvas");
  await expect(page.locator("[data-canvas-object]")).toHaveCount(0);
  await create(page, "사각형", [100, 280], [440, 480]);
  await create(page, "타원", [600, 280], [820, 480]);
  await create(page, "글자", [100, 80], [920, 200]);
  const text = page.getByRole("textbox", { name: "Canvas text", exact: true });
  await text.fill("One slide\n글자·도형·그리기");
  await text.press("ControlOrMeta+Enter");
  await create(page, "그리기", [100, 560], [700, 620]);
  await expect(page.locator("[data-canvas-object]")).toHaveCount(4);
  await expect(page.locator("[data-canvas-slide]")).toHaveAttribute("data-tool", "select");

  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const json = page.getByRole("textbox", { name: "Canvas JSON document" });
  const saved = await json.inputValue();
  expect(JSON.parse(saved).objects.map((object: { kind: string }) => object.kind)).toEqual(["rectangle", "ellipse", "text", "path"]);
  await json.fill('{"profile":"canvas/1","width":1280,"height":720,"objects":[]}');
  await page.getByRole("button", { name: "JSON 열기" }).click();
  await expect(page.locator("[data-canvas-object]")).toHaveCount(0);
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await json.fill(saved);
  await page.getByRole("button", { name: "JSON 열기" }).click();
  await expect(page.locator("[data-canvas-object]")).toHaveCount(4);
  await page.getByRole("button", { name: "실행 취소" }).click();
  await expect(page.locator("[data-canvas-object]")).toHaveCount(0);
  await page.getByRole("button", { name: "다시 실행" }).click();
  await expect(page.locator("[data-canvas-object]")).toHaveCount(4);
});

test("Canvas move and resize are single history steps and Escape cancels a gesture", async ({ page }) => {
  await page.goto("/demo/canvas");
  await create(page, "사각형", [100, 100], [300, 200]);
  const object = page.locator("[data-canvas-object]");
  const a = await point(page, 150, 150), b = await point(page, 220, 190);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.keyboard.press("Escape"); await page.mouse.up();
  await expect(object).toHaveAttribute("x", "100");
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y); await page.mouse.up();
  expect(Number(await object.getAttribute("x"))).toBeCloseTo(170);
  const handle = page.locator('[data-resize-edge="se"]');
  const box = await handle.boundingBox(); if (!box) throw new Error("Missing resize handle");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30); await page.mouse.up();
  expect(Number(await object.getAttribute("width"))).toBeGreaterThan(200);
  await page.getByRole("button", { name: "실행 취소" }).click();
  expect(Number(await object.getAttribute("width"))).toBeCloseTo(200);
  expect(Number(await object.getAttribute("x"))).toBeCloseTo(170);
  await page.getByRole("button", { name: "실행 취소" }).click();
  expect(Number(await object.getAttribute("x"))).toBeCloseTo(100);
});
