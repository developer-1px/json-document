import { expect, test } from "@playwright/test";

test("keeps drafts local, rejects invalid submit, and restores form state with history", async ({ page }) => {
  await page.goto("/connectors/react-hook-form");

  const name = page.getByLabel("Name");
  const role = page.getByLabel("Role");
  await name.fill("x");
  await role.selectOption("Editor");

  await expect(page.getByTestId("rhf-dirty")).toHaveText("dirty");
  await expect(page.getByTestId("rhf-canonical-json")).toContainText("Ada Lovelace");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("alert")).toHaveText("Name must contain at least 3 characters.");
  await expect(page.getByTestId("rhf-revision")).toHaveText("0");

  await name.fill("Grace Hopper");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByTestId("rhf-canonical-json")).toContainText("Grace Hopper");
  await expect(page.getByTestId("rhf-canonical-json")).toContainText("Editor");
  await expect(page.getByTestId("rhf-revision")).toHaveText("1");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(name).toHaveValue("Ada Lovelace");
  await expect(role).toHaveValue("Admin");
  await expect(page.getByTestId("rhf-dirty")).toHaveText("pristine");

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(name).toHaveValue("Grace Hopper");
  await expect(role).toHaveValue("Editor");
});
