import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@interactive-os/json-document/session": new URL("../../../packages/json-document/src/application/session/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
