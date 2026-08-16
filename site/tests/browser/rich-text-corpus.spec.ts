import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const browserCorpus = JSON.parse(readFileSync(new URL("../../../standards/json-document-rich-text-v1/corpora/browser.json", import.meta.url), "utf8")) as {
  readonly suite: string;
  readonly cases: ReadonlyArray<{
    readonly id: string;
    readonly requiresNativeInput?: boolean;
    readonly browsers: ReadonlyArray<string>;
    readonly skip?: Readonly<Record<string, string>>;
  }>;
};

test("browser corpus stays a separate suite and records native IME skip reasons", ({ browserName }) => {
  expect(browserCorpus.suite).toBe("browser");
  const ime = browserCorpus.cases.find((entry) => entry.id === "korean-ime-composition");
  expect(ime?.requiresNativeInput).toBe(true);
  if (browserName !== "chromium") {
    expect(ime?.skip?.[browserName]).toMatch(/imeSetComposition/);
    test.skip(true, ime?.skip?.[browserName] ?? "native IME is unavailable");
  }
});

test("browser corpus keeps the official Rich Text lab on a real contenteditable path", async ({ page }) => {
  await page.goto("/editing/rich-text");
  await expect(page.getByTestId("rich-text-editor")).toHaveAttribute("contenteditable", "true");
});
