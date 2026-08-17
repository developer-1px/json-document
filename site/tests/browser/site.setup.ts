import { expect, test } from "@playwright/test";

test("browser acceptance server is ready", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
});
