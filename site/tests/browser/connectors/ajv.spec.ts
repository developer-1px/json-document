import { expect, test } from "@playwright/test";

test("Ajv Connector Live Demo rejects invalid changes without adopting validator mutations", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });

  await page.goto("/connectors/ajv");
  await expect(page.getByRole("heading", { level: 1, name: "Ajv Connector" })).toBeVisible();

  const title = page.getByRole("textbox", { name: "Profile title draft" });
  await title.fill("x");
  await page.getByRole("button", { name: "Commit draft" }).click();

  expect(JSON.parse(await page.getByTestId("ajv-validation-result").innerText())).toEqual({
    ok: false,
    code: "schema_violation",
    reason: "must NOT have fewer than 3 characters",
    pointer: "/profile/title",
  });
  expect(JSON.parse(await page.getByTestId("ajv-document-json").innerText())).toEqual({
    profile: { title: "Draft" },
  });

  await title.fill("Ready");
  await page.getByRole("button", { name: "Commit draft" }).click();
  expect(JSON.parse(await page.getByTestId("ajv-validation-result").innerText())).toMatchObject({ ok: true });
  expect(JSON.parse(await page.getByTestId("ajv-document-json").innerText())).toEqual({
    profile: { title: "Ready" },
  });
  expect(errors).toEqual([]);
});
