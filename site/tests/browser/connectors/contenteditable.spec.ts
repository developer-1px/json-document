import { expect, test } from "@playwright/test";

test("Contenteditable Connector commits a local string through the mounted React component", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });

  await page.goto("/connectors/contenteditable");
  await expect(page.getByRole("heading", { level: 1, name: "Contenteditable Connector" })).toBeVisible();

  const title = page.getByRole("textbox", { name: "Title" });
  await title.click();
  await title.fill("Leased title");

  await expect(page.getByTestId("contenteditable-document-json")).toContainText("Leased title");
  await expect(page.getByRole("textbox", { name: "Note" })).toHaveText("The note field stays independent");
  expect(errors).toEqual([]);
});
