import { expect, test, type Page } from "@playwright/test";

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

// The application workspace maps screen pixels through its own viewBox, so app flows drive the mouse in screen space.
async function draw(page: Page, tool: string, from: [number, number], to: [number, number]) {
  await page.getByRole("toolbar", { name: "Canvas tools" }).getByRole("button", { name: tool, exact: true }).click();
  await page.mouse.move(...from); await page.mouse.down();
  await page.mouse.move(...to, { steps: 8 }); await page.mouse.up();
}

test("Canvas Application composes shapes, text and drawing with one history and restores them after reload", async ({ page }) => {
  await page.goto("/applications/canvas");
  const objects = page.locator("[data-canvas-object]");
  await expect(page.locator("[data-canvas-slide]")).toBeVisible();
  await expect(objects).toHaveCount(0);
  await draw(page, "사각형", [200, 300], [360, 400]);
  await draw(page, "타원", [420, 300], [560, 400]);
  await draw(page, "글자", [200, 160], [560, 220]);
  const text = page.getByRole("textbox", { name: "Canvas text", exact: true });
  await text.fill("One slide\n글자·도형·그리기");
  await text.press("ControlOrMeta+Enter");
  await draw(page, "그리기", [200, 480], [560, 520]);
  await expect(objects).toHaveCount(4);
  await expect(page.locator("[data-canvas-slide]")).toHaveAttribute("data-tool", "select");
  await expect(page.locator('[data-kind="text"]')).toHaveAttribute("aria-label", "One slide\n글자·도형·그리기");
  const undo = page.getByRole("button", { name: "실행 취소", exact: true });
  await undo.click();
  await expect(objects).toHaveCount(3);
  await page.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(objects).toHaveCount(4);
  await page.reload();
  await expect(objects).toHaveCount(4);
  await expect(page.locator('[data-kind="text"]')).toHaveAttribute("aria-label", "One slide\n글자·도형·그리기");
});

test("Canvas Alt-copy, nudge, duplicate and native selected clipboard share atomic Editing", async ({ page }) => {
  await page.goto("/widgets/canvas");
  await page.locator('[data-canvas-object="rectangle"]').click();
  await page.locator('[data-canvas-object="ellipse"]').click({ modifiers: ["Shift"] });
  const start = await point(page, 200, 350), end = await point(page, 300, 390);
  await page.keyboard.down("Alt"); await page.keyboard.down("Shift");
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y);
  await expect(page.locator("[data-canvas-copy-original]")).toHaveCount(2);
  await expect(page.locator("[data-canvas-object]")).toHaveCount(5);
  await page.mouse.up(); await page.keyboard.up("Alt"); await page.keyboard.up("Shift");
  await expect(page.locator("[data-canvas-object]")).toHaveCount(7);
  await expect(page.locator('[data-canvas-object="rectangle"]')).toHaveAttribute("x", "96");
  const selected = page.locator('[data-canvas-object][aria-pressed="true"]');
  expect(Number(await selected.first().getAttribute("y"))).toBeCloseTo(264);
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("Shift+ArrowDown");
  expect(Number(await selected.first().getAttribute("x"))).toBeCloseTo(197);
  expect(Number(await selected.first().getAttribute("y"))).toBeCloseTo(274);
  await page.keyboard.press("ControlOrMeta+d");
  await expect(page.locator("[data-canvas-object]")).toHaveCount(9);
  await page.keyboard.press("ControlOrMeta+c"); await page.keyboard.press("ControlOrMeta+v");
  await expect(page.locator("[data-canvas-object]")).toHaveCount(11);
  await expect(selected).toHaveCount(2);
  await page.keyboard.press("ControlOrMeta+x"); await expect(page.locator("[data-canvas-object]")).toHaveCount(9);
  await page.keyboard.press("ControlOrMeta+z"); await expect(page.locator("[data-canvas-object]")).toHaveCount(11);
  await expect(selected).toHaveCount(2);
});

test("Canvas captures real raster bytes before the native event ends and queues subsequent literal text", async ({ page }) => {
  await page.goto("/applications/canvas");
  await expect(page.locator("[data-canvas-slide]")).toBeVisible();
  const prevented = await page.evaluate(() => {
    const raster = document.createElement("canvas"); raster.width = 1600; raster.height = 800;
    const context = raster.getContext("2d")!; context.fillStyle = "#b6c8e8"; context.fillRect(0, 0, 1600, 800);
    const bytes = Uint8Array.from(atob(raster.toDataURL("image/png").split(",")[1]!), (character) => character.charCodeAt(0));
    const data = new DataTransfer(); data.items.add(new File([bytes], "clipboard.png", { type: "image/png" }));
    data.setData("text/plain", "This fallback must not become an object");
    const slide = document.querySelector("[data-canvas-slide]")!;
    const image = new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true });
    slide.dispatchEvent(image);
    data.items.clear(); // Event data is ephemeral; preparation must use its captured snapshot.
    const text = new DataTransfer(); text.setData("text/plain", "<b>한글</b>\nSecond line");
    slide.dispatchEvent(new ClipboardEvent("paste", { clipboardData: text, bubbles: true, cancelable: true }));
    return image.defaultPrevented;
  });
  expect(prevented).toBe(true);
  await expect(page.locator("[data-canvas-object]")).toHaveCount(2);
  await expect(page.locator("[data-canvas-slide]")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("[data-canvas-slide] image")).toHaveAttribute("href", /^data:image\/png;base64,/);
  await expect(page.locator("[data-canvas-slide] b")).toHaveCount(0);
  await expect(page.locator("[data-canvas-object]").nth(0)).toHaveAttribute("data-kind", "image");
  await expect(page.locator("[data-canvas-object]").nth(1)).toHaveAttribute("aria-label", "<b>한글</b>\nSecond line");
  await page.reload();
  await expect(page.locator("[data-canvas-slide] image")).toHaveAttribute("href", /^data:image\/png;base64,/);
});

