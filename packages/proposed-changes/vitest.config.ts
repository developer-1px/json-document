import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@interactive-os/json-document": new URL("../json-document/src/public/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
