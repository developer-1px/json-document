import { expect, test } from "@playwright/test";

test("Zod Connector Live Demo opens a Database workspace from a Zod schema without a form", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });

  await page.goto("/connectors/zod");
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/");
  await expect(breadcrumb.getByRole("link", { name: "Connector" })).toHaveAttribute("href", "/docs/connectors");
  await expect(breadcrumb.getByText("Zod Live Demo", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Zod Connector" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "The table is the workspace" })).toBeVisible();
  await expect(page.getByRole("form")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Profile title draft" })).toHaveCount(0);
  await expect(page.getByRole("grid", { name: "Database records" })).toBeVisible();

  const titleCell = page.locator('td[data-record-id="t1"][data-property-id="title"]');
  await titleCell.click();
  await titleCell.press("Enter");
  const title = page.getByRole("textbox", { name: "Title t1" });
  await title.fill("Ready for review");
  await title.press("Enter");

  const records = JSON.parse(await page.getByTestId("zod-admin-records").innerText()) as ReadonlyArray<{ readonly id: string; readonly title: string }>;
  expect(records.find((record) => record.id === "t1")?.title).toBe("Ready for review");

  await page.getByRole("button", { name: "New record" }).click();
  await expect(page.locator("tr[data-record-id='t4']")).toBeVisible();
  await page.getByRole("button", { name: "Delete selected" }).click();
  await expect(page.locator("tr[data-record-id='t4']")).toHaveCount(0);

  await page.getByRole("combobox", { name: "Filter property" }).selectOption("status");
  await page.getByRole("combobox", { name: "Filter value" }).selectOption("backlog");
  await expect(page.locator("tr[data-record-id]")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("Zod Connector Live Demo rejects invalid changes and preserves canonical JSON", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });

  await page.goto("/connectors/zod/validate");
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/");
  await expect(breadcrumb.getByRole("link", { name: "Zod Live Demo" })).toHaveAttribute("href", "/connectors/zod");
  await expect(breadcrumb.getByText("Validate Live Demo", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Zod Validate" })).toBeVisible();
  await expect(page.getByRole("grid", { name: "Admin records" })).toHaveCount(0);

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
