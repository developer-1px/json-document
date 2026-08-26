import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 18777);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const browserChannel = process.env.PLAYWRIGHT_CHANNEL === "bundled"
  ? undefined
  : process.env.PLAYWRIGHT_CHANNEL ?? "chrome";
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1";
const richTextBrowserSpecs = /rich-text-(?:corpus|demo)\.spec\.ts/;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run dev -w @interactive-os/json-document-site -- --port ${port} --strictPort`,
        reuseExistingServer,
        timeout: 60_000,
        url: baseURL,
      },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chrome",
      dependencies: ["setup"],
      testIgnore: /.*\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...(browserChannel ? { channel: browserChannel } : {}),
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    {
      name: "firefox",
      dependencies: ["setup"],
      testMatch: richTextBrowserSpecs,
      use: devices["Desktop Firefox"],
    },
    {
      name: "webkit",
      dependencies: ["setup"],
      testMatch: richTextBrowserSpecs,
      use: devices["Desktop Safari"],
    },
  ],
});
