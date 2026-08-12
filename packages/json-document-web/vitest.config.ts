import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@interactive-os/json-document": new URL("../json-document/src/application/document/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document-selection": new URL("../json-document-selection/src/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document-editing": new URL("../json-document-editing/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
