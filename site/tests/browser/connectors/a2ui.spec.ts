import { expect, test } from "@playwright/test";

test("A2UI Connector buffers incomplete input and exposes canonical source", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/connectors/a2ui");
  await expect(page.getByRole("heading", { level: 1, name: "A2UI Connector" })).toBeVisible();
  const document = page.getByTestId("a2ui-document-json");
  expect(JSON.parse(await document.innerText())).toEqual({ surfaces: {} });
  await page.getByRole("button", { name: "첫 chunk 수신" }).click();
  expect(JSON.parse(await document.innerText())).toEqual({ surfaces: {} });
  await page.getByRole("button", { name: "나머지 수신·완료" }).click();
  await expect(document).toContainText("Stream complete");
  expect(JSON.parse(await document.innerText())).toMatchObject({ surfaces: { demo: { dataModel: { answer: "Stream complete" } } } });
  expect(errors).toEqual([]);
});
