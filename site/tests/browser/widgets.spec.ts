import { expect, test, type Page } from "@playwright/test";

test("Board modifier click toggles cards and drag moves a card", async ({ page }) => {
  await page.goto("/widgets/board");
  await page.getByRole("option", { name: "Write the brief" }).click();
  await page.keyboard.down("ControlOrMeta");
  await page.getByRole("option", { name: "Review copy" }).click();
  await page.keyboard.up("ControlOrMeta");
  expect(await json(page, "widget-board-selected")).toEqual(["write", "review"]);

  await page.getByRole("option", { name: "Write the brief" }).dragTo(page.getByRole("listbox", { name: "Done" }));
  expect(await json(page, "widget-board-columns")).toEqual([
    { id: "todo", cardIds: ["review"] },
    { id: "doing", cardIds: ["draw"] },
    { id: "done", cardIds: ["write"] },
  ]);

  await page.getByRole("option", { name: "Draw the board" }).dragTo(
    page.getByRole("option", { name: "Review copy" }),
  );
  expect(await json(page, "widget-board-columns")).toEqual([
    { id: "todo", cardIds: ["draw", "review"] },
    { id: "doing", cardIds: [] },
    { id: "done", cardIds: ["write"] },
  ]);
});

async function json(page: Page, testId: string): Promise<unknown> {
  return JSON.parse(await page.getByTestId(testId).innerText());
}
