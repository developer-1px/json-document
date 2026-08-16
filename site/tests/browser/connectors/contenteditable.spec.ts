import { expect, test } from "@playwright/test";

test("Contenteditable Connector commits a local string through the mounted React component", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });

  await page.goto("/adapters/contenteditable");
  await expect(page.getByRole("heading", { level: 1, name: "Contenteditable Adapter" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Native editing surface" })).toBeVisible();
  await expect(page.getByText('contenteditable="true"')).toBeVisible();

  const title = page.getByRole("textbox", { name: "Title" });
  const note = page.getByRole("textbox", { name: "Note" });
  await expect(title).toHaveAttribute("contenteditable", "true");
  await expect(title).toContainText("Add a second line");
  await expect(note).toContainText("It stays unchanged.");

  await title.click();
  await title.fill("Leased title\nwith a visible second line");

  const documentJson = page.getByTestId("contenteditable-document-json");
  await expect(documentJson).toContainText("Leased title");
  await expect(documentJson).toContainText("with a visible second line");
  await expect(note).toHaveText("This note is independent.\nIt stays unchanged.");
  expect(errors).toEqual([]);
});