test("Canvas move and resize are single history steps and Escape cancels a gesture", async ({ page }) => {
  await page.goto("/applications/canvas");
  await draw(page, "사각형", [200, 200], [400, 300]);
  const object = page.locator("[data-canvas-object]");
  const x0 = Number(await object.getAttribute("x"));
  const width0 = Number(await object.getAttribute("width"));
  await page.mouse.move(250, 250); await page.mouse.down(); await page.mouse.move(320, 290, { steps: 6 });
  await page.keyboard.press("Escape"); await page.mouse.up();
  await expect(object).toHaveAttribute("x", String(x0));
  await page.mouse.move(250, 250); await page.mouse.down(); await page.mouse.move(320, 290, { steps: 6 }); await page.mouse.up();
  await expect.poll(async () => Number(await object.getAttribute("x"))).toBeGreaterThan(x0);
  const x1 = Number(await object.getAttribute("x"));
  const handle = page.locator('[data-resize-edge="se"]');
  const box = await handle.boundingBox(); if (!box) throw new Error("Missing resize handle");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30, { steps: 4 }); await page.mouse.up();
  await expect.poll(async () => Number(await object.getAttribute("width"))).toBeGreaterThan(width0);
  const undo = page.getByRole("button", { name: "실행 취소", exact: true });
  await undo.click();
  await expect(object).toHaveAttribute("width", String(width0));
  await expect(object).toHaveAttribute("x", String(x1));
  await undo.click();
  await expect(object).toHaveAttribute("x", String(x0));
});

test("Plane Select moves a selected set with one Undo and collapses a plain click on release", async ({ page }) => {
  await page.goto("/widgets/canvas");
  const rectangle = page.locator('[data-canvas-object="rectangle"]');
  const ellipse = page.locator('[data-canvas-object="ellipse"]');
  const selected = page.locator('[data-canvas-object][aria-pressed="true"]');
  await rectangle.click(); await ellipse.click({ modifiers: ["Shift"] });
  await expect(selected).toHaveCount(2);
  const start = await point(page, 200, 350), end = await point(page, 280, 390);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  expect(Number(await rectangle.getAttribute("x"))).toBeCloseTo(176);
  expect(Number(await ellipse.getAttribute("x"))).toBeCloseTo(640);
  await page.mouse.up();
  await page.getByRole("button", { name: "실행 취소" }).click();
  expect(Number(await rectangle.getAttribute("x"))).toBeCloseTo(96);
  expect(Number(await ellipse.getAttribute("x"))).toBeCloseTo(560);
  await expect(selected).toHaveCount(2);
  await expect(page.getByRole("button", { name: "실행 취소" })).toBeDisabled();
  await rectangle.click(); await expect(selected).toHaveCount(1);
});

test("Plane Select marquee, cancellation and primary editing share the public profile", async ({ page }) => {
  await page.goto("/widgets/canvas");
  const selected = page.locator('[data-canvas-object][aria-pressed="true"]');
  const start = await point(page, 50, 230), end = await point(page, 860, 530);
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y);
  await expect(page.locator("[data-canvas-marquee]")).toHaveCount(1); await expect(selected).toHaveCount(2);
  await page.keyboard.press("Escape"); await page.mouse.up();
  await expect(page.locator("[data-canvas-marquee]")).toHaveCount(0);
  await expect(page.locator('[data-canvas-object="title"]')).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape"); await expect(selected).toHaveCount(0);
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y); await page.mouse.up();
  await expect(selected).toHaveCount(2);
  // The selection's formatting toolbar floats above it over the title, so extend with the note.
  await page.locator('[data-canvas-object="note"]').click({ modifiers: ["Shift"] });
  await expect(selected).toHaveCount(3);
  await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.press("ControlOrMeta+a");
  await expect(selected).toHaveCount(5); await expect(page.locator("[data-resize-edge]")).toHaveCount(8);
  await page.keyboard.press("F2");
  const text = page.getByRole("textbox", { name: "Canvas text", exact: true });
  await text.fill("Reusable selection"); await text.press("ControlOrMeta+Enter");
  await expect(page.locator('[data-canvas-object="note"]')).toHaveAttribute("aria-label", "Reusable selection");
  await expect(selected).toHaveCount(5);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.locator('[data-canvas-object="note"]')).toHaveAttribute("aria-label", "작은 아이디어를\n한 장에");
});
