import { expect, test } from "@playwright/test";

test("Zod Connector Live Demo rejects invalid changes and preserves canonical JSON", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });

  await page.goto("/connectors/zod");
  await expect(page.getByRole("heading", { level: 1, name: "Zod Connector" })).toBeVisible();

  const title = page.getByRole("textbox", { name: "Profile title draft" });
  await title.fill("x");
  await page.getByRole("button", { name: "Commit draft" }).click();

  expect(JSON.parse(await page.getByTestId("zod-validation-result").innerText())).toEqual({
    ok: false,
    code: "schema_violation",
    reason: "Title must contain at least 3 characters.",
    pointer: "/profile/title",
  });
  expect(JSON.parse(await page.getByTestId("zod-document-json").innerText())).toEqual({
    profile: { title: "Draft" },
  });

  await title.fill("  Ready  ");
  await page.getByRole("button", { name: "Commit draft" }).click();
  expect(JSON.parse(await page.getByTestId("zod-validation-result").innerText())).toMatchObject({ ok: true });
  expect(JSON.parse(await page.getByTestId("zod-document-json").innerText())).toEqual({
    profile: { title: "  Ready  " },
  });
  expect(errors).toEqual([]);
});
