import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@interactive-os/json-document": new URL("../../../packages/json-document/src/application/document/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document-id-resolver": new URL("../../../packages/id-resolver/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
