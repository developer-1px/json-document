import { expect, test } from "@playwright/test";

test("Interaction Handles Usage shares descriptor, cursor, and lifecycle across drag, resize, and control", async ({ page }) => {
  await page.goto("/affordances/handles");

  const drag = page.getByRole("button", { name: "Move card" });
  const resize = page.getByRole("button", { name: "Resize panel" });
  const control = page.getByRole("button", { name: "Move control point" });
  await expect(drag).toHaveCSS("cursor", "grab");
  await expect(resize).toHaveCSS("cursor", "col-resize");
  await expect(control).toHaveCSS("cursor", "crosshair");

  await drag.scrollIntoViewIfNeeded();
  const dragBox = await drag.boundingBox();
  expect(dragBox).not.toBeNull();
  await page.mouse.move(dragBox!.x + dragBox!.width / 2, dragBox!.y + dragBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragBox!.x + 42, dragBox!.y + 28);
  await page.mouse.up();
  await expect(page.getByTestId("drag-handle-card")).not.toHaveCSS("transform", "none");

  await resize.scrollIntoViewIfNeeded();
  const resizePanel = page.getByTestId("resize-handle-panel");
  const widthBefore = await resizePanel.evaluate((element) => element.getBoundingClientRect().width);
  const resizeBox = await resize.boundingBox();
  expect(resizeBox).not.toBeNull();
  await page.mouse.move(resizeBox!.x + resizeBox!.width / 2, resizeBox!.y + resizeBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizeBox!.x + 36, resizeBox!.y + resizeBox!.height / 2);
  await page.mouse.up();
  await expect.poll(() => resizePanel.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(widthBefore);

  await page.getByRole("button", { name: "Inspect interaction handle state" }).click();
  await expect(page.getByTestId("interaction-handle-event-json")).toContainText('"phase": "commit"');
  await expect(page.getByTestId("interaction-handle-event-json")).toContainText('"kind": "resize"');
});
