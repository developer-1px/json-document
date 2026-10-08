import { expect, test } from "@playwright/test";

test("text auto width, fixed wrapping, content height and local restoration", async ({ page }) => {
  await page.goto("/demo/canvas");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await page.getByRole("textbox", { name: "Canvas JSON document" }).fill(JSON.stringify({ profile: "canvas/1", width: 1280, height: 720, objects: [
    { id: "text", kind: "text", label: "가로 길이를 바꾸면 줄바꿈하고 세로는 글을 따라갑니다", fontSize: 24, color: "black", x: 100, y: 180, width: 160, height: 1 },
  ] }));
  await page.getByRole("button", { name: "JSON 열기", exact: true }).click();
  const object = page.locator('[data-canvas-object="text"]');
  await object.click();
  const fixedHeight = Number(await object.getAttribute("height"));
  expect(fixedHeight).toBeGreaterThan(24 * 1.2);
  const edge = page.locator('[data-resize-edge="e"]');
  await edge.dblclick();
  const autoWidth = Number(await object.getAttribute("width"));
  expect(autoWidth).toBeGreaterThan(160);
  expect(Number(await object.getAttribute("height"))).toBeLessThan(fixedHeight);
  await page.getByRole("button", { name: "실행 취소", exact: true }).click();
  await expect(object).toHaveAttribute("width", "160");
  await expect(object).toHaveAttribute("height", String(fixedHeight));
  await page.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(object).toHaveAttribute("width", String(autoWidth));
  const edgeBox = (await edge.boundingBox())!;
  await page.mouse.move(edgeBox.x + edgeBox.width / 2, edgeBox.y + edgeBox.height / 2);
  await page.mouse.down(); await page.mouse.move(edgeBox.x - 200, edgeBox.y + edgeBox.height / 2); await page.mouse.up();
  expect(Number(await object.getAttribute("width"))).toBeLessThan(autoWidth);
  await object.dblclick();
  const input = page.getByRole("textbox", { name: "Canvas text", exact: true });
  const beforeHeight = Number(await object.getAttribute("height"));
  await input.fill("여러 줄 텍스트\n둘째 줄\n셋째 줄\n넷째 줄\n");
  expect(Number(await object.getAttribute("height"))).toBeGreaterThan(beforeHeight);
  await input.press("ControlOrMeta+Enter");
  const finalHeight = await object.getAttribute("height");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const saved = JSON.parse(await page.getByRole("textbox", { name: "Canvas JSON document" }).inputValue());
  expect(saved.objects[0].widthMode).toBe("fixed");
  expect(saved.objects[0].height).toBe(Number(finalHeight));
  await page.reload();
  await expect(object).toHaveAttribute("height", finalHeight!);
  await expect(object).toHaveAttribute("aria-label", "여러 줄 텍스트\n둘째 줄\n셋째 줄\n넷째 줄\n");
});
