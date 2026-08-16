import { expect, test } from "@playwright/test";

test("Clipboard adapter translates native modifiers, text input, and structured clipboard events", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });

  await page.goto("/adapters/clipboard");
  await expect(page.getByRole("heading", { level: 1, name: "Clipboard Adapter" })).toBeVisible();

  const alpha = page.locator('[data-block-id="alpha"]');
  const beta = page.locator('[data-block-id="beta"]');
  await alpha.click({ position: { x: 8, y: 8 } });
  await beta.click({ modifiers: ["Shift"], position: { x: 8, y: 8 } });
  await expect(page.locator('[data-selected="true"]')).toHaveCount(2);

  await page.getByRole("textbox", { name: "alpha text" }).fill("Native input committed");
  let value = await documentValue(page);
  expect(value.blocks[0]?.text).toBe("Native input committed");

  await alpha.click({ position: { x: 8, y: 8 } });
  const clipboard = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>('[aria-label="Clipboard adapter surface"]')!;
    const data = new DataTransfer();
    const copied = surface.dispatchEvent(new ClipboardEvent("copy", { clipboardData: data, bubbles: true, cancelable: true }));
    const pasted = surface.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    return {
      copiedDefaultAllowed: copied,
      pastedDefaultAllowed: pasted,
      types: [...data.types],
      text: data.getData("text/plain"),
    };
  });

  expect(clipboard.copiedDefaultAllowed).toBe(false);
  expect(clipboard.pastedDefaultAllowed).toBe(false);
  expect(clipboard.types).toContain("application/vnd.interactive-os.blocks+json");
  expect(clipboard.text).toBe("Native input committed");
  value = await documentValue(page);
  expect(value.blocks.map((block) => block.text)).toEqual([
    "Native input committed",
    "Native input committed",
    "Paste inserts a canonical block after the selection.",
    "Text input commits through the same editing history.",
  ]);
  await expect(page.getByTestId("clipboard-announcement")).toContainText("Pasted 1 structured block");
  expect(errors).toEqual([]);
});

type DocumentValue = { blocks: Array<{ id: string; text: string }> };

async function documentValue(page: import("@playwright/test").Page): Promise<DocumentValue> {
  return JSON.parse(await page.getByTestId("clipboard-document-json").innerText()) as DocumentValue;
}
