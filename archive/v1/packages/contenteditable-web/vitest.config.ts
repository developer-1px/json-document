import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@interactive-os/json-document/session": new URL("../json-document/src/application/session/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
