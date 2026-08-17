import { expect, test } from "@playwright/test";
import { legacyPageRedirects } from "../../src/app/legacy-page-redirects";

for (const { from, to } of Object.values(legacyPageRedirects)) {
  test(`${from} redirects to its canonical page`, async ({ page }) => {
    await page.goto(from);

    await expect(page).toHaveURL(to);
  });
}
