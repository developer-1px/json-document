import { expect, test, type Page } from "@playwright/test";

test("minimal document demo completes selection, clipboard, edit, move, undo, and redo", async ({ page }) => {
  await page.goto("/demo");
  await page.getByText("Inspect editing state", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Document Demo" })).toBeVisible();

  const surface = page.getByRole("region", { name: "Editable document" }).locator('[tabindex="0"]');
  await surface.focus();
  await surface.press("ArrowDown");
  await expect(page.locator('article[data-block-id="select"]')).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: "Select block 1" }).click();
  await page.getByRole("button", { name: "Select block 2" }).click({ modifiers: ["Meta"] });
  await expect(page.getByText("2 selected", { exact: false })).toBeVisible();
  await page.getByLabel("Document actions").getByRole("button", { name: "Copy", exact: true }).click();

  await page.getByRole("button", { name: "Select block 4" }).click();
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  await expect(page.locator("article[data-selected=true]")).toHaveCount(2);
  await expect(page.getByRole("textbox", { name: "Block 6 text" })).toHaveValue(/Shift-click/);

  await page.getByRole("textbox", { name: "Block 5 text" }).fill("한글 편집도 같은 transaction을 사용합니다.");
  await page.getByRole("button", { name: "Select block 5" }).click();
  await page.getByRole("button", { name: "Select block 6" }).click({ modifiers: ["Meta"] });
  await page.getByRole("button", { name: "Move up" }).click();

  const moved = await canonicalDocument(page);
  expect(moved.blocks.map((block) => block.id)).toEqual(["welcome", "select", "clipboard", "block-1", "block-2", "json"]);

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(4);

  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  const redone = await canonicalDocument(page);
  expect(redone.blocks.find((block) => block.id === "block-1")?.text).toBe("한글 편집도 같은 transaction을 사용합니다.");
  await expect(page.locator("article[data-selected=true]")).toHaveCount(2);
});

test("Document demo composes native clipboard events with Web Platform Connector cut history", async ({ page }) => {
  await page.goto("/demo");
  await page.getByText("Inspect editing state", { exact: true }).click();
  await page.getByRole("button", { name: "Select block 1" }).click();

  const clipboard = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>('[aria-label="Editable document"] [tabindex="0"]')!;
    const data = new DataTransfer();
    const copied = surface.dispatchEvent(new ClipboardEvent("copy", { clipboardData: data, bubbles: true, cancelable: true }));
    const cut = surface.dispatchEvent(new ClipboardEvent("cut", { clipboardData: data, bubbles: true, cancelable: true }));
    const pasted = surface.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    return {
      copiedDefaultAllowed: copied,
      cutDefaultAllowed: cut,
      pastedDefaultAllowed: pasted,
      types: [...data.types],
      text: data.getData("text/plain"),
    };
  });

  expect(clipboard).toMatchObject({
    copiedDefaultAllowed: false,
    cutDefaultAllowed: false,
    pastedDefaultAllowed: false,
    text: "A minimal document that still behaves like an editor.",
  });
  expect(clipboard.types).toContain("application/vnd.interactive-os.blocks+json");
  expect((await canonicalDocument(page)).blocks.map((block) => block.text)).toEqual([
    "Shift-click for a range. Mod-click for multiple blocks.",
    "A minimal document that still behaves like an editor.",
    "Copy, cut, paste, move, duplicate, undo, and redo all preserve selection.",
    "Every interaction commits to the canonical JSON shown beside the document.",
  ]);
  await expect(page.getByText("Pasted 1 structured block", { exact: true })).toBeVisible();
});

async function canonicalDocument(page: Page): Promise<{ blocks: Array<{ id: string; text: string }> }> {
  return JSON.parse(await page.getByTestId("canonical-json").innerText()) as { blocks: Array<{ id: string; text: string }> };
}
