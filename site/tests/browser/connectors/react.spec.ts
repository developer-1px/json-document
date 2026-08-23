import { expect, test } from "@playwright/test";

test("Connector catalog exposes only implemented Live Demos", async ({ page }) => {
  await page.goto("/connectors");

  await expect(page.getByRole("heading", { level: 1, name: "Connector" })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(5);
  await expect(page.getByRole("link", { name: "Open Live Demo" })).toHaveCount(5);

  const reactArticle = page.getByRole("article").filter({
    has: page.getByRole("heading", { level: 2, name: "React Live Demo", exact: true }),
  });
  await reactArticle.getByRole("link", { name: "Open Live Demo" }).click();
  await expect(page).toHaveURL(/\/connectors\/react$/);
  await expect(page.getByRole("heading", { level: 1, name: "React Connector" })).toBeVisible();
});

test("React Connector Live Demo publishes document and editing snapshots", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });

  await page.goto("/connectors/react");

  await page.getByRole("textbox", { name: "Document title" }).fill("Live React document");
  await page.getByRole("button", { name: "Count 0" }).click();
  const documentValue = JSON.parse(await page.getByTestId("react-document-json").innerText()) as { title: string; count: number };
  expect(documentValue).toEqual({ title: "Live React document", count: 1 });
  await page.getByRole("region", { name: "JSON Document subscription" })
    .getByRole("button", { name: "Inspect canonical JSON" }).click();
  await expect(page.getByTestId("react-document-json").locator("xpath=ancestor::figure").getByRole("button", { name: "Copy" })).toBeVisible();

  await page.getByRole("textbox", { name: "Connector block 1" }).fill("React snapshot updated.");
  await expect(page.getByText(/revision [1-9][0-9]*/)).toBeVisible();
  const editingValue = JSON.parse(await page.getByTestId("react-editor-json").innerText()) as { blocks: Array<{ text: string }> };
  expect(editingValue.blocks[0]?.text).toBe("React snapshot updated.");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("textbox", { name: "Connector block 1" })).toHaveValue("React renders this editing snapshot.");
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByRole("textbox", { name: "Connector block 1" })).toHaveValue("React snapshot updated.");

  await expect(page.getByRole("heading", { name: "Selection and cursor" })).toBeVisible();
  await page.getByText("react", { exact: true }).click();
  await expect(page.locator("[data-focus=true]")).toHaveCount(1);
  expect(errors).toEqual([]);
});
